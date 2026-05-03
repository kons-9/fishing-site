# 釣り記録サイト (Fishing Log Site) 概要

本プロジェクトは、釣りに関するあらゆる情報（道具の紹介、釣行日記など）を保存し、閲覧できるようにするための静的ウェブサイトです。
GitHub Pagesを利用して公開することを前提としています。

## クイックスタート (Quick Start)

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動 (localhost:4321)
npm run dev

# ビルド (デプロイ用)
npm run build
```

## 目的
* 自身の釣り道具（タックル）を整理し、コレクションや備忘録として管理する。
* いつ、どこで、どんな条件で何が釣れたか（または釣れなかったか）を記録し、今後の釣行の参考にする。

## サイト構成とデータ定義

本サイトは主に「ホーム」「道具紹介」「釣り日記」の3つのコンテンツで構成されます。今後の実装（プランニング）に向けて、各コンテンツで管理する情報のデータ定義を以下にまとめます。

### 1. 道具紹介 (Gear)
所有している、あるいはおすすめの釣り道具を分類して紹介するページです。

**データモデル定義 (Rust形式):**
```rust
struct Gear {
    name: String,               // 製品名
    category: GearCategory,     // rod, reel, lure, rig, wear, accessory
    best_targets: Vec<String>,  // 最適な対象魚
    possible_targets: Vec<String>, // 対応可能な対象魚
    brand: Option<String>,      // メーカー名
    photo: Option<PathBuf>,     // 画像パス
    specs: HashMap<String, String>, // スペック詳細 (長さ, 重さ等)
    line_capacity: Option<Vec<LineCapacity>>, // 糸巻量 (リールのみ)
    spools: Option<Vec<Spool>>, // スプール・巻糸状況 (リールのみ)
    review: Option<String>,     // 使用感・メモ
    rating: Option<u8>,         // 評価 (1-5)
    price: Option<u32>,         // 購入価格
    purchase_date: Option<Date>, // 購入日
}

struct LineCapacity {
    line_type: String, // ナイロン, PE, フロロ
    thickness: String, // 号数, lb
    length: String,    // m
}

struct Spool {
    name: String,        // スプール名 (メイン, 替え1等)
    current_line: Line,  // 現在巻いているライン
}

struct Line {
    line_type: String,
    thickness: String,
    length: String,
    memo: Option<String>,
}
```

### 2. 釣り日記 (Diary)
日々の釣行記録を保存するページです。

**データモデル定義 (Rust形式):**
```rust
struct Diary {
    title: String,              // 釣行タイトル
    start_date: Date,           // 開始日
    end_date: Date,             // 終了日 (1日の場合は開始日と同じ)
    location: String,           // 場所
    targets: Vec<String>,       // 狙った魚種
    results: Vec<CatchResult>,  // 釣果詳細
    gear_used: Vec<String>,     // 使用タックル (GearのID)
    weather: Option<String>,    // 天気・気象条件
    tide: Option<String>,       // 潮汐情報
    notes: Option<String>,      // 備考・反省点
}

struct CatchResult {
    species: String, // 魚種
    size: String,    // サイズ (cmなど)
    count: u32,      // 数
    memo: Option<String>, // ヒットルアーなど
}
```

### 3. ホーム (Home)
サイトのトップページです。サイトの入り口として、最新の情報を表示します。

* サイトのタイトルと簡単な説明
* 最新の釣り日記（新着順に数件表示）
* 最近追加・更新された道具紹介（数件表示）

---

## 運用・メンテナンスガイドライン (Maintenance Rules)

本サイトのデータを管理・更新する際は、以下のルールを遵守してください。

### 1. 道具データの相互更新ルール
ロッドやリールを新規追加、または大幅に更新した際は、必ず**相互の「相性（Compatibility）」セクションを更新**してください。

- **リールを追加・更新した場合**:
  - そのリールの本文に推奨ロッドを記述し、同時にその**ロッド側**のファイルにも新しいリールの情報を追記する。
- **ロッドを追加・更新した場合**:
  - そのロッドの本文に推奨リールを記述し、同時にその**リール側**のファイルにも新しいリールの情報を追記する。

### 2. データ品質の維持
- **一次情報の確認**: スペックやターゲットは、必ずメーカー公式サイト等の一次情報を確認して記載する。
- **ターゲットの分類**: `bestTargets`（最適）と `possibleTargets`（可能）を明確に分ける。
