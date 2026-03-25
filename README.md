# AI Image Prompt Manager

画像生成AIのプロンプトと生成結果を管理・閲覧するためのローカルWebアプリケーション。

## 機能

### プロンプトジェネレーター

- **3カラムレイアウト**: 入力 / 人間用表示 / AI用表示
- **入力セット**: タイトル・プロンプト・BREAKチェックを持つセットを複数管理
- **セット操作**: 追加・削除・並び替え・クリア
- **個別保存/呼び出し**: プロンプトを説明文・サンプル画像付きで保存し、検索して呼び出し
- **全体保存/呼び出し**: 複数セットをバンドルとしてまとめて保存・呼び出し
- **全文検索**: FTS5による高速検索（日本語対応）

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS v4 |
| Backend | Express 5 + TypeScript |
| DB | Node.js built-in SQLite (node:sqlite) + FTS5 |
| Image | ディスク保存（data/images/、UUIDファイル名） |
| Test | Vitest + Testing Library + supertest |

## セットアップ

```bash
# 依存インストール
npm install

# 開発サーバー起動（フロントエンド + バックエンド同時）
npm run dev
```

- フロントエンド: http://localhost:5173
- バックエンド: http://localhost:3000

## スクリプト

```bash
npm run dev          # 開発サーバー起動
npm run build        # プロダクションビルド
npm test             # 全テスト実行
npm run test:server  # サーバーテストのみ
npm run test:client  # クライアントテストのみ
```

## プロジェクト構成

```
ai-image-prompt-manager/
├── package.json          # ルート（npm workspaces）
├── client/               # Frontend (Vite + React)
│   └── src/
│       ├── components/   # UIコンポーネント
│       ├── hooks/        # カスタムフック
│       └── types/        # 型定義
├── server/               # Backend (Express)
│   └── src/
│       ├── db/           # DB接続・スキーマ
│       ├── routes/       # APIルート
│       └── middleware/   # Multerアップロード
└── data/                 # ランタイムデータ（.gitignore済）
    ├── db.sqlite
    └── images/
```

## API

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | `/api/prompts?q=&limit=&offset=` | プロンプト一覧/検索 |
| GET | `/api/prompts/:id` | プロンプト個別取得 |
| POST | `/api/prompts` | プロンプト保存 |
| PUT | `/api/prompts/:id` | プロンプト更新 |
| DELETE | `/api/prompts/:id` | プロンプト削除 |
| GET | `/api/bundles?q=&limit=&offset=` | バンドル一覧/検索 |
| GET | `/api/bundles/:id` | バンドル個別取得 |
| POST | `/api/bundles` | バンドル保存 |
| PUT | `/api/bundles/:id` | バンドル更新 |
| DELETE | `/api/bundles/:id` | バンドル削除 |
| GET | `/api/images/:filename` | 画像配信 |
