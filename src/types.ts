import type { Options as ClaudeCodeOptions } from '@anthropic-ai/claude-code';

export interface ClaudeCodeProviderSettings {
  options?: ClaudeCodeOptions;
}

export interface ClaudeCodeToolConfig {
  enabledTools?: string[];
  disabledTools?: string[];
  mcpServers?: Record<string, any>;
  additionalDirectories?: string[];
}
