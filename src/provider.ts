import type { LanguageModelV1 } from '@ai-sdk/provider';
import type { FetchFunction } from '@ai-sdk/provider-utils';
import { ClaudeCodeLanguageModel } from './claude-code-provider';
import type { ClaudeCodeProviderSettings } from './types';

export interface ClaudeCodeProvider {
  (
    modelId: string,
    settings?: ClaudeCodeProviderSettings
  ): LanguageModelV1;

  languageModel: (
    modelId: string,
    settings?: ClaudeCodeProviderSettings
  ) => LanguageModelV1;
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
  ): LanguageModelV1 => {
    return new ClaudeCodeLanguageModel(modelId, settings, config);
  };

  provider.languageModel = provider;

  return provider;
}

export const claudeCode = createClaudeCode();