# AI SDK Claude Code Provider

A Claude Code provider for Vercel AI SDK using @anthropic-ai/claude-code. This provider enables Claude to perform development tasks through file operations, bash commands, web search, and other code-related tools.

## Features

- 🛠️ **Development Tools**: Full access to Claude Code's built-in tools
- 📁 **File Operations**: Read, write, and edit files with precision
- 🖥️ **Bash Commands**: Execute shell commands and scripts
- 🔍 **Web Search**: Search and fetch web content
- 🔄 **Streaming Support**: Real-time response streaming
- 🛡️ **Type Safety**: Full TypeScript support with comprehensive type definitions
- ⚡ **AI SDK Compatible**: Works seamlessly with Vercel's AI SDK ecosystem

## Installation

```bash
npm install ai-sdk-cc-provider
# or
bun add ai-sdk-cc-provider
```

## Quick Start

```typescript
import { generateText } from 'ai';
import { claudeCode } from 'ai-sdk-cc-provider';

const result = await generateText({
  model: claudeCode('claude-3-5-sonnet-20241022', {
    options: {
      cwd: '/path/to/your/project',
      maxTurns: 3,
    },
  }),
  prompt: 'Help me create a simple React component',
});

console.log(result.text);
console.log(result.toolCalls);
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

Claude Code automatically provides access to these development tools:

### File Operations
- **file_read**: Read file contents
- **file_write**: Write content to files
- **file_edit**: Edit existing files
- **file_multi_edit**: Make multiple edits to a file

### Development Tools
- **bash**: Execute shell commands
- **grep**: Search file contents
- **glob**: Find files by pattern

### Web Tools
- **web_search**: Search the web
- **web_fetch**: Fetch content from URLs

### Project Management
- **todo_write**: Manage task lists
- **agent**: Launch specialized sub-agents

## Examples

### Basic File Operations
```typescript
import { generateText } from 'ai';
import { claudeCode } from 'ai-sdk-cc-provider';

const result = await generateText({
  model: claudeCode('claude-3-5-sonnet-20241022', {
    options: {
      cwd: './src',
      allowedTools: ['file_read', 'file_write'],
    },
  }),
  prompt: 'Read the package.json file and create a simple README.md',
});
```

### Streaming with Development Tasks
```typescript
import { streamText } from 'ai';
import { claudeCode } from 'ai-sdk-cc-provider';

const { textStream } = await streamText({
  model: claudeCode('claude-3-5-sonnet-20241022', {
    options: {
      maxTurns: 10,
      includePartialMessages: true,
    },
  }),
  prompt: 'Help me set up a new TypeScript project with proper configuration',
});

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

### Legal Assistant Example
```typescript
import { generateText } from 'ai';
import { claudeCode } from 'ai-sdk-cc-provider';

const result = await generateText({
  model: claudeCode('claude-3-5-sonnet-20241022', {
    options: {
      customSystemPrompt: 'You are a legal assistant. Help identify risks and suggest improvements.',
      maxTurns: 2,
    },
  }),
  prompt: 'Review this contract clause for potential issues: "Parties agree to unlimited liability..."',
});
```

## Environment Variables

Claude Code will automatically use your configured Anthropic API key. You can also set:

```bash
ANTHROPIC_API_KEY=your_api_key_here
```

## Requirements

- Node.js 18+ or Bun
- Claude Code installed and configured
- `ai` package (peer dependency)
- Anthropic API key

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
    permissionMode: 'bypassPermissions', // For development
    additionalDirectories: [process.cwd()],
    allowedTools: ['file_read', 'file_write', 'bash'],
  },
});
```

## API Reference

### Types

```typescript
export interface ClaudeCodeProviderSettings {
  options?: ClaudeCodeOptions;
}

export interface ClaudeCodeToolConfig {
  enabledTools?: string[];
  disabledTools?: string[];
  mcpServers?: Record<string, any>;
  additionalDirectories?: string[];
}
```

## Troubleshooting

### "No such tool" errors

If you get errors like `AI_NoSuchToolError: Model tried to call unavailable tool 'Read'`:

1. **Text-only usage**: For simple text generation without tools:
```typescript
const model = claudeCode('claude-3-5-sonnet-20241022', {
  options: {
    allowedTools: [], // No tools needed for text-only
  },
});
```

2. **File operations**: Ensure Claude Code is properly set up:
```typescript
const model = claudeCode('claude-3-5-sonnet-20241022', {
  options: {
    permissionMode: 'bypassPermissions',
    additionalDirectories: [process.cwd()],
    allowedTools: ['file_read', 'file_write', 'bash', 'glob'],
  },
});
```

3. **API Key issues**: Make sure your Anthropic API key is configured:
```bash
export ANTHROPIC_API_KEY=your_api_key_here
# or
claude-code auth
```

### Common Issues

- **Permission denied**: Use `permissionMode: 'bypassPermissions'` for development
- **File not found**: Add directories to `additionalDirectories`
- **Tool not available**: Check `allowedTools` array includes required tools

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
