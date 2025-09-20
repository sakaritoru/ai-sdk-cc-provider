import { describe, it, expect } from 'bun:test';
import { claudeCode, createClaudeCode } from '../provider';
import { ClaudeCodeLanguageModel } from '../claude-code-provider';

describe('Provider', () => {
  describe('claudeCode', () => {
    it('should create a language model instance', () => {
      const model = claudeCode('claude-3-5-sonnet-20241022');
      expect(model).toBeInstanceOf(ClaudeCodeLanguageModel);
      expect(model.modelId).toBe('claude-3-5-sonnet-20241022');
    });

    it('should pass settings to the model', () => {
      const settings = {
        options: {
          maxTurns: 5,
          cwd: '/test/path',
        },
      };
      const model = claudeCode(
        'claude-3-5-sonnet-20241022',
        settings
      ) as ClaudeCodeLanguageModel;
      expect(model.settings).toEqual(settings);
    });
  });

  describe('createClaudeCode', () => {
    it('should create a provider function', () => {
      const provider = createClaudeCode();
      expect(typeof provider).toBe('function');
      expect(typeof provider.languageModel).toBe('function');
    });

    it('should create models with config', () => {
      const config = {
        fetch: globalThis.fetch,
      };
      const provider = createClaudeCode(config);
      const model = provider('claude-3-5-sonnet-20241022');
      expect(model).toBeInstanceOf(ClaudeCodeLanguageModel);
    });
  });
});
