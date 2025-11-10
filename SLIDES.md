---
marp: true
theme: default
paginate: true
---

# AI SDK Claude Code Provider

Vercel AI SDK で Claude Code の機能を活用

---

## 概要

**AI SDK Claude Code Provider** は、Vercel AI SDK で Claude Code の強力な開発ツールを使用可能にするプロバイダーです。

- 🛠️ **13種類の組み込みツール**
- 🧠 **推論サポート**
- 🔄 **リアルタイムストリーミング**
- ⚡ **AI SDK v5対応**

---

## 主な機能

### 13種類の組み込みツール

| カテゴリ | ツール |
|---------|--------|
| **ファイル操作** | Read, Write, Edit, MultiEdit |
| **検索** | Glob, Grep |
| **実行** | Bash, BashOutput, KillShell |
| **Web** | WebFetch, WebSearch |
| **プロジェクト管理** | Task, TodoWrite |

---

## インストール

```bash
npm install ai-sdk-cc-provider
```

### 必要要件

- Node.js 18+
- Claude Code CLI インストール済み
- AI SDK v5+ (`ai` パッケージ)

---

## 基本的な使い方

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
  tools: getCommonClaudeCodeTools(),
  prompt: 'Help me create a simple React component',
});

console.log(result.text);
```

---

## ストリーミング + 推論モード

```typescript
import { streamText } from 'ai';
import { claudeCode, getFileTools } from 'ai-sdk-cc-provider';

const { textStream, reasoningStream } = await streamText({
  model: claudeCode('claude-opus-4-1', {
    options: {
      cwd: process.cwd(),
      maxThinkingTokens: 10000, // 推論モード有効化
      allowedTools: ['Read', 'Write', 'Edit', 'MultiEdit'],
    },
  }),
  tools: getFileTools(),
  prompt: 'Analyze my codebase and suggest improvements',
});
```

---

## 推論ストリームの活用

Claude の思考プロセスをリアルタイムで確認可能

```typescript
// 推論デルタをストリーミング（思考プロセス）
for await (const reasoning of reasoningStream || []) {
  process.stdout.write(reasoning.delta);
}

// 最終的なテキスト出力をストリーミング
for await (const text of textStream) {
  process.stdout.write(text);
}
```

---

## ツールアクセス方法

### 方法1: 直接アクセス
```typescript
tools: {
  Read: claudeCode.tools.Read,
  Bash: claudeCode.tools.Bash,
}
```

### 方法2: ユーティリティ関数を使用
```typescript
import {
  getCommonClaudeCodeTools,  // よく使う5つのツール
  getAllClaudeCodeTools      // 全13ツール
} from 'ai-sdk-cc-provider';

tools: getCommonClaudeCodeTools()
```

---

## ツールコレクション

```typescript
import {
  getCommonClaudeCodeTools,   // Read, Write, Bash, Glob, Grep
  getFileTools,               // Read, Write, Edit, MultiEdit
  getExecutionTools,          // Bash, BashOutput, KillShell
  getWebTools,                // WebFetch, WebSearch
  getProjectTools,            // Task, TodoWrite
  getAllClaudeCodeTools,      // 全13ツール
} from 'ai-sdk-cc-provider';
```

---

## 設定オプション

```typescript
const model = claudeCode('claude-sonnet-4-0', {
  options: {
    cwd: process.cwd(),                    // 作業ディレクトリ
    maxTurns: 5,                          // 最大会話ターン数
    maxThinkingTokens: 10000,             // 推論モード有効化
    allowedTools: ['Read', 'Write', 'Bash'], // 使用可能なツール
    additionalDirectories: ['/src'],      // 追加のアクセス可能ディレクトリ
    mcpServers: { /* MCP設定 */ },        // カスタムMCPサーバー
  },
});
```

---

## サポートモデル

| モデル | 説明 |
|--------|------|
| `claude-opus-4-1` | 最新Opus (claude-opus-4-1-20250805) |
| `claude-opus-4-0` | Claude Opus 4 (claude-opus-4-20250514) |
| `claude-sonnet-4-5` | 複雑なエージェントとコーディングに最適 |
| `claude-sonnet-4-0` | 高性能Sonnet |
| `claude-3-7-sonnet-latest` | Claude 3.7 Sonnet |
| `claude-3-5-haiku-latest` | 高速Haiku |

---

## 使用例: ファイル操作

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

---

## 使用例: Webツール

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

---

## 使用例: 全ツールを使用

```typescript
import { claudeCode, getAllClaudeCodeTools } from 'ai-sdk-cc-provider';

const result = await generateText({
  model: claudeCode('claude-sonnet-4-0', {
    options: {
      allowedTools: [
        'Read', 'Write', 'Edit', 'MultiEdit',
        'Bash', 'Glob', 'Grep',
        'WebFetch', 'WebSearch',
        'Task', 'TodoWrite'
      ],
    },
  }),
  tools: getAllClaudeCodeTools(), // 全13ツール
  prompt: 'Help me analyze and refactor my codebase',
});
```

---

## 注意事項

### 現在の対応状況

✅ **対応済み**
- `generateText` - テキスト生成
- `streamText` - ストリーミングテキスト生成
- AI SDK v5 LanguageModelV2仕様

❌ **未対応**
- `generateObject` - オブジェクト生成
- `streamObject` - ストリーミングオブジェクト生成

---

## トラブルシューティング

| 問題 | 解決方法 |
|------|----------|
| **ツールエラー** | Claude Code CLIが正しくインストール・設定されているか確認 |
| **ファイルアクセス** | `additionalDirectories`オプションにディレクトリを追加 |
| **権限の問題** | Claude Codeがプロジェクトディレクトリにアクセス可能か確認 |

---

## ユースケース

### 1. コード生成とリファクタリング
- React/Vue コンポーネント生成
- 既存コードのリファクタリング提案
- テストコード自動生成

### 2. ドキュメント作成
- README.md 自動生成
- API ドキュメント作成
- コメント追加

---

## ユースケース（続き）

### 3. コード分析
- コードベース構造の分析
- 依存関係の可視化
- セキュリティ脆弱性チェック

### 4. プロジェクト管理
- タスク管理（TodoWrite）
- サブタスク実行（Task）
- Web情報収集（WebFetch, WebSearch）

---

## 技術スタック

- **@anthropic-ai/claude-agent-sdk** - Claude Agent SDK
- **@ai-sdk/provider-utils** - AI SDK プロバイダーユーティリティ
- **ai** - Vercel AI SDK
- **TypeScript** - 型安全な開発

---

## ライセンスとコントリビューション

### ライセンス
MIT License

### コントリビューション
プルリクエスト歓迎！

**リポジトリ**: https://github.com/sakaritoru/ai-sdk-cc-provider

---

## まとめ

AI SDK Claude Code Provider で実現できること：

✨ **強力な開発ツール** - 13種類の組み込みツール
🎯 **柔軟な設定** - プロジェクトに合わせたカスタマイズ
🚀 **高速開発** - ストリーミングと推論モードで効率化
🔧 **統合が簡単** - Vercel AI SDKとシームレスに連携

---

# ありがとうございました

**AI SDK Claude Code Provider**

📦 npm: `npm install ai-sdk-cc-provider`
🔗 GitHub: https://github.com/sakaritoru/ai-sdk-cc-provider
📖 ドキュメント: README.md参照

質問はお気軽にどうぞ！
