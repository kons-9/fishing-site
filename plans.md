# 釣り記録サイト 実装計画 (plans.md)

> **前提**: 本ドキュメントは [readme.md](./readme.md) で定義された要件・データモデルを受け、具体的な実装方針を定めるものです。

---

## 1. 技術スタック選定

| レイヤー | 選定技術 | 選定理由 |
|---|---|---|
| **フレームワーク** | **Astro** | 静的サイト生成 (SSG) に特化。Markdown/MDX をファーストクラスでサポートし、Content Collections でフィールドバリデーションが可能。GitHub Pages との相性が良い |
| **テンプレート / UI** | Astro コンポーネント (`.astro`) | React 等のランタイムを不要とし、ゼロ JS を実現。必要に応じて Islands Architecture で部分的にインタラクティブ化も可能 |
| **スタイリング** | Vanilla CSS (CSS Custom Properties) | フレームワーク非依存でパフォーマンスに優れる。デザイントークンを CSS 変数で一元管理 |
| **デプロイ** | GitHub Actions → GitHub Pages | `astro build` → `dist/` を Pages にデプロイ。push 時に自動ビルド |
| **データ管理** | Markdown + YAML Frontmatter (Content Collections) | Git で履歴管理。CMS 不要でポータブル |
| **画像最適化** | `astro:assets` (Sharp) | ビルド時に自動リサイズ・WebP 変換 |

> [!NOTE]
> Astro の Content Collections を使うことで、readme.md で定義した各フィールドを **Zod スキーマとしてバリデーション** できます。データの入力ミスをビルド時に検知できる点が大きなメリットです。

---

## 2. ディレクトリ構成

```
fishing-site/
├── astro.config.mjs          # Astro 設定
├── package.json
├── tsconfig.json
├── public/
│   ├── favicon.svg
│   └── images/               # そのまま配信する静的画像
├── src/
│   ├── assets/               # ビルド時最適化される画像
│   │   ├── gear/             # 道具写真
│   │   └── diary/            # 釣行写真
│   ├── content/
│   │   ├── config.ts         # Content Collections スキーマ定義
│   │   ├── gear/             # 道具データ (*.md)
│   │   └── diary/            # 釣り日記データ (*.md)
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── GearCard.astro    # 道具カード
│   │   ├── DiaryCard.astro   # 日記カード (一覧用)
│   │   ├── StarRating.astro  # ★評価表示
│   │   └── TagBadge.astro    # 分類タグ表示
│   ├── layouts/
│   │   └── BaseLayout.astro  # 共通レイアウト (HTML head, nav, footer)
│   ├── pages/
│   │   ├── index.astro       # ホーム
│   │   ├── gear/
│   │   │   ├── index.astro   # 道具一覧
│   │   │   └── [slug].astro  # 道具詳細 (動的ルート)
│   │   └── diary/
│   │       ├── index.astro   # 日記一覧
│   │       └── [slug].astro  # 日記詳細 (動的ルート)
│   └── styles/
│       ├── global.css        # リセット・デザイントークン
│       └── components.css    # コンポーネント固有スタイル
├── .github/
│   └── workflows/
│       └── deploy.yml        # GitHub Actions デプロイ
├── readme.md
└── plans.md                  # ← 本ファイル
```

---

## 3. データモデル設計 (Content Collections スキーマ)

### 3-1. 道具 (Gear) コレクション

```typescript
// src/content/config.ts
import { defineCollection, z, reference } from 'astro:content';

const gearCollection = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    // --- 必須フィールド (readme.md 定義) ---
    name:       z.string(),                           // 道具の名称
    category:   z.enum([
      'rod', 'reel', 'lure', 'rig', 'wear', 'accessory'
    ]),                                                // 道具の分類
    targetFish: z.array(z.string()),                  // 対象の魚分類 (複数可)

    // --- 追加フィールド (readme.md 追加提案) ---
    brand:      z.string().optional(),                // メーカー / ブランド
    photo:      image().optional(),                   // 写真 (astro:assets)
    specs:      z.record(z.string()).optional(),      // スペック詳細 (キー: 値)
    rating:     z.number().min(1).max(5).optional(),  // 評価 (1-5)
    review:     z.string().optional(),                // レビュー / メモ

    // --- 管理用 ---
    purchaseDate: z.coerce.date().optional(),         // 購入日
    price:        z.number().optional(),              // 購入価格
    draft:        z.boolean().default(false),         // 下書きフラグ
  }),
});
```

#### Gear Markdown 例

```markdown
---
name: "ツインパワー C3000XG"
category: "reel"
targetFish: ["シーバス", "青物"]
brand: "シマノ"
photo: "./images/twinpower-c3000xg.jpg"
specs:
  自重: "230g"
  ギア比: "6.4"
  最大ドラグ力: "9.0kg"
  糸巻量: "PE1.5号-200m"
rating: 5
review: "巻き心地が最高。剛性も申し分なくシーバスから中型青物まで余裕。"
purchaseDate: 2025-03-15
price: 42000
---

ツインパワー C3000XG の詳細レビュー本文をここに書く...
```

### 3-2. 釣り日記 (Diary) コレクション

```typescript
const diaryCollection = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    // --- 必須フィールド (readme.md 定義) ---
    date:       z.coerce.date(),                      // 日付
    timeRange:  z.string(),                           // 時間帯 (例: "5:00 - 10:00")
    location:   z.string(),                           // 場所
    target:     z.string(),                           // 狙い (本命ターゲット)
    catches:    z.array(z.object({                    // 釣果 (複数匹対応)
      species:  z.string(),                           //   魚種
      size:     z.string().optional(),                //   サイズ
      count:    z.number().default(1),                //   数
    })).default([]),                                   // 空配列 = ボウズ
    tide:       z.object({                            // 潮回り / 潮の流れ
      type:     z.enum([
        '大潮', '中潮', '小潮', '長潮', '若潮'
      ]),
      flow:     z.string().optional(),                //   実際の潮の動き方
    }),

    // --- 追加フィールド (readme.md 追加提案) ---
    weather:    z.string().optional(),                // 天気
    temperature: z.object({                           // 気温・水温
      air:      z.number().optional(),
      water:    z.number().optional(),
    }).optional(),
    wind:       z.object({                            // 風向・風速
      direction: z.string().optional(),
      speed:     z.number().optional(),               // m/s
    }).optional(),
    hitLure:    z.string().optional(),                // ヒットルアー / エサ
    gear:       z.array(reference('gear')).optional(),// 使用タックル (※ リレーション)
    photos:     z.array(image()).optional(),           // 写真 (複数枚)

    // --- 管理用 ---
    draft:      z.boolean().default(false),
  }),
});
```

> [!IMPORTANT]
> **道具 ⇔ 日記のリレーション**は `reference('gear')` で実現します。日記の Frontmatter に道具の slug を配列で記述することで、ビルド時に型安全な参照が保証されます。

#### Diary Markdown 例

```markdown
---
date: 2025-04-20
timeRange: "5:00 - 10:00"
location: "東京湾奥・荒川河口"
target: "シーバス"
catches:
  - species: "シーバス"
    size: "62cm"
    count: 1
  - species: "シーバス"
    size: "45cm"
    count: 1
tide:
  type: "大潮"
  flow: "下げ潮が効き始めたタイミングで反応あり"
weather: "曇り"
temperature:
  air: 18
  water: 16
wind:
  direction: "南南西"
  speed: 3
hitLure: "VJ-16 ブルーブルー"
gear:
  - twinpower-c3000xg
  - lateo-96ml
photos:
  - ./images/2025-04-20-seabass-62.jpg
---

朝マヅメから河口域をランガン。下げ始めの流れが効いたタイミングで
橋脚周りのヨレにVJ-16を通したら一発で食った...
```

---

## 4. 道具 ⇔ 日記 リレーション設計

readme.md 補足事項で挙がっていた設計ポイントを以下のように解決します。

| 方針 | 詳細 |
|---|---|
| **参照方向** | 日記 → 道具 (日記の `gear` フィールドから道具 slug を参照) |
| **実装方法** | Astro Content Collections の `reference()` 関数 |
| **型安全性** | ビルド時に参照先の存在チェック。存在しない slug はビルドエラー |
| **UI 表現** | 日記詳細ページに「使用タックル」セクションを設け、道具詳細へのリンクカードを表示 |
| **逆引き** | 道具詳細ページに「この道具を使った釣行」セクションを表示 (ビルド時にクエリ) |

---

## 5. ページ設計 & UI/UX 方針

### 5-1. ホームページ (`/`)

- **ヒーローセクション**: サイトタイトル + キャッチコピー + 背景に釣り風景のフル幅画像
- **最新の釣り日記**: 新着順に 3〜5 件をカードで表示
- **最近更新された道具**: 更新日順に 3〜5 件をカードで表示
- **フッター**: サイト情報・GitHub リンク

### 5-2. 道具一覧 (`/gear/`)

- **フィルタ**: 分類 (ロッド/リール/ルアー…) × 対象魚種 のマルチフィルタ
- **表示**: カードグリッド (レスポンシブ: 1列 → 2列 → 3列)
- **ソート**: 名前順 / 評価順 / 追加日順

### 5-3. 道具詳細 (`/gear/[slug]`)

- 写真 (メインビジュアル)
- 基本情報テーブル (スペック)
- ★評価 + レビューテキスト
- 「この道具を使った釣行」セクション (リレーション逆引き)

### 5-4. 日記一覧 (`/diary/`)

- **タイムライン表示**: 日付降順
- **フィルタ**: 魚種 / 場所 / 期間
- **サマリカード**: 日付・場所・釣果サマリ・サムネイル

### 5-5. 日記詳細 (`/diary/[slug]`)

- 環境情報セクション (天気・潮・風などをアイコン + テキストで一目で把握)
- 釣果テーブル (魚種・サイズ・数)
- 使用タックル (道具カードへのリンク)
- 写真ギャラリー
- 所感 / 反省テキスト

### 5-6. デザイントークン (CSS 変数)

```css
:root {
  /* カラーパレット (海・自然をイメージ) */
  --color-primary:    hsl(200, 70%, 45%);   /* 深い海のブルー */
  --color-secondary:  hsl(160, 50%, 45%);   /* 浅瀬のグリーン */
  --color-accent:     hsl(35, 90%, 55%);    /* 朝焼けのオレンジ */
  --color-bg:         hsl(210, 20%, 98%);   /* ライトグレー背景 */
  --color-bg-dark:    hsl(210, 25%, 10%);   /* ダークモード背景 */
  --color-text:       hsl(210, 15%, 20%);
  --color-text-muted: hsl(210, 10%, 55%);

  /* タイポグラフィ */
  --font-heading: 'Outfit', sans-serif;
  --font-body:    'Noto Sans JP', 'Inter', sans-serif;

  /* スペーシング */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 2rem;
  --space-xl: 4rem;

  /* その他 */
  --radius: 0.75rem;
  --shadow: 0 4px 20px hsl(210 20% 50% / 0.1);
  --transition: 200ms ease;
}
```

### 5-7. レスポンシブ対応

| ブレークポイント | 幅 | レイアウト |
|---|---|---|
| モバイル | `< 640px` | 1カラム、ハンバーガーメニュー |
| タブレット | `640px – 1024px` | 2カラムグリッド |
| デスクトップ | `> 1024px` | 3カラムグリッド、サイドナビ展開 |

---

## 6. SEO & パフォーマンス

- 各ページに `<title>` と `<meta name="description">` を動的生成
- 見出し階層の厳守 (`h1` はページに 1 つ)
- セマンティック HTML (`<article>`, `<nav>`, `<main>`, `<section>`)
- OGP メタタグ (SNS シェア対応)
- `astro:assets` による画像の WebP 変換・リサイズ
- フォントは `display: swap` で読み込み

---

## 7. デプロイ (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist/
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

---

## 8. 実装ロードマップ (フェーズ)

### Phase 1: 基盤構築 🏗️
- [ ] Astro プロジェクト初期化 (`npm create astro@latest`)
- [ ] ディレクトリ構成の作成
- [ ] デザイントークン (`global.css`) 定義
- [ ] `BaseLayout.astro` + `Header` + `Footer` 作成
- [ ] Content Collections スキーマ定義 (`config.ts`)
- [ ] GitHub Actions デプロイ設定

### Phase 2: コアページ実装 📄
- [ ] ホームページ実装
- [ ] 道具一覧 / 詳細ページ実装
- [ ] 日記一覧 / 詳細ページ実装
- [ ] サンプルデータ投入 (各 2〜3 件)

### Phase 3: UI 強化 ✨
- [ ] フィルタ / ソート機能 (道具一覧)
- [ ] タイムライン表示 (日記一覧)
- [ ] ★評価コンポーネント
- [ ] レスポンシブ対応の検証・調整
- [ ] ダークモード対応

### Phase 4: 拡張機能 🚀
- [ ] OGP / SNS シェア対応
- [ ] 釣果統計ダッシュボード（月別・魚種別の集計ページ）
- [ ] 地図連携（釣り場のマップ表示）
- [ ] RSS フィード

---

## 9. 検証計画

| 検証項目 | 方法 |
|---|---|
| ビルド成功 | `npm run build` がエラーなく完了すること |
| Content Collections バリデーション | 不正な Frontmatter でビルドエラーが出ること |
| リレーション整合性 | 存在しない gear slug を diary に指定してビルドエラーになること |
| レスポンシブ | ブラウザ DevTools でモバイル・タブレット・デスクトップを確認 |
| GitHub Pages デプロイ | push 後に Pages URL でサイトが表示されること |
| Lighthouse スコア | Performance / Accessibility / SEO いずれも 90+ を目標 |

---

## 確認事項

以下の点についてフィードバックをお願いします:

1. **フレームワーク**: Astro で問題ないか（Hugo や Next.js の方が良い等の希望があれば）
2. **デザインの方向性**: 海・自然をイメージしたカラーパレットで良いか
3. **Phase 4 の優先度**: 統計ダッシュボードや地図連携は必要か、後回しで良いか
4. **ダークモード**: 対応は必要か

## 未決定事項

- サイトのドメインは `username.github.io/fishing-site` 形式で良いか？カスタムドメインの予定はあるか？
- 道具データや日記データの初期投入はどの程度の量を想定しているか？（パフォーマンスやページネーションの判断に影響）
- 写真の管理方針: リポジトリに直接コミットする想定か、外部ストレージ (Cloudinary 等) を使うか？
