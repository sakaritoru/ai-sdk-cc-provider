import { generateText, streamText } from 'ai';
import {
  claudeCode,
  claudeCodeTools,
  getCommonClaudeCodeTools,
  getFileTools,
  getWebTools
} from 'ai-sdk-cc-provider';

// Example 1: Using pre-defined tool collections
async function exampleWithCommonTools() {
  const result = await generateText({
    model: claudeCode('claude-3-5-sonnet-20241022', {
      options: {
        cwd: process.cwd(),
        allowedTools: ['Read', 'Bash', 'Grep', 'Glob'],
        maxTurns: 3,
      },
    }),
    tools: getCommonClaudeCodeTools(), // Read, Bash, Grep, Glob
    prompt: 'Find all TypeScript files in the src directory and read the first one.',
  });

  console.log(result.text);
}

// Example 2: Using specific tools
async function exampleWithSpecificTools() {
  const result = await generateText({
    model: claudeCode('claude-3-5-sonnet-20241022'),
    tools: {
      Read: claudeCodeTools.Read,
      Bash: claudeCodeTools.Bash,
    },
    prompt: 'Read package.json and show me the dependencies.',
  });

  console.log(result.text);
}

// Example 3: Using file manipulation tools
async function exampleWithFileTools() {
  const result = await generateText({
    model: claudeCode('claude-3-5-sonnet-20241022'),
    tools: getFileTools(), // Read, Edit, Write, MultiEdit, Glob
    prompt: 'Create a new file called hello.txt with "Hello, World!" content.',
  });

  console.log(result.text);
}

// Example 4: Using web tools
async function exampleWithWebTools() {
  const result = await generateText({
    model: claudeCode('claude-3-5-sonnet-20241022'),
    tools: getWebTools(), // WebFetch, WebSearch
    prompt: 'Search for the latest information about TypeScript 5.0 features.',
  });

  console.log(result.text);
}

// Example 5: Streaming with tools
async function exampleStreaming() {
  const { textStream, toolCallStream, toolResultStream } = await streamText({
    model: claudeCode('claude-3-5-sonnet-20241022'),
    tools: getCommonClaudeCodeTools(),
    prompt: 'Analyze the project structure by listing files and reading key configuration files.',
  });

  // Monitor tool calls
  for await (const toolCall of toolCallStream) {
    console.log('Tool Call:', toolCall.toolName, JSON.parse(toolCall.input));
  }

  // Monitor tool results
  for await (const result of toolResultStream) {
    console.log('Tool Result:', result.toolCallId, 'length:', result.result.length);
  }

  // Get final text
  let finalText = '';
  for await (const textPart of textStream) {
    finalText += textPart;
  }

  console.log('Final result:', finalText);
}

// Example 6: Custom tool selection
async function exampleCustomSelection() {
  const result = await generateText({
    model: claudeCode('claude-3-5-sonnet-20241022'),
    tools: {
      // Pick only the tools you need
      Read: claudeCodeTools.Read,
      Grep: claudeCodeTools.Grep,
      Edit: claudeCodeTools.Edit,
      WebSearch: claudeCodeTools.WebSearch,
    },
    prompt: 'Find all TODO comments in the codebase and create a summary file.',
  });

  console.log(result.text);
}

// Run examples
console.log('=== Claude Code Tools Usage Examples ===');
// Uncomment the example you want to run
// await exampleWithCommonTools();
// await exampleWithSpecificTools();
// await exampleWithFileTools();
// await exampleWithWebTools();
// await exampleStreaming();
// await exampleCustomSelection();