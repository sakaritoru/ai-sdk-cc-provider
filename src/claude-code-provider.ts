import { query } from '@anthropic-ai/claude-code';
import type {
  SDKMessage,
  SDKAssistantMessage,
  SDKResultMessage,
  SDKPartialAssistantMessage,
  Options as ClaudeCodeOptions,
} from '@anthropic-ai/claude-code';
import {
  LanguageModelV2,
  LanguageModelV2CallWarning,
  LanguageModelV2FinishReason,
  LanguageModelV2StreamPart,
  LanguageModelV2Prompt,
} from '@ai-sdk/provider';
import { FetchFunction } from '@ai-sdk/provider-utils';
import { ClaudeCodeProviderSettings } from './types';

export class ClaudeCodeLanguageModel implements LanguageModelV2 {
  readonly specificationVersion = 'v2';
  readonly defaultObjectGenerationMode = undefined;
  readonly provider = 'claude-code';
  readonly supportedUrls = {};

  readonly modelId: string;
  readonly settings: ClaudeCodeProviderSettings;

  constructor(
    modelId: string,
    settings: ClaudeCodeProviderSettings = {}
  ) {
    this.modelId = modelId;
    this.settings = settings;
  }

  private convertPromptToClaudeCodeFormat(prompt: LanguageModelV2Prompt): string {
    // Convert AI SDK prompt to simple string for Claude Code
    return prompt
      .map((message) => {
        if (typeof message.content === 'string') {
          return `${message.role}: ${message.content}`;
        }

        // Handle complex content with parts
        const textParts = message.content
          .filter((part: any) => part.type === 'text')
          .map((part: any) => part.text)
          .join(' ');

        return `${message.role}: ${textParts}`;
      })
      .join('\n');
  }

  private mapFinishReason(
    resultMessage: SDKResultMessage
  ): LanguageModelV2FinishReason {
    if (resultMessage.subtype === 'error_max_turns') {
      return 'length';
    }
    if (resultMessage.subtype === 'error_during_execution') {
      return 'error';
    }
    return 'stop';
  }

  private extractWarnings(
    resultMessage: SDKResultMessage
  ): LanguageModelV2CallWarning[] {
    const warnings: LanguageModelV2CallWarning[] = [];

    if (resultMessage.permission_denials.length > 0) {
      warnings.push({
        type: 'other',
        message: `Permission denied for tools: ${resultMessage.permission_denials
          .map((d) => d.tool_name)
          .join(', ')}`,
      });
    }

    return warnings;
  }

  async doGenerate(options: Parameters<LanguageModelV2['doGenerate']>[0]) {
    const { prompt, ...restOptions } = options;

    const claudeCodePrompt = this.convertPromptToClaudeCodeFormat(prompt);

    const claudeCodeOptions: ClaudeCodeOptions = {
      ...this.settings.options,
      model: this.modelId,
      maxTurns: restOptions.maxOutputTokens ? Math.ceil(restOptions.maxOutputTokens / 100) : undefined,
      abortController: new AbortController(),
    };

    const messages: SDKMessage[] = [];
    let resultMessage: SDKResultMessage | null = null;

    try {
      for await (const message of query({
        prompt: claudeCodePrompt,
        options: claudeCodeOptions,
      })) {
        messages.push(message);

        if (message.type === 'result') {
          resultMessage = message;
          break;
        }
      }

      if (!resultMessage) {
        throw new Error('No result received from Claude Code');
      }

      // Claude Code handles tools internally, so we don't return toolCalls to AI SDK
      // This prevents the "Model tried to call unavailable tool" error

      // V2 requires content array instead of text string
      const content = resultMessage.subtype === 'success' && resultMessage.result ? [{
        type: 'text' as const,
        text: resultMessage.result,
      }] : [];

      return {
        content,
        finishReason: this.mapFinishReason(resultMessage),
        usage: {
          inputTokens: resultMessage.usage.input_tokens,
          outputTokens: resultMessage.usage.output_tokens,
          totalTokens: resultMessage.usage.input_tokens + resultMessage.usage.output_tokens,
        },
        request: {
          body: claudeCodeOptions,
        },
        response: {
          headers: {},
        },
        warnings: this.extractWarnings(resultMessage),
      };
    } catch (error) {
      throw new Error(`Claude Code API error: ${error}`);
    }
  }

  async doStream(options: Parameters<LanguageModelV2['doStream']>[0]) {
    const { prompt, ...restOptions } = options;

    const claudeCodePrompt = this.convertPromptToClaudeCodeFormat(prompt);

    const claudeCodeOptions: ClaudeCodeOptions = {
      ...this.settings.options,
      model: this.modelId,
      maxTurns: restOptions.maxOutputTokens ? Math.ceil(restOptions.maxOutputTokens / 100) : undefined,
      maxThinkingTokens: this.settings.options?.maxThinkingTokens,
      includePartialMessages: true,
      abortController: new AbortController(),
    };

    let finishReason: LanguageModelV2FinishReason = 'unknown';
    let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    const warnings: LanguageModelV2CallWarning[] = [];

    const self = this;
    let hasStartedTextBlock = false;
    let hasStartedThinkingBlock = false;
    const textBlockId = '0';
    const thinkingBlockId = `thinking-${textBlockId}`;

    const stream = new ReadableStream<LanguageModelV2StreamPart>({
      async start(controller) {
        // Start with stream-start event like OpenAI
        controller.enqueue({
          type: 'stream-start',
          warnings,
        });

        try {
          for await (const message of query({
            prompt: claudeCodePrompt,
            options: claudeCodeOptions,
          })) {
            if (message.type === 'stream_event') {
              const partialMessage = message as SDKPartialAssistantMessage;
              const event = partialMessage.event;

              if (event.type === 'content_block_start') {
                if (event.content_block?.type === 'text') {
                  controller.enqueue({
                    type: 'text-start',
                    id: textBlockId,
                  });
                  hasStartedTextBlock = true;
                }
              } else if (event.type === 'content_block_delta') {
                if (event.delta?.type === 'text_delta') {
                  // Ensure text block is started
                  if (!hasStartedTextBlock) {
                    controller.enqueue({
                      type: 'text-start',
                      id: textBlockId,
                    });
                    hasStartedTextBlock = true;
                  }

                  controller.enqueue({
                    type: 'text-delta',
                    id: textBlockId,
                    delta: event.delta.text,
                  });
                } else if (event.delta?.type === 'thinking_delta') {
                  // Start thinking block if not already started
                  if (!hasStartedThinkingBlock) {
                    controller.enqueue({
                      type: 'reasoning-start',
                      id: thinkingBlockId,
                    });
                    hasStartedThinkingBlock = true;
                  }

                  // Handle thinking deltas for reasoning stream
                  controller.enqueue({
                    type: 'reasoning-delta',
                    id: thinkingBlockId,
                    delta: event.delta.thinking,
                    providerMetadata: {
                      'claude-code': {
                        eventType: 'thinking_delta'
                      }
                    }
                  });
                }
              } else if (event.type === 'content_block_stop') {
                if (hasStartedTextBlock) {
                  controller.enqueue({
                    type: 'text-end',
                    id: textBlockId,
                  });
                  hasStartedTextBlock = false;
                }
              }
              // Don't emit tool-call-delta events to avoid AI SDK tool registration issues
              // Claude Code handles tools internally
            } else if (message.type === 'result') {
              const resultMessage = message as SDKResultMessage;
              finishReason = self.mapFinishReason(resultMessage);
              usage = {
                inputTokens: resultMessage.usage.input_tokens,
                outputTokens: resultMessage.usage.output_tokens,
                totalTokens: resultMessage.usage.input_tokens + resultMessage.usage.output_tokens,
              };
              warnings.push(...self.extractWarnings(resultMessage));

              // Ensure text block is properly closed
              if (hasStartedTextBlock) {
                controller.enqueue({
                  type: 'text-end',
                  id: textBlockId,
                });
                hasStartedTextBlock = false;
              }

              // Ensure thinking block is properly closed
              if (hasStartedThinkingBlock) {
                controller.enqueue({
                  type: 'reasoning-end',
                  id: thinkingBlockId,
                });
                hasStartedThinkingBlock = false;
              }

              controller.enqueue({
                type: 'finish',
                finishReason,
                usage,
              });
              break;
            }
          }
        } catch (error) {
          // Ensure text block is properly closed on error
          if (hasStartedTextBlock) {
            controller.enqueue({
              type: 'text-end',
              id: textBlockId,
            });
          }

          // Ensure thinking block is properly closed on error
          if (hasStartedThinkingBlock) {
            controller.enqueue({
              type: 'reasoning-end',
              id: thinkingBlockId,
            });
          }

          controller.enqueue({
            type: 'error',
            error,
          });
        } finally {
          controller.close();
        }
      },
    });

    return {
      stream,
      request: {
        body: claudeCodeOptions,
      },
      response: {
        headers: {},
      },
      warnings,
    };
  }
}