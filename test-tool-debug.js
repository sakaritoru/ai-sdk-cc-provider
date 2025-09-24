import { generateText } from 'ai';
import { claudeCode } from './dist/index.js';

console.log('=== Starting Claude Code Tool Debug Test ===');

async function testToolExecution() {
  try {
    const result = await generateText({
      model: claudeCode('claude-3-5-sonnet-20241022', {
        options: {
          cwd: process.cwd(),
          allowedTools: ['Read', 'bash', 'grep', 'glob'],
          maxTurns: 3,
        },
      }),
      tools: {
        Read: claudeCode.tools.Read,
        Bash: claudeCode.tools.Bash,
        Glob: claudeCode.tools.Glob,
        Grep: claudeCode.tools.Grep,
      },
      prompt: 'srcディレクトリ内のTypeScriptファイルを探して、最初の1つの内容を確認してください',
    });

    console.log('\n=== FINAL RESULT ===');
    console.log('Text:', result.text);
    console.log('Tool Calls:', result.toolCalls?.length || 0);
    console.log('Tool Results:', result.toolResults?.length || 0);

    // Extract tool info from steps if available
    if (result.steps && result.steps.length > 0) {
      const step = result.steps[0];
      console.log('Step Tool Calls:', step.toolCalls?.length || 0);
      console.log('Step Tool Results:', step.toolResults?.length || 0);
    }

    if (result.toolCalls) {
      result.toolCalls.forEach((call, i) => {
        console.log(`Tool Call ${i + 1}:`, call.toolName, JSON.parse(call.input || '{}'));
      });
    }

    if (result.toolResults) {
      result.toolResults.forEach((resultItem, i) => {
        console.log(`Tool Result ${i + 1}:`, resultItem.toolName, resultItem.result.substring(0, 200));
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testToolExecution();