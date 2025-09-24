import { generateText } from 'ai';
import {
  claudeCode,
  getFileTools,
  getSearchTools,
  getExecutionTools,
  getWebTools,
  getProjectTools
} from '../dist/index.js';

console.log('=== Claude Code Standard Tools Showcase ===');

// Example 1: File Operations
async function exampleFileOperations() {
  console.log('1. File Operations Tools');

  const result = await generateText({
    model: claudeCode('claude-3-5-sonnet-20241022'),
    tools: getFileTools(), // Read, Write, Edit, MultiEdit
    prompt: 'Create a simple TypeScript interface file called User.ts with basic user properties.',
  });

  console.log('File operations result:', result.text.substring(0, 200) + '...');
  console.log('---\n');
}

// Example 2: Search & Exploration
async function exampleSearchTools() {
  console.log('2. Search & Exploration Tools');

  const result = await generateText({
    model: claudeCode('claude-3-5-sonnet-20241022', {
      options: {
        cwd: process.cwd(),
        allowedTools: ['Glob', 'Grep'],
      },
    }),
    tools: getSearchTools(), // Glob, Grep
    prompt: 'Find all TypeScript files in this project and search for any TODO comments.',
  });

  console.log('Search results:', result.text.substring(0, 200) + '...');
  console.log('---\n');
}

// Example 3: Execution Environment
async function exampleExecutionTools() {
  console.log('3. Execution Environment Tools');

  const result = await generateText({
    model: claudeCode('claude-3-5-sonnet-20241022'),
    tools: getExecutionTools(), // Bash, BashOutput, KillShell
    prompt: 'Run a background process to list files, then get its output and terminate it.',
  });

  console.log('Execution result:', result.text.substring(0, 200) + '...');
  console.log('---\n');
}

// Example 4: Web Tools
async function exampleWebTools() {
  console.log('4. Web Tools');

  const result = await generateText({
    model: claudeCode('claude-3-5-sonnet-20241022'),
    tools: getWebTools(), // WebFetch, WebSearch
    prompt: 'Search for the latest TypeScript 5.4 release notes and fetch the content.',
  });

  console.log('Web tools result:', result.text.substring(0, 200) + '...');
  console.log('---\n');
}

// Example 5: Project Management
async function exampleProjectTools() {
  console.log('5. Project Management Tools');

  const result = await generateText({
    model: claudeCode('claude-3-5-sonnet-20241022'),
    tools: getProjectTools(), // Task, TodoWrite
    prompt: 'Create a todo list for implementing a new feature and launch a sub-agent to analyze the requirements.',
  });

  console.log('Project tools result:', result.text.substring(0, 200) + '...');
  console.log('---\n');
}

// Example 6: Direct access to all tools
async function exampleDirectAccess() {
  console.log('6. Direct Access to Specific Tools');

  const result = await generateText({
    model: claudeCode('claude-3-5-sonnet-20241022'),
    tools: {
      Read: claudeCode.tools.Read,
      Bash: claudeCode.tools.Bash,
      BashOutput: claudeCode.tools.BashOutput,
      Glob: claudeCode.tools.Glob,
      TodoWrite: claudeCode.tools.TodoWrite,
    },
    prompt: 'Analyze this project structure and create a development todo list.',
  });

  console.log('Direct access result:', result.text.substring(0, 200) + '...');
  console.log('---\n');
}

// Show all available tools
function showAllTools() {
  console.log('All Available Claude Code Standard Tools:');
  console.log('=====================================');

  const tools = claudeCode.tools;
  Object.entries(tools).forEach(([name, tool]) => {
    console.log(`• ${name}: ${tool.description}`);
  });

  console.log('\nTool Categories:');
  console.log('• File Operations:', Object.keys(getFileTools()));
  console.log('• Search & Exploration:', Object.keys(getSearchTools()));
  console.log('• Execution Environment:', Object.keys(getExecutionTools()));
  console.log('• Web Tools:', Object.keys(getWebTools()));
  console.log('• Project Management:', Object.keys(getProjectTools()));
  console.log('---\n');
}

// Run the showcase
showAllTools();

// Uncomment to run specific examples
// await exampleFileOperations();
// await exampleSearchTools();
// await exampleExecutionTools();
// await exampleWebTools();
// await exampleProjectTools();
// await exampleDirectAccess();