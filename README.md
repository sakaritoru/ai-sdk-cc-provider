# AI SDK Claude Code Provider

A provider for [Vercel AI SDK](https://sdk.vercel.ai/) that enables the use of [Claude Code](https://claude.ai/code) with file operations, bash commands, and development tools.

> **Note**: This provider supports AI SDK v5 with LanguageModelV2 specification.

## Features

- 🛠️ **Development Tools**: Full access to Claude Code's built-in tools
- 📁 **File Operations**: Read, write, and edit files with precision
- 🖥️ **Bash Commands**: Execute shell commands and scripts
- 🔍 **Web Search**: Search and fetch web content
- 🔄 **Streaming Support**: Real-time response streaming with reasoning-delta
- 🧠 **Reasoning Stream**: Support for thinking/reasoning deltas like OpenAI o1
- 🛡️ **Type Safety**: Full TypeScript support with comprehensive type definitions
- ⚡ **AI SDK Compatible**: Works seamlessly with Vercel's AI SDK ecosystem

## Installation

```bash
npm install ai-sdk-cc-provider
# or
bun add ai-sdk-cc-provider
```

## Quick Start

### Basic Usage

```typescript
import { generateText } from 'ai';
import { claudeCode, getCommonClaudeCodeTools } from 'ai-sdk-cc-provider';

const result = await generateText({
  model: claudeCode('claude-3-5-sonnet-20241022', {
    options: {
      cwd: '/path/to/your/project',
      maxTurns: 3,
    },
  }),
  tools: getCommonClaudeCodeTools(), // Read, Bash, Grep, Glob
  prompt: 'Help me create a simple React component',
});

console.log(result.text);
```

### With Specific Tools (Direct Access)

```typescript
import { generateText } from 'ai';
import { claudeCode } from 'ai-sdk-cc-provider';

const result = await generateText({
  model: claudeCode('claude-3-5-sonnet-20241022'),
  tools: {
    Read: claudeCode.tools.Read,
    Write: claudeCode.tools.Write,
    Bash: claudeCode.tools.Bash,
  },
  prompt: 'Read package.json and create a summary',
});
```

### Alternative Import Methods

```typescript
// Method 1: Direct access via claudeCode.tools
tools: {
  Read: claudeCode.tools.Read,
  Bash: claudeCode.tools.Bash,
}

// Method 2: Import individual tools
import { claudeCodeTools } from 'ai-sdk-cc-provider';
tools: {
  Read: claudeCodeTools.Read,
  Bash: claudeCodeTools.Bash,
}

// Method 3: Use utility functions
import { getCommonClaudeCodeTools } from 'ai-sdk-cc-provider';
tools: getCommonClaudeCodeTools()
```

## Configuration

### Provider Settings

```typescript
import { createClaudeCode } from 'ai-sdk-cc-provider';

const provider = createClaudeCode();

const model = provider('claude-3-5-sonnet-20241022', {
  options: {
    cwd: process.cwd(),
    maxTurns: 5,
    allowedTools: ['file_read', 'file_write', 'bash'],
    additionalDirectories: ['/custom/path'],
  },
});
```

### Available Options

| Option | Type | Description |
|--------|------|-------------|
| `cwd` | `string` | Working directory for file operations |
| `maxTurns` | `number` | Maximum number of conversation turns |
| `maxThinkingTokens` | `number` | Maximum tokens for reasoning/thinking mode |
| `allowedTools` | `string[]` | Specific tools to enable |
| `disallowedTools` | `string[]` | Tools to disable |
| `additionalDirectories` | `string[]` | Additional directories to access |
| `mcpServers` | `Record<string, any>` | MCP server configurations |

## Supported Models

This provider works with Claude models available through Claude Code:

- `claude-3-5-sonnet-20241022`
- `claude-3-5-haiku-20241022`
- `claude-3-opus-20240229`

## Available Tools

This provider includes pre-defined Zod schemas for all Claude Code built-in tools:

### Tool Collections

```typescript
import {
  getCommonClaudeCodeTools,    // Read, Write, Bash, Glob, Grep
  getFileTools,               // Read, Write, Edit, MultiEdit
  getSearchTools,             // Glob, Grep
  getExecutionTools,          // Bash, BashOutput, KillShell
  getWebTools,               // WebFetch, WebSearch
  getProjectTools,           // Task, TodoWrite
  getAllClaudeCodeTools,     // All 13 standard tools
  claudeCodeTools,           // All individual tools
} from 'ai-sdk-cc-provider';
```

### Standard Tools by Category

**File Operations**
- **Read**: Read file contents with optional offset/limit
- **Write**: Write content to files
- **Edit**: Perform exact string replacements
- **MultiEdit**: Make multiple edits to a file in one operation

**Search & Exploration**
- **Glob**: Fast file pattern matching
- **Grep**: Powerful search with ripgrep (supports regex, file filtering)

**Execution Environment**
- **Bash**: Execute shell commands with optional background mode
- **BashOutput**: Retrieve output from running/completed background shells
- **KillShell**: Terminate background bash shells by ID

**Specialized Agents**
- **Task**: Launch specialized sub-agents for complex multi-step tasks

**Web Tools**
- **WebFetch**: Fetch and process web content
- **WebSearch**: Search the web with domain filtering

**Task Management**
- **TodoWrite**: Create and manage structured task lists for coding sessions

### Tool Access Patterns

```typescript
// Direct access (recommended)
tools: {
  Read: claudeCode.tools.Read,
  Bash: claudeCode.tools.Bash,
}

// Utility functions
tools: getCommonClaudeCodeTools()
tools: getAllClaudeCodeTools() // All 13 tools

// Import individual tools
tools: {
  Read: claudeCodeTools.Read,
  Bash: claudeCodeTools.Bash,
}

// Mix and match
tools: {
  ...getFileTools(),
  ...getProjectTools(),
  WebSearch: claudeCode.tools.WebSearch,
}
```

## Examples

### Basic File Operations
```typescript
import { generateText } from 'ai';
import { claudeCode, getFileTools } from 'ai-sdk-cc-provider';

const result = await generateText({
  model: claudeCode('claude-3-5-sonnet-20241022', {
    options: {
      cwd: './src',
      allowedTools: ['Read', 'Write', 'Edit'],
    },
  }),
  tools: getFileTools(),
  prompt: 'Read the package.json file and create a simple README.md',
});
```

### Streaming with Reasoning Support
```typescript
import { streamText } from 'ai';
import { claudeCode } from 'ai-sdk-cc-provider';

const { textStream, reasoningStream } = await streamText({
  model: claudeCode('claude-3-5-sonnet-20241022', {
    options: {
      maxTurns: 10,
      maxThinkingTokens: 10000, // Enable reasoning mode
      includePartialMessages: true,
    },
  }),
  prompt: 'Think through this complex problem step by step...',
});

// Stream reasoning deltas (thinking process)
for await (const reasoningPart of reasoningStream || []) {
  console.log('Thinking:', reasoningPart.delta);
}

// Stream final text output
for await (const textPart of textStream) {
  process.stdout.write(textPart);
}
```

### Custom MCP Servers
```typescript
import { claudeCode } from 'ai-sdk-cc-provider';

const model = claudeCode('claude-3-5-sonnet-20241022', {
  options: {
    mcpServers: {
      'custom-tools': {
        type: 'stdio',
        command: 'python',
        args: ['custom_mcp_server.py'],
      },
    },
  },
});
```

### Reasoning Mode Example
```typescript
import { generateText } from 'ai';
import { claudeCode } from 'ai-sdk-cc-provider';

const result = await generateText({
  model: claudeCode('claude-3-5-sonnet-20241022', {
    options: {
      maxThinkingTokens: 20000, // Enable extended reasoning
      maxTurns: 3,
    },
  }),
  prompt: 'Analyze this complex algorithm and suggest optimizations...',
});

console.log('Final answer:', result.text);
console.log('Reasoning tokens used:', result.usage?.reasoningTokens);
```

### Get All Tools at Once

```typescript
import { getAllClaudeCodeTools } from 'ai-sdk-cc-provider';

const result = await generateText({
  model: claudeCode('claude-3-5-sonnet-20241022'),
  tools: getAllClaudeCodeTools(), // All 13 standard tools
  prompt: 'Help me analyze and refactor my codebase',
});
```

## Environment Variables

Claude Code will automatically use your configured Anthropic API key. You can also set:

```bash
ANTHROPIC_API_KEY=your_api_key_here
```

## Requirements

- Node.js 18+ or Bun
- [Claude Code CLI](https://claude.ai/code) installed and configured
- AI SDK v5+ (`ai` package - peer dependency)
- Valid Anthropic API key

## Setup

1. Install Claude Code CLI (if not already installed):
```bash
npm install -g @anthropic-ai/claude-code
```

2. Configure your API key:
```bash
claude-code auth
```

3. For file operations, ensure proper permissions:
```typescript
const model = claudeCode('claude-3-5-sonnet-20241022', {
  options: {
    cwd: process.cwd(),
    additionalDirectories: [process.cwd()],
  },
});
```

## API Reference

### Types

```typescript
export interface ClaudeCodeProviderSettings {
  options?: ClaudeCodeOptions;
}

export interface ClaudeCodeOptions {
  cwd?: string;
  maxTurns?: number;
  maxThinkingTokens?: number; // Enable reasoning mode
  allowedTools?: string[];
  disallowedTools?: string[];
  additionalDirectories?: string[];
  mcpServers?: Record<string, any>;
  includePartialMessages?: boolean;
}
```

## Troubleshooting

### "No such tool" errors

If you get errors like `AI_NoSuchToolError: Model tried to call unavailable tool 'Read'`:

1. **Text-only usage**: For simple text generation without tools:
```typescript
const result = await generateText({
  model: claudeCode('claude-3-5-sonnet-20241022'),
  // No tools property needed for text-only
  prompt: 'Explain how React hooks work',
});
```

2. **File operations**: Ensure Claude Code is properly set up:
```typescript
const result = await generateText({
  model: claudeCode('claude-3-5-sonnet-20241022', {
    options: {
      cwd: process.cwd(),
      additionalDirectories: [process.cwd()],
    },
  }),
  tools: getFileTools(),
  prompt: 'Read and analyze my package.json',
});
```

3. **API Key issues**: Make sure your Anthropic API key is configured:
```bash
export ANTHROPIC_API_KEY=your_api_key_here
# or
claude-code auth
```

### Common Issues

- **File not found**: Add directories to `additionalDirectories`
- **Tool not available**: Make sure you're importing and using the correct tools

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
