# 木材用語解説ショート動画 自動生成パイプライン

木材・木工の初心者向けに、専門用語（柾目と板目、無垢材と集成材、銘木の種類 など）を1語ずつ
20秒前後で解説する縦型ショート動画を、可能な限り自動で生成し、毎日1本
YouTube / TikTok / Instagram リールの3媒体へ配信するパイプラインです。縦型1本を3媒体で使い回します。

> 本リポジトリは株版 `termcast-app` の骨格（Supabase 用語マスタ → Gemini Flash 台本 → VOICEVOX →
> Remotion → 3媒体配信）を「お題（ドメイン）」で切り替えたものです。木材版の固有差分は実質
> **「実写素材アセット管理」** に集約されます。将来は英単語・IT用語・会計用語 などへ同じ骨格を展開でき、
> これが `termcast` 命名の狙いです。

---

## 1. 目的とスコープ

### 1.1 目的
木材・木工に関心を持ち始めた初心者向けに、専門用語を1語ずつ20秒前後で解説するショート動画を、
可能な限り自動で生成し、毎日1本 YouTube / TikTok / Instagram リールの3媒体へ配信する。

### 1.2 スコープ
- **対象**: ローカル（Mac）で完結する自動生成パイプライン。
- **対象外（後続検討）**: クラウド化、スケジューラ常駐化、収益化。まずローカルで1本通すことを優先。

### 1.3 編集方針（運営トーン）
- 「木について中立に、わかりやすく教えてくれる存在」として運営する。
- **最終的なねらいは、木に興味を持つ人を増やし、いつか木のアクセサリーや木製品を
  手に取ってもらうこと**。ただし**直接の販促・誘導は一切書かない**。
- 伝えるのは「木は綺麗」「種類がたくさんある」「奥が深い・面白い」という驚きと魅力。
  視聴後に「木っていいな」「触れてみたい」「他の木も見てみたい」と感じてもらうのがゴール。
- 各動画は、**事実＋美しさ・多様性への気づき＋次への小さな誘い**で構成する
  （「買って」とは言わず、関心の裾野を広げる）。
- 露骨な宣伝は裾野を広げないため行わない。投資系の免責文も不要（株版との差分）。

### 1.4 非機能方針
- 各段階を疎結合に保ち、間に **シーン定義（JSON）レイヤー** を噛ませてレンダラーを抽象化する。
  将来 Remotion から別レンダラーへ差し替え可能とし、ロックインを回避する。
- 1コマンドで「ネタ選定〜MP4出力」まで通る CLI を最終形とする。アップロードのみ独立コマンドに分離（誤投稿防止）。

---

## 2. 株版（termcast-app）からの主要な差分

| 観点 | 株版 | 木材版（本リポジトリ） |
|------|------|--------|
| 映像の主役 | コードで描く**図解アニメ**（ローソク足等） | **実写素材**（木材の写真・質感・断面・作業風景） |
| 追加で必要な仕組み | なし | **実写素材アセット管理**（§3.5.1） |
| 収益化の位置づけ | 教育で集客し将来アフィリエイト/広告 | 直接収益化は主目的でない。裾野拡大が主目的 |
| 免責 | 「投資助言ではない/教育目的」を全動画に挿入 | 投資系免責は不要 |
| 用語の性質 | 概念中心（図解しか作れない） | 実物が見せられる（写真・動画映えが良い） |
| カテゴリ（category） | チャート / 指標 / 制度 等 | 木目 / 樹種 / 加工 / 仕上げ / 構造 / 道具 |
| YouTube | 株チャンネル | **木材チャンネルのみ別物**（他の認証・プロジェクトは共用） |

### 2.1 なぜ木材版は実写中心か
木材の用語は「柾目／板目」「四方柾」「うづくり」「木表／木裏」など、**実物の写真・質感・断面で
見せられる**。株の概念図解と違い、実写素材が理解と訴求の中核になる。したがって Remotion の
`visual` は図解コンポーネント中心から、**実写スライド＋テロップ中心**に差し替えてある。

---

## 3. 各コンポーネント設計

### 3.1 ①ネタ管理（Supabase）
用語マスタを Supabase に持ち、未使用のものから1語を選定する（重複防止・進捗可視化）。
テーブル構造は株版 `terms` と同一で、`category` の値だけ木材向け（木目 / 樹種 / 加工 / 仕上げ / 構造 / 道具）。

**テーブル: `termcast_wood_terms`**（間借り先と衝突しないよう名前空間化）

| カラム | 型 | 説明 |
|--------|------|------|
| id | uuid | PK |
| term | text | 用語名（例: 柾目） |
| reading | text | 読み仮名（TTS 用） |
| category | text | カテゴリ |
| difficulty | int | 難易度 1〜3 |
| status | text | `pending` / `generated` / `published` |
| published_at | timestamptz | 投稿日時 |
| youtube_video_id / tiktok_draft_id | text | 各媒体の動画ID／下書きID |
| drive_link | text | Instagram用 ドライブ共有リンク |

**選定ロジック**: `status='pending'` から `difficulty` 昇順・カテゴリ分散を考慮して1語 pick。
**初期投入**: `data/terms.seed.json`（約50語）。柾目、板目、無垢材、集成材、突板、ウォールナット、
オーク、メープル、ヒノキ、スギ、木表・木裏、芯材・辺材、含水率、反り、うづくり、面取り、ほぞ、留め、
オイルフィニッシュ、ウレタン塗装 など。

### 3.2 ②台本生成（Gemini Flash・無料枠）
仕組み・無料枠運用・`script-generator` 抽象は株版と同一。`narrator-profile` を木材版トーン
（やわらかい・素朴・職人的な語り口）に差し替えてある。

- **モデル**: Gemini 2.5 Flash 系（Pro系は2026年4月以降有料専用のため使わない）。
- **構成テンプレート**（固定4部）: フック→定義→具体例→まとめ。
  例: フック「この木目の違い、わかりますか？」→ 定義「柾目とは…」→ 具体例 → まとめ。
- 投資系の免責文はプロンプトから除外。露骨な宣伝・販促は禁止。

### 3.3 ③シーン定義レイヤー（scene.json）
レンダラー非依存の中間表現。スキーマは株版と共通だが、`visual` が実写系コンポーネント名になり、
各シーンに**素材参照 `assets`**（写真/動画クリップ名）フィールドを持つ。

```json
{
  "term": "柾目と板目",
  "category": "木目",
  "disclaimer": "",
  "scenes": [
    { "id": 1, "type": "hook", "narration": "この木目の違い、わかりますか？",
      "caption": "柾目と板目って？", "visual": "photo_compare",
      "assets": ["assets/masame_01.jpg", "assets/itame_01.jpg"] },
    { "id": 2, "type": "definition", "narration": "柾目は…",
      "caption": "まっすぐ平行な木目", "visual": "grain_closeup",
      "assets": ["assets/masame_closeup.jpg"] }
  ]
}
```

### 3.4 ④音声合成（VOICEVOX）
株版と同一。VOICEVOX をローカル起動し HTTP API 経由で WAV を生成、各シーンの尺を scene.json に
書き戻して字幕同期に使う。話者は木材版トーンに合わせて選定（既定 `VOICEVOX_SPEAKER=8`、話速 `1.1`）。

### 3.5 ⑤動画レンダリング（Remotion）
縦型1080×1920・字幕同期・テロップ自動挿入の枠組みは株版と同一。`visual` セットを
**実写スライド中心**に差し替えてある。デザイントークン（配色・フォント）は自然・素朴・温かみの世界観。

| visual | 内容 | 必要素材 |
|--------|------|----------|
| `photo_compare` | 2枚を並べ違いを示す（柾目 vs 板目 など） | 2 |
| `grain_closeup` | 木目のクローズアップにテロップを重ねる | 1 |
| `cross_section` | 断面写真で構造を説明（年輪・芯材/辺材 など） | 1 |
| `process_clip` | 加工・仕上げの実写（写真 or 動画）に解説を重ねる | 1 |
| `wood_title` | 用語タイトルカード（素材不要の導入） | 0 |
| `wood_caption` | まとめテロップ（テロップ主体） | 0 |

素材が未整備の用語は**木目風プレースホルダ**でレンダリングされ、パイプライン自体は完走する
（本番投稿前に素材を揃える）。

#### 3.5.1 素材アセット管理（木材版で新規）
実写が主役のため、用語ごとの写真・動画クリップを管理する仕組みを追加してある。

- 用語と素材を紐づける（Supabase: `termcast_wood_assets` テーブル / ローカル: `data/assets.manifest.json`）。
- 台本→シーン定義の段階で、用語に対応する素材を引き当てて scene.json に埋め込み、
  `src/remotion/public/assets/` へコピーしてレンダラーが参照する。
- `WOOD_REQUIRE_ASSETS=1` で「素材が揃っていない用語は生成キューに乗せない」ガードを有効化できる。
- **撮影素材の用意は人手が必要**。ここは完全自動にならない現実的なボトルネック。素材ストックを
  先行整備しておくほど量産がスムーズになる。詳細は `assets/README.md`。

```bash
npm run assets:check   # 各用語の素材充足状況を一覧
```

### 3.6 ⑥配信レイヤー
株版と同一（YouTube Data API v3 / TikTok 下書きモード / Instagram は Google Drive 保存）。
共通の `Publisher` インターフェースで媒体差を吸収し、1本の動画を3媒体へ分配する。

| 媒体 | 方式 | 到達地点 | 最後の人手 |
|------|------|---------|-----------|
| YouTube | Data API v3 | アップロード（既定 public） | 公開確認 |
| TikTok | Content Posting API（下書き） | アプリ下書きに送信 | 確認→投稿 |
| Instagram | Google Drive 保存 | ドライブにファイル保存 | DLして手動アップ |

> **YouTube アカウントだけ別物**にする。木材チャンネル用の OAuth クライアントを
> `YOUTUBE_CLIENT_SECRET_FILE` に指定し、`npm run youtube:auth` で木材チャンネルとして同意して
> refresh token を取り直すこと。Supabase / Gemini / Drive / VOICEVOX などは株版と同じものを共用してよい。

**Playwright について**: TikTok・Instagram は自動操作の検知が厳しいため、公式APIが使える範囲は必ず
API を優先し、画面自動操作は採用しない。

---

## 4. ディレクトリ構成

```
termcast-wood/
├── src/
│   ├── config.ts          # 環境変数・パス集約
│   ├── types.ts           # 各段階の契約（型 + zod）。Scene に assets を追加
│   ├── pick/              # ①ネタ選定（select ロジック + Supabase/ローカル store）
│   ├── script/            # ②台本生成（IF + Gemini + テンプレ。木材トーン）
│   ├── scene/             # ③シーン定義（build + 実写 visual マッピング + io）
│   ├── assets/            # ★実写素材の管理（木材版で新規: store / resolve / stage）
│   ├── tts/               # ④音声合成（VOICEVOX + macOS say + 無音モック + WAV util）
│   ├── remotion/          # ⑤レンダリング（Root / Short / visuals=実写スライド / render）
│   ├── publish/           # ⑥配信（IF + youtube / tiktok / instagram + router）
│   └── meta.ts            # 配信メタ生成
├── scripts/               # generate / publish / render / check-assets / seed / youtube-auth
├── assets/                # ★実写素材の置き場（実体は gitignore・README 参照）
├── data/                  # terms.seed.json / assets.manifest.json
├── db/                    # Supabase スキーマ + seed SQL
├── tests/                 # vitest
├── scene/                 # 生成された scene.json（gitignore）
└── output/ , video/       # 生成された成果物（gitignore）
```

---

## 5. リスクと留意点

| リスク | 内容 | 対策 |
|--------|------|------|
| 素材調達 | 実写素材の用意は手作業（律速） | 素材が揃った用語のみ生成キューへ。素材ストックを先行整備 |
| 著作権/肖像 | 拾い物素材の混入 | **自前撮影素材のみ**使用を原則とする |
| 用語の正確性 | 自動生成の誤り | 初期は台本・動画を目視確認してから投稿 |
| YouTube 規約 | 完全自動・大量投稿は低品質反復と見なされうる | 1日1本・各動画に固有価値。無確認投稿は避ける |
| レンダリング負荷 | Remotion は重い | ローカル（Mac）で実行 |
| Gemini 無料枠の改定 | 予告なく削減/廃止されうる | `script-generator` で抽象化し他モデルへ差し替え可能。課金は有効化しない |
| TikTok 審査 | 未審査クライアントは公開範囲制限 | 下書きモードで運用 |

---

## 6. 着手の順序

1. 用語マスタに初期語を投入（`data/terms.seed.json` 同梱済み）。
2. 各用語に対応する実写素材を撮影・登録（**ここが律速**。`assets/README.md` 参照）。
3. 実写スライド系 `visual` を確認し、1本を手動で通す（`npm run generate`）。
4. generate / publish フローで通し確認 → 媒体へ配信。

---

## 7. セットアップ・実行

**資格情報が無くてもオフラインで `generate` が MP4 まで完走できる**よう、各外部依存にフォールバックを
用意しています（本番は `.env` を設定すれば本物に切り替わります）。素材が無くてもプレースホルダで完走します。

### 7.1 前提
- Node.js 20 以上
- （任意）VOICEVOX をローカル起動（未起動時は macOS `say` →無音WAVモックの順でフォールバック）
- 初回 `generate` 時に Remotion が Chrome Headless Shell（約93MB）を自動ダウンロード

### 7.2 インストール
```bash
npm install
cp .env.example .env   # 必要に応じて値を設定（未設定でも動作）
```

### 7.3 1本通す（MVP）
```bash
npm run generate                 # ①ネタ選定〜⑤MP4出力 → video/<用語>_<日時>.mp4
open video/*.mp4                 # 目視確認
npm run publish                  # ⑥3媒体へ配信（未設定の媒体は skipped）
npm run publish -- --only youtube  # 媒体を絞る
npm run publish -- --dry-run     # 配信せず対象だけ確認
```

### 7.4 フォールバック早見表

| 段階 | 本番 | フォールバック（資格情報なし） |
|------|------|------------------------------|
| ①ネタ | Supabase | `data/terms.seed.json` + `data/used.json` で重複防止 |
| ②台本 | Gemini Flash | テンプレート台本生成（決定的） |
| ③.5 素材 | Supabase 素材テーブル | `data/assets.manifest.json`。未整備なら木目プレースホルダ |
| ④音声 | VOICEVOX | macOS `say` → 推定尺の無音WAV |
| ⑥配信 | YT / TikTok / Drive API | 各アダプタが `skipped` を返す |

### 7.5 抽象化の対応（設計 → コード）

| 設計上の抽象 | 実装 |
|--------------|------|
| `script-generator` | `src/script/`（`ScriptGenerator` IF + Gemini / テンプレ） |
| scene.json 中間表現 | `src/types.ts` の `SceneFile` + `src/scene/` |
| 素材アセット管理 | `src/assets/`（`AssetStore` IF + Supabase / ローカル + 引き当て/コピー） |
| `Publisher` | `src/publish/`（IF + 3アダプタ + ルーター） |
| TTS エンジン | `src/tts/`（`TtsEngine` IF + VOICEVOX / say / モック） |
| レンダラー | `src/remotion/`（`scene.json` を props に受ける単一 Composition） |

### 7.6 Supabase を使う場合
```bash
# db/schema.sql でテーブル作成（termcast_wood_terms / termcast_wood_assets）
# db/002_termcast_wood_terms.sql で用語を投入（再生成: npm run seed:sql）
# .env に SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY を設定すると自動で Supabase ストアに切り替わる
```

### 7.7 その他コマンド
```bash
npm test               # 純ロジックのテスト（選定/シーン/素材/WAV/配信ルーティング）
npm run typecheck      # 型チェック
npm run remotion:studio  # Remotion Studio で実写スライドをプレビュー
npm run render         # 既存の scene/scene.json から動画だけ再生成
npm run assets:check   # 各用語の素材充足状況を一覧
```

### 7.8 日次運用（ローカル）
当面は手動で `generate` → 確認 → `publish`。安定後は `scripts/daily-run.sh` を cron / launchd で
毎朝自動実行し、生成物を確認してから `publish` する半自動運用へ。完全自動化（無確認投稿）は
品質・素材リスクを踏まえ慎重に判断する。

---

## 8. 技術スタック

| 段階 | 技術 |
|------|------|
| ネタ管理 | Supabase |
| 台本生成 | Gemini Flash（無料枠） |
| シーン定義 | 自前（TypeScript / JSON） |
| 素材管理 | Supabase Storage / ローカル assets/（木材版で新規） |
| 音声合成 | VOICEVOX（ローカル・無料） |
| 動画レンダリング | Remotion（React） |
| 配信 | YouTube Data API v3 / TikTok Content Posting API / Google Drive |
| 言語 | TypeScript |
