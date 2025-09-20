import { query } from '@anthropic-ai/claude-code';

async function testClaudeCodeDirectly() {
  console.log('Testing Claude Code SDK directly...');

  try {
    // Claude Code SDKを直接使用してテスト
    const messages: any[] = [];

    for await (const message of query({
      prompt: 'List the files in the current directory',
      options: {
        cwd: process.cwd(),
        maxTurns: 3,
        // CLI環境を模倣するための設定
        pathToClaudeCodeExecutable: 'claude', // システムのclaude commandを指定
        permissionMode: 'bypassPermissions',
        allowedTools: ['file_read', 'bash', 'glob'],
        additionalDirectories: [process.cwd()],
      },
    })) {
      messages.push(message);
      console.log('Message type:', message.type);

      if (message.type === 'result') {
        console.log('Result:', message);
        break;
      } else if (message.type === 'assistant') {
        console.log('Assistant message content count:', message.message.content?.length || 0);
      } else if (message.type === 'system') {
        console.log('System message:', message.subtype);
      }
    }

    console.log('Total messages received:', messages.length);
  } catch (error) {
    console.error('Direct Claude Code test failed:', error);
  }
}

// 環境変数をチェック
console.log('Environment check:');
console.log('- CWD:', process.cwd());
console.log('- ANTHROPIC_API_KEY set:', !!process.env.ANTHROPIC_API_KEY);
console.log('- NODE_ENV:', process.env.NODE_ENV || 'undefined');

testClaudeCodeDirectly().then(() => {
  console.log('Test completed');
}).catch(console.error);