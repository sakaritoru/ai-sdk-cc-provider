import { generateObject, generateText, streamObject, streamText } from 'ai';
import { claudeCode } from '../src';
import { z } from 'zod';

async function basicExample() {
  console.log('Basic Claude Code example...');

  const result = await generateText({
    model: claudeCode('claude-3-5-sonnet-20241022', {
      options: {
        cwd: process.cwd(),
        maxTurns: 3,
        // Claude Code の内部ツールを使用
        allowedTools: ['file_read', 'bash', 'glob', 'grep'],
        // 現在のディレクトリを許可
        additionalDirectories: [process.cwd()],
        // bypassPermissions でツール使用を許可
        permissionMode: 'bypassPermissions',
      },
    }),
    prompt: 'このTypeScriptプロジェクトについて教えてください。どのようなファイルがありますか？',
  });

  console.log('Response:', result.text);
  console.log('Tool calls:', result.toolCalls?.length || 0);
}

async function basicObjectExample() {
  console.log('Basic Claude Code example...');

  try {
    const result = await generateObject({
      model: claudeCode('claude-3-5-sonnet-20241022', {
        options: {
          cwd: process.cwd(),
          maxTurns: 3,
          // Claude Code の内部ツールを使用
          allowedTools: ['file_read', 'bash', 'glob', 'grep'],
          // 現在のディレクトリを許可
          additionalDirectories: [process.cwd()],
          // bypassPermissions でツール使用を許可
          permissionMode: 'bypassPermissions',
        },
      }),
      schema: z.object({
        projectSummary: z.string().describe('A summary of the TypeScript project structure'),
        mainFiles: z.array(z.string()).describe('List of main files in the project'),
      }),
      prompt: 'このTypeScriptプロジェクトについて教えてください。どのようなファイルがありますか？',
    });

    console.log('Response:', result.object);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error during object generation:', error);
      console.log(
        '\nNote: Object generation (generateObject/streamObject) is not yet supported by Claude Code provider. Please use generateText or streamText instead.'
      );
    }
  }
}

async function basicStreamObjectExample() {
  console.log('Basic Claude Code example...');

  try {
    const result = streamObject({
      model: claudeCode('claude-3-5-sonnet-20241022', {
        options: {
          cwd: process.cwd(),
          maxTurns: 3,
          // Claude Code の内部ツールを使用
          allowedTools: ['file_read', 'bash', 'glob', 'grep'],
          // 現在のディレクトリを許可
          additionalDirectories: [process.cwd()],
          // bypassPermissions でツール使用を許可
          permissionMode: 'bypassPermissions',
        },
      }),
      schema: z.object({
        projectSummary: z.string().describe('A summary of the TypeScript project structure'),
        mainFiles: z.array(z.string()).describe('List of main files in the project'),
      }),
      prompt: 'このTypeScriptプロジェクトについて教えてください。どのようなファイルがありますか？',
    });

    await result.object;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error during object generation:', error);
      console.log(
        '\nNote: Object generation (generateObject/streamObject) is not yet supported by Claude Code provider. Please use generateText or streamText instead.'
      );
    }
  }
}

async function streamingExample() {
  console.log('\nStreaming Claude Code example...');

  const { textStream, toolCalls, toolResults } = await streamText({
    model: claudeCode('claude-3-5-sonnet-20241022', {
      options: {
        maxTurns: 5,
        includePartialMessages: true,
        allowedTools: ['file_read', 'glob', 'bash'],
        additionalDirectories: [process.cwd()],
        permissionMode: 'bypassPermissions',
      },
    }),
    prompt: 'このTypeScriptプロジェクトの構造を理解できるよう教えてください',
  });

  for await (const textPart of textStream) {
    process.stdout.write(textPart);
  }

  const t = await toolResults;

  for (const call of await toolCalls) {
    console.log('\n\nTool call:', call.toolName);
    console.log('Arguments:', call.input);
  }

  for (const result of await toolResults) {
    console.log('\nTool result for call ID', result.toolCallId);
    console.log('Output:', result.output);
  }

  console.log('\n\nTotal tool calls:', (await toolCalls).length);
  console.log('Total tool results:', t.length);

  console.log('\n');
}

async function legalAssistantExample() {
  console.log('\nLegal Assistant example...');

  const result = await generateText({
    model: claudeCode('claude-3-5-sonnet-20241022', {
      options: {
        customSystemPrompt:
          'You are a legal assistant. Help identify risks and suggest improvements in legal documents.',
        maxTurns: 2,
        // ツールなしでテキスト応答のみ
        allowedTools: [],
      },
    }),
    prompt:
      '次の契約条項の潜在的な問題を確認してください：「当事者は、本契約に起因するあらゆる損害について無制限の責任を負うことに同意する。」',
  });

  console.log('Legal Analysis:', result.text);
}

async function simpleExample() {
  console.log('\nSimple text-only example...');

  const result = await generateText({
    model: claudeCode('claude-3-5-sonnet-20241022', {
      options: {
        maxTurns: 1,
        // ツールを使わない簡単な例
        allowedTools: [],
      },
    }),
    prompt: 'TypeScriptとは何ですか？JavaScript開発においてなぜ有用なのですか？',
  });

  console.log('Response:', result.text);
}

// Run examples
async function main() {
  try {
    await simpleExample();
    await legalAssistantExample();

    console.log('\n--- File access examples (require Claude Code setup) ---');
    await basicExample();
    await streamingExample();
    await basicObjectExample();
    await basicStreamObjectExample();
  } catch (error) {
    console.error('Error running examples:', error);
    console.log('\nNote: File access examples require Claude Code to be properly installed and configured.');
    console.log('For simple text generation, the first examples should work.');
  }
}

if (require.main === module) {
  main();
}