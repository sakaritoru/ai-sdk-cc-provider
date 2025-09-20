import { query } from '@anthropic-ai/claude-code';
import type {
  SDKMessage,
  SDKAssistantMessage,
  SDKResultMessage,
  SDKPartialAssistantMessage,
  Options as ClaudeCodeOptions,
} from '@anthropic-ai/claude-code';
import {
  LanguageModelV1,
  LanguageModelV1CallWarning,
  LanguageModelV1FinishReason,
  LanguageModelV1StreamPart,
  LanguageModelV1Prompt,
} from '@ai-sdk/provider';
import { FetchFunction } from '@ai-sdk/provider-utils';
import { ClaudeCodeProviderSettings } from './types';

export class ClaudeCodeLanguageModel implements LanguageModelV1 {
  readonly specificationVersion = 'v1';
  readonly defaultObjectGenerationMode = undefined;
  readonly provider = 'claude-code';

  readonly modelId: string;
  readonly settings: ClaudeCodeProviderSettings;

  constructor(
    modelId: string,
    settings: ClaudeCodeProviderSettings = {},
    config?: {
      fetch?: FetchFunction;
    }
  ) {
    this.modelId = modelId;
    this.settings = settings;
  }

  private convertPromptToClaudeCodeFormat(prompt: LanguageModelV1Prompt): string {
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
  ): LanguageModelV1FinishReason {
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
  ): LanguageModelV1CallWarning[] {
    const warnings: LanguageModelV1CallWarning[] = [];

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

  async doGenerate(options: Parameters<LanguageModelV1['doGenerate']>[0]) {
    const { prompt, ...restOptions } = options;

    const claudeCodePrompt = this.convertPromptToClaudeCodeFormat(prompt);

    const claudeCodeOptions: ClaudeCodeOptions = {
      ...this.settings.options,
      model: this.modelId,
      maxTurns: restOptions.maxTokens ? Math.ceil(restOptions.maxTokens / 100) : undefined,
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

      return {
        text: resultMessage.subtype === 'success' ? resultMessage.result : '',
        // Don't return toolCalls to avoid AI SDK tool registration issues
        finishReason: this.mapFinishReason(resultMessage),
        usage: {
          promptTokens: resultMessage.usage.input_tokens,
          completionTokens: resultMessage.usage.output_tokens,
        },
        rawCall: {
          rawPrompt: claudeCodePrompt,
          rawSettings: claudeCodeOptions,
        },
        rawResponse: {
          headers: {},
        },
        warnings: this.extractWarnings(resultMessage),
      };
    } catch (error) {
      throw new Error(`Claude Code API error: ${error}`);
    }
  }

  async doStream(options: Parameters<LanguageModelV1['doStream']>[0]) {
    const { prompt, ...restOptions } = options;

    const claudeCodePrompt = this.convertPromptToClaudeCodeFormat(prompt);

    const claudeCodeOptions: ClaudeCodeOptions = {
      ...this.settings.options,
      model: this.modelId,
      maxTurns: restOptions.maxTokens ? Math.ceil(restOptions.maxTokens / 100) : undefined,
      includePartialMessages: true,
      abortController: new AbortController(),
    };

    let finishReason: LanguageModelV1FinishReason = 'unknown';
    let usage = { promptTokens: 0, completionTokens: 0 };
    const warnings: LanguageModelV1CallWarning[] = [];

    const self = this;
    const stream = new ReadableStream<LanguageModelV1StreamPart>({
      async start(controller) {
        try {
          for await (const message of query({
            prompt: claudeCodePrompt,
            options: claudeCodeOptions,
          })) {
            if (message.type === 'stream_event') {
              const partialMessage = message as SDKPartialAssistantMessage;
              const event = partialMessage.event;

              if (event.type === 'content_block_delta') {
                if (event.delta?.type === 'text_delta') {
                  controller.enqueue({
                    type: 'text-delta',
                    textDelta: event.delta.text,
                  });
                }
              }
              // Don't emit tool-call-delta events to avoid AI SDK tool registration issues
              // Claude Code handles tools internally
            } else if (message.type === 'result') {
              const resultMessage = message as SDKResultMessage;
              finishReason = self.mapFinishReason(resultMessage);
              usage = {
                promptTokens: resultMessage.usage.input_tokens,
                completionTokens: resultMessage.usage.output_tokens,
              };
              warnings.push(...self.extractWarnings(resultMessage));

              controller.enqueue({
                type: 'finish',
                finishReason,
                usage,
                logprobs: undefined,
              });
              break;
            }
          }
        } catch (error) {
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
      rawCall: {
        rawPrompt: claudeCodePrompt,
        rawSettings: claudeCodeOptions,
      },
      rawResponse: {
        headers: {},
      },
      warnings,
    };
  }
}