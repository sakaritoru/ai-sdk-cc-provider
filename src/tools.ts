import { z } from 'zod/v4';

/**
 * Claude Code standard tools with Zod schemas for AI SDK integration
 * These tools mirror the built-in tools available in Claude Code
 */
export const claudeCodeTools = {
  Read: {
    name: 'Read',
    id: 'claude-code.read',
    description: 'Read a file from the filesystem',
    inputSchema: z.object({
      file_path: z.string().describe('The absolute path to the file to read'),
      limit: z.number().optional().describe('The number of lines to read. Only provide if the file is too large to read at once.'),
      offset: z.number().optional().describe('The line number to start reading from. Only provide if the file is too large to read at once'),
    }),
    outputSchema: z.string().describe('The content of the file')
  },

  Bash: {
    name: 'Bash',
    id: 'claude-code.bash',
    description: 'Execute bash commands in a persistent shell session',
    inputSchema: z.object({
      command: z.string().describe('The command to execute'),
      description: z.string().optional().describe('Clear, concise description of what this command does in 5-10 words'),
      run_in_background: z.boolean().optional().describe('Set to true to run this command in the background'),
      timeout: z.number().optional().describe('Optional timeout in milliseconds (max 600000)'),
    }),
    outputSchema: z.string().describe('The output of the bash command')
  },

  BashOutput: {
    name: 'BashOutput',
    id: 'claude-code.bash-output',
    description: 'Retrieve output from a running or completed background bash shell',
    inputSchema: z.object({
      bash_id: z.string().describe('The ID of the background shell to retrieve output from'),
      filter: z.string().optional().describe('Optional regular expression to filter the output lines'),
    }),
    outputSchema: z.string().describe('stdout and stderr output along with shell status')
  },

  KillShell: {
    name: 'KillShell',
    id: 'claude-code.kill-shell',
    description: 'Kill a running background bash shell by its ID',
    inputSchema: z.object({
      shell_id: z.string().describe('The ID of the background shell to kill'),
    }),
    outputSchema: z.string().describe('Success or failure status of the shell termination')
  },

  Grep: {
    name: 'Grep',
    id: 'claude-code.grep',
    description: 'A powerful search tool built on ripgrep for finding text in files',
    inputSchema: z.object({
      pattern: z.string().describe('The regular expression pattern to search for in file contents'),
      path: z.string().optional().describe('File or directory to search in (defaults to current working directory)'),
      glob: z.string().optional().describe('Glob pattern to filter files (e.g. "*.js", "*.{ts,tsx}")'),
      type: z.string().optional().describe('File type to search (e.g. "js", "py", "rust", "go", "java")'),
      output_mode: z.enum(['content', 'files_with_matches', 'count']).optional().describe('Output mode: "content" shows matching lines, "files_with_matches" shows file paths, "count" shows match counts'),
      '-i': z.boolean().optional().describe('Case insensitive search'),
      '-n': z.boolean().optional().describe('Show line numbers in output (requires output_mode: "content")'),
      '-A': z.number().optional().describe('Number of lines to show after each match (requires output_mode: "content")'),
      '-B': z.number().optional().describe('Number of lines to show before each match (requires output_mode: "content")'),
      '-C': z.number().optional().describe('Number of lines to show before and after each match (requires output_mode: "content")'),
      head_limit: z.number().optional().describe('Limit output to first N lines/entries'),
      multiline: z.boolean().optional().describe('Enable multiline mode where . matches newlines and patterns can span lines'),
    }),
    outputSchema: z.string().describe('The search results based on the output mode')
  },

  Glob: {
    name: 'Glob',
    id: 'claude-code.glob',
    description: 'Fast file pattern matching tool that works with any codebase size',
    inputSchema: z.object({
      pattern: z.string().describe('The glob pattern to match files against (e.g. "**/*.js" or "src/**/*.ts")'),
      path: z.string().optional().describe('The directory to search in (defaults to current working directory)'),
    }),
    outputSchema: z.string().describe('Matching file paths sorted by modification time')
  },

  Edit: {
    name: 'Edit',
    id: 'claude-code.edit',
    description: 'Performs exact string replacements in files',
    inputSchema: z.object({
      file_path: z.string().describe('The absolute path to the file to modify'),
      old_string: z.string().describe('The text to replace'),
      new_string: z.string().describe('The text to replace it with (must be different from old_string)'),
      replace_all: z.boolean().optional().describe('Replace all occurrences of old_string (default false)'),
    }),
    outputSchema: z.string().describe('Confirmation of the edit operation')
  },

  Write: {
    name: 'Write',
    id: 'claude-code.write',
    description: 'Writes a file to the local filesystem',
    inputSchema: z.object({
      file_path: z.string().describe('The absolute path to the file to write (must be absolute, not relative)'),
      content: z.string().describe('The content to write to the file'),
    }),
    outputSchema: z.string().describe('Confirmation of the write operation')
  },

  MultiEdit: {
    name: 'MultiEdit',
    id: 'claude-code.multi-edit',
    description: 'Make multiple edits to a single file in one operation',
    inputSchema: z.object({
      file_path: z.string().describe('The absolute path to the file to modify'),
      edits: z.array(z.object({
        old_string: z.string().describe('The text to replace'),
        new_string: z.string().describe('The edited text to replace the old_string'),
        replace_all: z.boolean().optional().describe('Replace all occurrences of old_string (default false)'),
      })).describe('Array of edit operations to perform sequentially on the file'),
    }),
    outputSchema: z.string().describe('Confirmation of all edit operations')
  },

  WebFetch: {
    name: 'WebFetch',
    id: 'claude-code.web-fetch',
    description: 'Fetches content from a specified URL and processes it using an AI model',
    inputSchema: z.object({
      url: z.string().describe('The URL to fetch content from'),
      prompt: z.string().describe('The prompt to run on the fetched content'),
    }),
    outputSchema: z.string().describe('The model response about the fetched content')
  },

  WebSearch: {
    name: 'WebSearch',
    id: 'claude-code.web-search',
    description: 'Search the web and use the results to inform responses',
    inputSchema: z.object({
      query: z.string().min(2).describe('The search query to use'),
      allowed_domains: z.array(z.string()).optional().describe('Only include search results from these domains'),
      blocked_domains: z.array(z.string()).optional().describe('Never include search results from these domains'),
    }),
    outputSchema: z.string().describe('Search result information formatted as search result blocks')
  },

  Task: {
    name: 'Task',
    id: 'claude-code.task',
    description: 'Launch a new agent to handle complex, multi-step tasks autonomously',
    inputSchema: z.object({
      description: z.string().describe('A short (3-5 word) description of the task'),
      prompt: z.string().describe('The task for the agent to perform'),
      subagent_type: z.string().describe('The type of specialized agent to use for this task'),
    }),
    outputSchema: z.string().describe('The agent result and completion status')
  },

  TodoWrite: {
    name: 'TodoWrite',
    id: 'claude-code.todo-write',
    description: 'Create and manage a structured task list for your current coding session',
    inputSchema: z.object({
      todos: z.array(z.object({
        content: z.string().min(1).describe('The imperative form describing what needs to be done'),
        status: z.enum(['pending', 'in_progress', 'completed']).describe('Task state: pending (not started), in_progress (currently working), completed (finished)'),
        activeForm: z.string().min(1).describe('The present continuous form shown during execution'),
      })).describe('The updated todo list'),
    }),
    outputSchema: z.string().describe('Confirmation of todo list update and progress tracking')
  },
} as const;

/**
 * Utility function to get commonly used tools for quick setup
 */
export const getCommonClaudeCodeTools = () => ({
  Read: claudeCodeTools.Read,
  Write: claudeCodeTools.Write,
  Bash: claudeCodeTools.Bash,
  Glob: claudeCodeTools.Glob,
  Grep: claudeCodeTools.Grep,
});

/**
 * Utility function to get file manipulation tools
 */
export const getFileTools = () => ({
  Read: claudeCodeTools.Read,
  Write: claudeCodeTools.Write,
  Edit: claudeCodeTools.Edit,
  MultiEdit: claudeCodeTools.MultiEdit,
});

/**
 * Utility function to get search and exploration tools
 */
export const getSearchTools = () => ({
  Glob: claudeCodeTools.Glob,
  Grep: claudeCodeTools.Grep,
});

/**
 * Utility function to get execution environment tools
 */
export const getExecutionTools = () => ({
  Bash: claudeCodeTools.Bash,
  BashOutput: claudeCodeTools.BashOutput,
  KillShell: claudeCodeTools.KillShell,
});

/**
 * Utility function to get web-related tools
 */
export const getWebTools = () => ({
  WebFetch: claudeCodeTools.WebFetch,
  WebSearch: claudeCodeTools.WebSearch,
});

/**
 * Utility function to get project management tools
 */
export const getProjectTools = () => ({
  Task: claudeCodeTools.Task,
  TodoWrite: claudeCodeTools.TodoWrite,
});

/**
 * Utility function to get ALL Claude Code tools at once
 * Includes all 13 standard tools: Read, Write, Edit, MultiEdit, Bash, BashOutput, KillShell, Grep, Glob, WebFetch, WebSearch, Task, TodoWrite
 */
export const getAllClaudeCodeTools = () => ({
  ...claudeCodeTools,
});

/**
 * Type for Claude Code tool definitions
 */
export type ClaudeCodeToolDefinition = typeof claudeCodeTools[keyof typeof claudeCodeTools];