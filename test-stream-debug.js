import { streamText } from 'ai';
import { claudeCode, getCommonClaudeCodeTools } from './dist/index.js';

console.log('=== Starting Claude Code Stream Debug Test ===');

async function testStreamToolExecution() {
  try {
    const { textStream, toolCallStream, toolResultStream } = await streamText({
      model: claudeCode('claude-3-5-sonnet-20241022', {
        options: {
          cwd: process.cwd(),
          allowedTools: ['Read', 'bash', 'grep', 'glob'],
          maxTurns: 3,
        },
      }),
      tools: getCommonClaudeCodeTools(),
      prompt: 'srcディレクトリ内のTypeScriptファイルを探して、最初の1つの内容を確認してください',
    });

    let toolCallCount = 0;
    let toolResultCount = 0;

    // Monitor tool calls
    for await (const toolCall of toolCallStream || []) {
      toolCallCount++;
      console.log(`Tool Call ${toolCallCount}:`, toolCall.toolName, Object.keys(JSON.parse(toolCall.input || '{}')));
    }

    // Monitor tool results
    for await (const result of toolResultStream || []) {
      toolResultCount++;
      console.log(`Tool Result ${toolResultCount}:`, result.toolCallId, 'length:', result.result.length);
    }

    // Get final text
    let finalText = '';
    for await (const textPart of textStream) {
      finalText += textPart;
    }

    console.log('\n=== STREAM FINAL RESULT ===');
    console.log('Total Tool Calls:', toolCallCount);
    console.log('Total Tool Results:', toolResultCount);
    console.log('Final Text Length:', finalText.length);

  } catch (error) {
    console.error('Error:', error);
  }
}

testStreamToolExecution();