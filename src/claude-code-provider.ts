import { query } from '@anthropic-ai/claude-code';
import type {
  SDKMessage,
  SDKAssistantMessage,
  SDKResultMessage,
  SDKPartialAssistantMessage,
  SDKUserMessage,
  Options as ClaudeCodeOptions,
} from '@anthropic-ai/claude-code';
import {
  LanguageModelV2,
  LanguageModelV2CallWarning,
  LanguageModelV2FinishReason,
  LanguageModelV2StreamPart,
  LanguageModelV2Prompt,
} from '@ai-sdk/provider';
import { ClaudeCodeProviderSettings } from './types.js';

// Type definitions for Claude Code API structures
interface BetaToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

interface BetaToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string | unknown;
}

interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export class ClaudeCodeLanguageModel implements LanguageModelV2 {
  readonly specificationVersion = 'v2';
  readonly defaultObjectGenerationMode = undefined;
  readonly provider = 'claude-code';
  readonly supportedUrls = {};
  readonly supportsInternalToolHandling = true;

  readonly modelId: string;
  readonly settings: ClaudeCodeProviderSettings;

  constructor(
    modelId: string,
    settings: ClaudeCodeProviderSettings = {}
  ) {
    this.modelId = modelId;
    this.settings = settings;
  }

  private convertPromptToClaudeCodeFormat(prompt: LanguageModelV2Prompt, tools?: unknown[]): string {
    // Convert AI SDK prompt to simple string for Claude Code
    let promptText = prompt
      .map((message) => {
        if (typeof message.content === 'string') {
          return `${message.role}: ${message.content}`;
        }

        // Handle complex content with parts
        const textParts = message.content
          .filter((part) => part.type === 'text')
          .map((part) => 'text' in part ? part.text : '')
          .join(' ');

        return `${message.role}: ${textParts}`;
      })
      .join('\n');

    // Add tool descriptions if provided
    if (tools && tools.length > 0) {
      const toolDescriptions = tools.map(tool => {
        const t = tool as ToolDefinition;
        return `Tool: ${t.name}\nDescription: ${t.description}\nParameters: ${JSON.stringify(t.parameters, null, 2)}`;
      }).join('\n\n');

      promptText += `\n\nAvailable tools:\n${toolDescriptions}\n\nUse these tools when appropriate by calling them in your response.`;
    }

    return promptText;
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
    const { prompt, tools, ...restOptions } = options;

    const claudeCodePrompt = this.convertPromptToClaudeCodeFormat(prompt, tools);

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
        // console.log('DEBUG: Non-streaming message from Claude Code:', message.type, JSON.stringify(message, null, 2));
        messages.push(message);

        if (message.type === 'result') {
          resultMessage = message;
          break;
        }
      }

      if (!resultMessage) {
        throw new Error('No result received from Claude Code');
      }

      // Claude Code handles tools internally, but we can extract tool calls from the result
      // for compatibility with AI SDK expectations

      // V2 requires content array instead of text string
      const content = resultMessage.subtype === 'success' && resultMessage.result ? [{
        type: 'text' as const,
        text: resultMessage.result,
      }] : [];

      // Extract any tool calls from the messages for toolCalls array
      console.log('NON-STREAM: Extracting tool calls from', messages.filter(msg => msg.type === 'assistant').length, 'assistant messages');

      const toolCalls = messages
        .filter(msg => msg.type === 'assistant')
        .flatMap((msg, msgIndex) => {
          const assistantMsg = msg as SDKAssistantMessage;
          const toolUseBlocks = assistantMsg.message.content?.filter(block => block.type === 'tool_use') || [];

          console.log(`NON-STREAM: Assistant message ${msgIndex} has ${toolUseBlocks.length} tool_use blocks`);

          return toolUseBlocks.map((block, blockIndex) => {
              const toolUse = block as BetaToolUseBlock;
              console.log(`NON-STREAM: Tool use ${msgIndex}-${blockIndex}:`, toolUse.name, toolUse.id, 'input keys:', Object.keys(toolUse.input || {}));

              return {
                type: 'tool-call' as const,
                toolCallId: toolUse.id,
                toolName: toolUse.name,
                input: JSON.stringify(toolUse.input || {}),
              };
            });
        });

      // Extract tool results for non-streaming mode (from user messages)
      console.log('NON-STREAM: Extracting tool results from', messages.filter(msg => msg.type === 'user').length, 'user messages');

      const toolResults = messages
        .filter(msg => msg.type === 'user')
        .flatMap((msg, msgIndex) => {
          const userMsg = msg as SDKUserMessage;
          const messageContent = userMsg.message.content;
          const toolResultBlocks = Array.isArray(messageContent) ?
            messageContent.filter((block) => typeof block === 'object' && 'type' in block && block.type === 'tool_result') : [];

          console.log(`NON-STREAM: User message ${msgIndex} has ${toolResultBlocks.length} tool_result blocks`);

          return toolResultBlocks.map((block, blockIndex: number) => {
              const toolResult = block as BetaToolResultBlock;
              console.log(`NON-STREAM: Tool result ${msgIndex}-${blockIndex}:`, toolResult.tool_use_id, 'content type:', typeof toolResult.content);

              return {
                type: 'tool-result' as const,
                toolCallId: toolResult.tool_use_id || 'unknown',
                toolName: 'unknown', // We'll need to track tool names
                result: typeof toolResult.content === 'string' ?
                  toolResult.content :
                  JSON.stringify(toolResult.content || toolResult),
              };
            });
        });

      console.log('DEBUG: Non-streaming mode - toolCalls:', toolCalls.length, 'toolResults:', toolResults.length);

      // Log the full return object for debugging
      const returnObject = {
        content,
        finishReason: this.mapFinishReason(resultMessage),
        usage: {
          inputTokens: resultMessage.usage.input_tokens,
          outputTokens: resultMessage.usage.output_tokens,
          totalTokens: resultMessage.usage.input_tokens + resultMessage.usage.output_tokens,
        },
        toolCalls,
        toolResults,
        request: {
          body: claudeCodeOptions,
        },
        response: {
          headers: {},
        },
        warnings: this.extractWarnings(resultMessage),
      };

      // console.log('DEBUG: Provider returning:', JSON.stringify(returnObject, null, 2));
      return returnObject;
    } catch (error) {
      throw new Error(`Claude Code API error: ${error}`);
    }
  }

  async doStream(options: Parameters<LanguageModelV2['doStream']>[0]) {
    const { prompt, tools, ...restOptions } = options;

    const claudeCodePrompt = this.convertPromptToClaudeCodeFormat(prompt, tools);

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

    // Track tool blocks by index for proper ID mapping
    const toolBlockIds = new Map<number, string>();

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
            // console.log('DEBUG: Raw message from Claude Code:', message.type, JSON.stringify(message, null, 2));

            if (message.type === 'stream_event') {
              const partialMessage = message as SDKPartialAssistantMessage;
              const event = partialMessage.event;

              try {
              if (event.type === 'content_block_start') {
                if (event.content_block?.type === 'text') {
                  controller.enqueue({
                    type: 'text-start',
                    id: textBlockId,
                  });
                  hasStartedTextBlock = true;
                } else if (event.content_block?.type === 'tool_use') {
                  // STREAM: Store tool mapping but skip tool-input events to avoid parsing issues
                  console.log('STREAM: Tool use start detected:', event.content_block.name, event.content_block.id, 'at index:', event.index);

                  // Store the mapping between index and tool block ID
                  if (event.index !== undefined) {
                    toolBlockIds.set(event.index, event.content_block.id);
                  }

                  // Skip tool-input-start to avoid parsing issues
                  // Tool call will be emitted via assistant message with complete input
                  console.log('STREAM: Skipping tool-input-start, deferring everything to assistant message');
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
                } else if (event.delta?.type === 'input_json_delta') {
                  // Temporarily disable tool-input-delta to avoid parsing issues
                  // The complete tool input will be sent via tool-call event
                  console.log('STREAM: input_json_delta received but skipping to avoid parsing issues. Partial:', JSON.stringify(event.delta.partial_json));
                }
              } else if (event.type === 'content_block_stop') {
                if (hasStartedTextBlock) {
                  controller.enqueue({
                    type: 'text-end',
                    id: textBlockId,
                  });
                  hasStartedTextBlock = false;
                }
                // Note: Tool completion will be handled via the assistant message content
              }
            } catch (streamEventError) {
              console.error('STREAM: Error processing stream event:', streamEventError, 'Event type:', event?.type);
            }
            } else if (message.type === 'assistant') {
              // Handle assistant messages that may contain tool calls
              const assistantMsg = message as SDKAssistantMessage;

              console.log('STREAM: Assistant message received, content blocks:', assistantMsg.message.content?.length || 0);

              if (assistantMsg.message.content) {
                for (const block of assistantMsg.message.content) {
                  console.log('STREAM: Processing assistant content block:', block.type);

                  // Handle tool use blocks (tool calls) with complete input
                  if (block.type === 'tool_use') {
                    const toolUse = block as BetaToolUseBlock;
                    console.log('STREAM: Assistant tool use detected:', toolUse.name, toolUse.id, 'input keys:', Object.keys(toolUse.input || {}));

                    try {
                      // Follow OpenAI sample pattern: use 'input' as JSON string, not 'args'
                      const toolArgs = toolUse.input || {};
                      console.log('STREAM: Raw tool args from Claude Code:', JSON.stringify(toolArgs, null, 2));

                      // Convert to JSON string like OpenAI does
                      const inputString = JSON.stringify(toolArgs);
                      console.log('STREAM: Tool input as JSON string:', inputString);

                      controller.enqueue({
                        type: 'tool-call',
                        toolCallId: toolUse.id,
                        toolName: toolUse.name,
                        input: inputString,
                      });

                      console.log('STREAM: Tool-call emitted (OpenAI format) for:', toolUse.name);
                    } catch (error) {
                      console.error('STREAM: Error processing tool-call:', error, 'Tool:', toolUse.name, 'Raw input:', toolUse.input);
                    }
                  }
                }
              }
            } else if (message.type === 'user') {
              // Handle user messages that contain tool results
              const userMsg = message as SDKUserMessage;
              console.log('STREAM: User message received, content blocks:', userMsg.message.content?.length || 0);

              const messageContent = userMsg.message.content;
              if (Array.isArray(messageContent)) {
                for (const block of messageContent) {
                  if (typeof block === 'object' && 'type' in block) {
                    console.log('STREAM: Processing user content block:', block.type);

                    // Handle tool result blocks
                    if (block.type === 'tool_result') {
                      const toolResult = block as BetaToolResultBlock;
                      console.log('STREAM: Tool result detected:', toolResult.tool_use_id, 'content length:', typeof toolResult.content === 'string' ? toolResult.content.length : 'object');

                      try {
                        // Ensure result is properly formatted
                        let resultContent: string;
                        if (typeof toolResult.content === 'string') {
                          resultContent = toolResult.content;
                        } else if (toolResult.content != null) {
                          resultContent = JSON.stringify(toolResult.content);
                        } else {
                          resultContent = '';
                        }

                        controller.enqueue({
                          type: 'tool-result',
                          toolCallId: toolResult.tool_use_id,
                          toolName: 'unknown', // We'll need to track tool names separately
                          result: resultContent,
                        });

                        console.log('STREAM: Tool-result emitted successfully for:', toolResult.tool_use_id);
                      } catch (error) {
                        console.error('STREAM: Error processing tool-result:', error, 'for tool:', toolResult.tool_use_id);
                      }
                    }
                  }
                }
              }
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