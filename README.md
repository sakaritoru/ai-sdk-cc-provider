# AI SDK Claude Code Provider

A provider for [Vercel AI SDK](https://sdk.vercel.ai/) that enables the use of [Claude Code](https://claude.ai/code) with development tools, file operations, and reasoning support.

> **Note**: Supports AI SDK v5 with LanguageModelV2 specification.

## Features

- 🛠️ **13 Built-in Tools**: File operations, bash commands, web search, project management
- 🧠 **Reasoning Support**: Claude-style thinking with reasoning streams
- 🔄 **Streaming**: Real-time response and tool execution streaming
- ⚡ **AI SDK v5**: Compatible with latest Vercel AI SDK

> **Note**: Currently supports `generateText` and `streamText`. Object generation (`generateObject`, `streamObject`) is not yet supported.

## Installation

```bash
npm install ai-sdk-cc-provider
```

## Quick Start

### Basic Usage

```typescript
import { generateText } from 'ai';
import { claudeCode, getCommonClaudeCodeTools } from 'ai-sdk-cc-provider';

const result = await generateText({
  model: claudeCode('claude-sonnet-4-0', {
    options: {
      cwd: process.cwd(),
      maxTurns: 3,
      allowedTools: ['Read', 'Write', 'Bash', 'Glob', 'Grep'],
    },
  }),
  tools: getCommonClaudeCodeTools(), // Read, Write, Bash, Glob, Grep
  prompt: 'Help me create a simple React component',
});

console.log(result.text);
```

### Streaming Text with Reasoning

```typescript
import { streamText } from 'ai';
import { claudeCode, getFileTools } from 'ai-sdk-cc-provider';

const { textStream, reasoningStream } = await streamText({
  model: claudeCode('claude-opus-4-1', {
    options: {
      cwd: process.cwd(),
      maxThinkingTokens: 10000, // Enable reasoning mode
      allowedTools: ['Read', 'Write', 'Edit', 'MultiEdit'],
    },
  }),
  tools: getFileTools(),
  prompt: 'Analyze my codebase and suggest improvements',
});

// Stream reasoning deltas (thinking process)
for await (const reasoning of reasoningStream || []) {
  process.stdout.write(reasoning.delta);
}

// Stream final text output
for await (const text of textStream) {
  process.stdout.write(text);
}
```

### Tool Access Methods

```typescript
// Method 1: Direct access
tools: {
  Read: claudeCode.tools.Read,
  Bash: claudeCode.tools.Bash,
}

// Method 2: Use utility functions
import { getCommonClaudeCodeTools, getAllClaudeCodeTools } from 'ai-sdk-cc-provider';
tools: getCommonClaudeCodeTools() // 5 most common tools
tools: getAllClaudeCodeTools()    // All 13 tools
```

## Configuration

```typescript
const model = claudeCode('claude-sonnet-4-0', {
  options: {
    cwd: process.cwd(),                    // Working directory
    maxTurns: 5,                          // Max conversation turns
    maxThinkingTokens: 10000,             // Enable reasoning mode
    allowedTools: ['Read', 'Write', 'Bash'], // Specific tools to enable
    additionalDirectories: ['/src'],      // Extra accessible directories
    mcpServers: { /* MCP configs */ },    // Custom MCP servers
  },
});
```

## Supported Models

- `claude-opus-4-1` - Latest Opus (→ claude-opus-4-1-20250805)
- `claude-opus-4-0` - Claude Opus 4 (→ claude-opus-4-20250514)
- `claude-sonnet-4-5` - Best model for complex agents and coding (→ claude-sonnet-4-5-20250929)
- `claude-sonnet-4-0` - High-performance Sonnet (→ claude-sonnet-4-20250514)
- `claude-3-7-sonnet-latest` - Claude 3.7 Sonnet (→ claude-3-7-sonnet-20250219)
- `claude-3-5-haiku-latest` - Fast Haiku (→ claude-3-5-haiku-20241022)

For production, you can use specific model versions (e.g., `claude-sonnet-4-5-20250929`) to ensure consistent behavior.

## Available Tools

### Tool Collections

```typescript
import {
  getCommonClaudeCodeTools,    // Read, Write, Bash, Glob, Grep
  getFileTools,               // Read, Write, Edit, MultiEdit
  getExecutionTools,          // Bash, BashOutput, KillShell
  getWebTools,               // WebFetch, WebSearch
  getProjectTools,           // Task, TodoWrite
  getAllClaudeCodeTools,     // All 13 tools
} from 'ai-sdk-cc-provider';
```

### 13 Built-in Tools

**File Operations**: Read, Write, Edit, MultiEdit
**Search**: Glob, Grep
**Execution**: Bash, BashOutput, KillShell
**Web**: WebFetch, WebSearch
**Project**: Task, TodoWrite

### Tool Usage

```typescript
// Most common tools
tools: getCommonClaudeCodeTools()

// All tools
tools: getAllClaudeCodeTools()

// Specific categories
tools: {
  ...getFileTools(),
  ...getWebTools(),
}

// Direct access
tools: {
  Read: claudeCode.tools.Read,
  Bash: claudeCode.tools.Bash,
}
```

## Examples

### File Operations
```typescript
import { generateText } from 'ai';
import { claudeCode, getFileTools } from 'ai-sdk-cc-provider';

const result = await generateText({
  model: claudeCode('claude-sonnet-4-0', {
    options: {
      allowedTools: ['Read', 'Write', 'Edit', 'MultiEdit'],
    },
  }),
  tools: getFileTools(),
  prompt: 'Read package.json and create a README.md',
});
```

### Web Tools
```typescript
import { claudeCode, getWebTools } from 'ai-sdk-cc-provider';

const result = await generateText({
  model: claudeCode('claude-sonnet-4-0', {
    options: {
      allowedTools: ['WebFetch', 'WebSearch'],
    },
  }),
  tools: getWebTools(),
  prompt: 'Search for the latest TypeScript documentation',
});
```

### With All Tools
```typescript
import { claudeCode, getAllClaudeCodeTools } from 'ai-sdk-cc-provider';

const result = await generateText({
  model: claudeCode('claude-sonnet-4-0', {
    options: {
      allowedTools: ['Read', 'Write', 'Edit', 'MultiEdit', 'Bash', 'Glob', 'Grep', 'WebFetch', 'WebSearch', 'Task', 'TodoWrite'],
    },
  }),
  tools: getAllClaudeCodeTools(), // All 13 tools
  prompt: 'Help me analyze and refactor my codebase',
});
```



## Requirements

- Node.js 18+
- [Claude Code CLI](https://claude.ai/code) installed
- AI SDK v5+ (`ai` package)



## Troubleshooting

- **Tool errors**: Ensure Claude Code CLI is properly installed and configured
- **File access**: Add directories to `additionalDirectories` option
- **Permission issues**: Check Claude Code has access to your project directory

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
