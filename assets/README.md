# assets/ — 実写素材の置き場（木材版の要）

木材版は実写が主役です（README §3.5）。用語ごとの写真・短い動画クリップをここに置き、
`data/assets.manifest.json`（または Supabase の `termcast_wood_assets` テーブル）で用語に紐づけます。

## 使い方

1. 用語に対応する写真／動画を撮影し、このフォルダに入れる（例: `masame_01.jpg`）。
2. `data/assets.manifest.json` にファイル名を登録する。

   ```json
   { "柾目": ["masame_01.jpg", "itame_01.jpg"] }
   ```
3. `npm run assets:check` で各用語の素材充足状況を確認する。
4. `npm run generate` 時に、用語に対応する素材が `src/remotion/public/assets/` へ自動コピーされ、
   シーンへ割り当てられます。

## visual ごとの必要枚数

| visual | 枚数 | 用途 |
|--------|------|------|
| `photo_compare` | 2 | 2枚を並べて違いを示す（柾目 vs 板目 など） |
| `grain_closeup` | 1 | 木目・質感のクローズアップ |
| `cross_section` | 1 | 断面で構造を説明 |
| `process_clip` | 1 | 加工・仕上げの実写（写真 or 動画） |
| `wood_title` / `wood_caption` | 0 | 素材不要（テロップ主体） |

動画は `.mp4 / .mov / .webm / .m4v` を自動判別します。

## 注意

- **素材の用意は手作業**であり、完全自動にならない現実的なボトルネックです（README §5）。
  素材ストックを先行整備しておくほど量産がスムーズになります。
- 著作権・肖像の都合上、**自前撮影素材のみ**を使ってください（拾い物は混入させない）。
- 素材が未整備の用語はプレースホルダ（木目風の背景）でレンダリングされ、パイプライン自体は完走します。
  本番投稿前に素材を揃えること。`WOOD_REQUIRE_ASSETS=1` にすると素材ゼロの用語を生成キューから除外できます。
- 実体ファイル（画像・動画）は `.gitignore` 済みです。マニフェストと本 README のみコミットされます。
