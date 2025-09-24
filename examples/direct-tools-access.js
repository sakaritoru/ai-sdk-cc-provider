import { generateText, streamText } from 'ai';
import { claudeCode } from '../dist/index.js';

console.log('=== Claude Code Direct Tools Access Examples ===');

// Example 1: Using claudeCode.tools for direct access
async function exampleDirectAccess() {
  console.log('Example 1: Direct tools access via claudeCode.tools');

  const result = await generateText({
    model: claudeCode('claude-3-5-sonnet-20241022', {
      options: {
        cwd: process.cwd(),
        allowedTools: ['Read', 'Bash', 'Glob'],
        maxTurns: 3,
      },
    }),
    tools: {
      Read: claudeCode.tools.Read,
      Bash: claudeCode.tools.Bash,
      Glob: claudeCode.tools.Glob,
    },
    prompt: 'Find TypeScript files and show me the first one.',
  });

  console.log('Result:', result.text);
  console.log('---');
}

// Example 2: Mix and match tools
async function exampleMixAndMatch() {
  console.log('Example 2: Mix and match specific tools');

  const result = await generateText({
    model: claudeCode('claude-3-5-sonnet-20241022'),
    tools: {
      Read: claudeCode.tools.Read,
      Write: claudeCode.tools.Write,
      Edit: claudeCode.tools.Edit,
      Bash: claudeCode.tools.Bash,
    },
    prompt: 'Read package.json, then create a simple hello.txt file.',
  });

  console.log('Result:', result.text);
  console.log('---');
}

// Example 3: File manipulation tools
async function exampleFileManipulation() {
  console.log('Example 3: File manipulation tools');

  const result = await generateText({
    model: claudeCode('claude-3-5-sonnet-20241022'),
    tools: {
      Read: claudeCode.tools.Read,
      Write: claudeCode.tools.Write,
      Edit: claudeCode.tools.Edit,
      MultiEdit: claudeCode.tools.MultiEdit,
      Glob: claudeCode.tools.Glob,
    },
    prompt: 'Create a new file called example.ts with a simple TypeScript class.',
  });

  console.log('Result:', result.text);
  console.log('---');
}

// Example 4: Web tools
async function exampleWebTools() {
  console.log('Example 4: Web tools access');

  const result = await generateText({
    model: claudeCode('claude-3-5-sonnet-20241022'),
    tools: {
      WebSearch: claudeCode.tools.WebSearch,
      WebFetch: claudeCode.tools.WebFetch,
    },
    prompt: 'Search for the latest TypeScript news and fetch content from the first result.',
  });

  console.log('Result:', result.text);
  console.log('---');
}

// Example 5: Streaming with direct tools access
async function exampleStreamingDirectAccess() {
  console.log('Example 5: Streaming with direct tools access');

  const { textStream, toolCallStream, toolResultStream } = await streamText({
    model: claudeCode('claude-3-5-sonnet-20241022', {
      options: {
        cwd: process.cwd(),
        allowedTools: ['Read', 'Grep', 'Bash'],
      },
    }),
    tools: {
      Read: claudeCode.tools.Read,
      Grep: claudeCode.tools.Grep,
      Bash: claudeCode.tools.Bash,
    },
    prompt: 'Analyze this project structure and find all TODO comments in the code.',
  });

  // Monitor tool calls
  for await (const toolCall of toolCallStream) {
    console.log('Tool Call:', toolCall.toolName, 'with args:', Object.keys(JSON.parse(toolCall.input)));
  }

  // Monitor tool results
  for await (const result of toolResultStream) {
    console.log('Tool Result for:', result.toolCallId, 'length:', result.result.length);
  }

  // Get final text
  let finalText = '';
  for await (const textPart of textStream) {
    finalText += textPart;
  }

  console.log('Final streaming result:', finalText);
  console.log('---');
}

// Example 6: All available tools showcase
async function exampleShowAllTools() {
  console.log('Example 6: Available tools in claudeCode.tools');
  console.log('Available tools:', Object.keys(claudeCode.tools));

  // Show details of a specific tool
  console.log('Read tool schema:', {
    name: claudeCode.tools.Read.name,
    description: claudeCode.tools.Read.description,
    inputKeys: Object.keys(claudeCode.tools.Read.inputSchema.shape),
  });
}

// Run examples (uncomment the ones you want to test)
await exampleShowAllTools();
// await exampleDirectAccess();
// await exampleMixAndMatch();
// await exampleFileManipulation();
// await exampleWebTools();
// await exampleStreamingDirectAccess();