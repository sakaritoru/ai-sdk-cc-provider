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

// Tool tracking for streaming
interface OngoingToolCall {
  id: string;
  name: string;
  arguments: string;
  hasFinished: boolean;
}

// Helper function to check if string is parsable JSON
function isParsableJson(str: string): boolean {
  if (!str || str.trim() === '') return false;
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
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

      const toolCalls = messages
        .filter(msg => msg.type === 'assistant')
        .flatMap((msg) => {
          const assistantMsg = msg as SDKAssistantMessage;
          const toolUseBlocks = assistantMsg.message.content?.filter(block => block.type === 'tool_use') || [];


          return toolUseBlocks.map((block) => {
              const toolUse = block as BetaToolUseBlock;

              return {
                type: 'tool-call' as const,
                toolCallId: toolUse.id,
                toolName: toolUse.name,
                input: JSON.stringify(toolUse.input || {}),
              };
            });
        });

      // Extract tool results for non-streaming mode (from user messages)

      const toolResults = messages
        .filter(msg => msg.type === 'user')
        .flatMap((msg) => {
          const userMsg = msg as SDKUserMessage;
          const messageContent = userMsg.message.content;
          const toolResultBlocks = Array.isArray(messageContent) ?
            messageContent.filter((block) => typeof block === 'object' && 'type' in block && block.type === 'tool_result') : [];


          return toolResultBlocks.map((block) => {
              const toolResult = block;

              return {
                type: 'tool-result' as const,
                toolCallId: toolResult.tool_use_id || 'unknown',
                toolName: 'unknown', // We'll need to track tool names
                isError: toolResult.is_error || false,
                result: typeof toolResult.content === 'string' ?
                  toolResult.content :
                  JSON.stringify(toolResult.content || toolResult),
              };
            });
        });


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

    // Track ongoing tool calls by index (following OpenAI pattern)
    const toolCalls = new Map<number, OngoingToolCall>();

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

              try {
              if (event.type === 'content_block_start') {
                if (event.content_block?.type === 'text') {
                  controller.enqueue({
                    type: 'text-start',
                    id: textBlockId,
                  });
                  hasStartedTextBlock = true;
                } else if (event.content_block?.type === 'tool_use') {
                  // STREAM: Start tool input following OpenAI pattern

                  const toolUseBlock = event.content_block as BetaToolUseBlock;

                  // Store the mapping between index and tool block ID
                  if (event.index !== undefined) {
                    toolBlockIds.set(event.index, toolUseBlock.id);

                    // Initialize tool call tracking
                    toolCalls.set(event.index, {
                      id: toolUseBlock.id,
                      name: toolUseBlock.name,
                      arguments: '',
                      hasFinished: false,
                    });

                    // Emit tool-input-start event
                    controller.enqueue({
                      type: 'tool-input-start',
                      id: toolUseBlock.id,
                      toolName: toolUseBlock.name,
                    });
                  }
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
                      providerMetadata: {
                        'claude-code': {
                          itemId: textBlockId,
                          reasoningEncryptedContent: null,
                          eventType: 'thinking_start'
                        }
                      }
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
                        itemId: textBlockId,
                        eventType: 'thinking_delta'
                      }
                    }
                  });
                } else if (event.delta?.type === 'input_json_delta') {
                  // Handle tool input delta following OpenAI pattern
                  if (event.index !== undefined && event.delta.partial_json) {
                    const toolCall = toolCalls.get(event.index);
                    if (toolCall && !toolCall.hasFinished) {
                      const delta = event.delta.partial_json;

                      // Accumulate arguments
                      toolCall.arguments += delta;

                      // Emit tool-input-delta
                      controller.enqueue({
                        type: 'tool-input-delta',
                        id: toolCall.id,
                        delta,
                      });

                      // Check if we have complete, parsable JSON
                      if (isParsableJson(toolCall.arguments)) {
                        // Mark as finished
                        toolCall.hasFinished = true;

                        // Emit tool-input-end
                        controller.enqueue({
                          type: 'tool-input-end',
                          id: toolCall.id,
                        });

                        // Emit tool-call with complete input
                        controller.enqueue({
                          type: 'tool-call',
                          toolCallId: toolCall.id,
                          toolName: toolCall.name,
                          input: toolCall.arguments,
                        });
                      }
                    }
                  }
                }
              } else if (event.type === 'content_block_stop') {
                if (hasStartedTextBlock) {
                  controller.enqueue({
                    type: 'text-end',
                    id: textBlockId,
                  });
                  hasStartedTextBlock = false;
                }

                // Handle incomplete tool calls (fallback for edge cases)
                if (event.index !== undefined) {
                  const toolCall = toolCalls.get(event.index);
                  if (toolCall && !toolCall.hasFinished) {
                    // Try to complete with current arguments if they're valid JSON
                    if (isParsableJson(toolCall.arguments)) {
                      toolCall.hasFinished = true;

                      controller.enqueue({
                        type: 'tool-input-end',
                        id: toolCall.id,
                      });

                      controller.enqueue({
                        type: 'tool-call',
                        toolCallId: toolCall.id,
                        toolName: toolCall.name,
                        input: toolCall.arguments,
                      });
                    } else {
                      // If arguments are not valid JSON, still emit tool-input-end
                      // The tool will be handled via assistant message as fallback
                      controller.enqueue({
                        type: 'tool-input-end',
                        id: toolCall.id,
                      });
                    }
                  }
                }
              }
            } catch (streamEventError) {
              // Error processing stream event
            }
            } else if (message.type === 'assistant') {
              // Handle assistant messages as fallback for incomplete tool calls
              const assistantMsg = message as SDKAssistantMessage;

              if (assistantMsg.message.content) {
                for (const block of assistantMsg.message.content) {
                  // Handle tool use blocks (tool calls) with complete input
                  if (block.type === 'tool_use') {
                    const toolUse = block as BetaToolUseBlock;

                    // Check if this tool was already handled during streaming
                    let alreadyHandled = false;
                    for (const [, toolCall] of toolCalls.entries()) {
                      if (toolCall.id === toolUse.id && toolCall.hasFinished) {
                        alreadyHandled = true;
                        break;
                      }
                    }

                    // Only emit tool-call if it wasn't already handled during streaming
                    if (!alreadyHandled) {
                      try {
                        // Follow OpenAI sample pattern: use 'input' as JSON string
                        const toolArgs = toolUse.input || {};
                        const inputString = JSON.stringify(toolArgs);

                        controller.enqueue({
                          type: 'tool-call',
                          toolCallId: toolUse.id,
                          toolName: toolUse.name,
                          input: inputString,
                        });

                      } catch (error) {
                        // Ignore errors in fallback processing
                      }
                    }
                  }
                }
              }
            } else if (message.type === 'user') {
              // Handle user messages that contain tool results
              const userMsg = message as SDKUserMessage;

              const messageContent = userMsg.message.content;
              if (Array.isArray(messageContent)) {
                for (const block of messageContent) {
                  if (typeof block === 'object' && 'type' in block) {

                    // Handle tool result blocks
                    if (block.type === 'tool_result') {
                      const toolResult = block;

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
                          isError: toolResult.is_error || false,
                          toolName: 'unknown', // We'll need to track tool names separately
                          result: resultContent,
                        });

                      } catch (error) {
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
                  providerMetadata: {
                    'claude-code': {
                      itemId: textBlockId,
                      reasoningEncryptedContent: null,
                      eventType: 'thinking_end'
                    }
                  }
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
              providerMetadata: {
                'claude-code': {
                  itemId: textBlockId,
                  reasoningEncryptedContent: null,
                  eventType: 'thinking_end_error'
                }
              }
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