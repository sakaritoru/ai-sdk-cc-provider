import { describe, it, expect, beforeEach } from 'bun:test';
import { ClaudeCodeLanguageModel } from '../claude-code-provider';

describe('ClaudeCodeLanguageModel', () => {
  let model: ClaudeCodeLanguageModel;

  beforeEach(() => {
    model = new ClaudeCodeLanguageModel('claude-3-5-sonnet-20241022', {
      options: {
        maxTurns: 5,
        cwd: '/test/path',
      },
    });
  });

  describe('constructor', () => {
    it('should set model properties correctly', () => {
      expect(model.modelId).toBe('claude-3-5-sonnet-20241022');
      expect(model.specificationVersion).toBe('v1');
      expect(model.provider).toBe('claude-code');
      expect(model.defaultObjectGenerationMode).toBe(undefined);
    });
  });

  describe('convertPromptToClaudeCodeFormat', () => {
    it('should convert simple text messages', () => {
      const prompt = [
        {
          role: 'user',
          content: 'Hello',
        },
      ];
      const result = (model as any).convertPromptToClaudeCodeFormat(prompt);
      expect(result).toBe('user: Hello');
    });

    it('should convert multiple messages', () => {
      const prompt = [
        {
          role: 'user',
          content: 'Hello',
        },
        {
          role: 'assistant',
          content: 'Hi there!',
        },
      ];
      const result = (model as any).convertPromptToClaudeCodeFormat(prompt);
      expect(result).toBe('user: Hello\nassistant: Hi there!');
    });

    it('should convert complex content with parts', () => {
      const prompt = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Look at this',
            },
            {
              type: 'text',
              text: 'and this',
            },
            {
              type: 'image',
              image: 'data:image/jpeg;base64,/9j/4AAQ...',
            },
          ],
        },
      ];
      const result = (model as any).convertPromptToClaudeCodeFormat(prompt);
      expect(result).toBe('user: Look at this and this');
    });
  });

  describe('mapFinishReason', () => {
    it('should map finish reasons correctly', () => {
      const successResult = {
        subtype: 'success',
      };
      expect((model as any).mapFinishReason(successResult)).toBe('stop');

      const maxTurnsResult = {
        subtype: 'error_max_turns',
      };
      expect((model as any).mapFinishReason(maxTurnsResult)).toBe('length');

      const errorResult = {
        subtype: 'error_during_execution',
      };
      expect((model as any).mapFinishReason(errorResult)).toBe('error');
    });
  });

  describe('extractWarnings', () => {
    it('should extract warnings for permission denials', () => {
      const resultMessage = {
        permission_denials: [
          {
            tool_name: 'file_write',
            tool_use_id: 'test-id',
            tool_input: {},
          },
          {
            tool_name: 'bash',
            tool_use_id: 'test-id-2',
            tool_input: {},
          },
        ],
      };
      const warnings = (model as any).extractWarnings(resultMessage);
      expect(warnings).toHaveLength(1);
      expect(warnings[0].type).toBe('other');
      expect(warnings[0].message).toContain('Permission denied for tools: file_write, bash');
    });

    it('should return empty array for no permission denials', () => {
      const resultMessage = {
        permission_denials: [],
      };
      const warnings = (model as any).extractWarnings(resultMessage);
      expect(warnings).toHaveLength(0);
    });
  });
});