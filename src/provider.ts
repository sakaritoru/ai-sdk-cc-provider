import type { LanguageModelV2 } from '@ai-sdk/provider';
import type { FetchFunction } from '@ai-sdk/provider-utils';
import { ClaudeCodeLanguageModel } from './claude-code-provider.js';
import type { ClaudeCodeProviderSettings } from './types.js';
import { claudeCodeTools } from './tools.js';

export interface ClaudeCodeProvider {
  (
    modelId: string,
    settings?: ClaudeCodeProviderSettings
  ): LanguageModelV2;

  languageModel: (
    modelId: string,
    settings?: ClaudeCodeProviderSettings
  ) => LanguageModelV2;

  tools: typeof claudeCodeTools;
}

export interface ClaudeCodeProviderConfig {
  fetch?: FetchFunction;
}

export function createClaudeCode(
  config: ClaudeCodeProviderConfig = {}
): ClaudeCodeProvider {
  const provider = (
    modelId: string,
    settings: ClaudeCodeProviderSettings = {}
  ): LanguageModelV2 => {
    return new ClaudeCodeLanguageModel(modelId, settings);
  };

  provider.languageModel = provider;
  provider.tools = claudeCodeTools;

  return provider;
}

export const claudeCode = createClaudeCode();