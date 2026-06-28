import 'dotenv/config';

/** 環境変数を一箇所に集約。未設定はフォールバック判定に使う。 */
export const config = {
  supabase: {
    // 借用プロジェクトでは NEXT_PUBLIC_SUPABASE_URL 名で持っていることが多いので両対応
    url: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    key: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    // 間借り先の既存テーブルと衝突しないよう名前空間化（木材版は termcast_wood_terms）
    table: process.env.SUPABASE_TERMS_TABLE ?? 'termcast_wood_terms',
    // 木材版で新規: 用語と実写素材を紐づけるテーブル（README §3.5.1）
    assetsTable: process.env.SUPABASE_ASSETS_TABLE ?? 'termcast_wood_assets',
    get enabled() {
      return Boolean(this.url && this.key);
    },
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? '',
    model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
    get enabled() {
      return Boolean(this.apiKey);
    },
  },
  voicevox: {
    url: process.env.VOICEVOX_URL ?? 'http://127.0.0.1:50021',
    // 木材版トーン（やわらかい・素朴な語り口）に寄せた既定話者。
    speaker: Number(process.env.VOICEVOX_SPEAKER ?? '8'),
    // 話速（1.0=標準）。落ち着いた語り口のため標準速。
    speed: Number(process.env.VOICEVOX_SPEED ?? '1.0'),
  },
  render: {
    // 各シーンの後ろに入れる無音の「間」（秒）。尺を20秒前後に伸ばしつつ間を作る。
    scenePadSec: Number(process.env.SCENE_PAD_SEC ?? '0.8'),
  },
  youtube: {
    // YouTube Data API v3（OAuth）。gws は YouTube 非対応のため別経路。
    // ★木材版は YouTube アカウントのみ別物。client_secret は別チャンネル用の OAuth クライアントを指定し、
    //   refresh token は npm run youtube:auth で取り直すこと（README §9.6）。
    upload: ['1', 'true', 'yes'].includes((process.env.YOUTUBE_UPLOAD ?? '').toLowerCase()),
    privacy: process.env.YOUTUBE_PRIVACY ?? 'public',
    categoryId: process.env.YOUTUBE_CATEGORY_ID ?? '27', // 27 = Education
    refreshToken: process.env.YOUTUBE_REFRESH_TOKEN ?? '',
    clientSecretPath:
      process.env.YOUTUBE_CLIENT_SECRET_FILE ?? resolve(homedir(), '.config/gws/client_secret.json'),
    get enabled() {
      return this.upload && Boolean(this.refreshToken);
    },
  },
  tiktok: {
    accessToken: process.env.TIKTOK_ACCESS_TOKEN ?? '',
    get enabled() {
      return Boolean(this.accessToken);
    },
  },
  drive: {
    // 認証は gws CLI（keyring）が持つため folderId だけでよい
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID ?? '',
    get enabled() {
      return Boolean(this.folderId);
    },
  },
  assets: {
    // 木材版で新規（README §3.5.1）: 実写素材が主役。
    // true なら「素材が1枚も無い用語は生成キューに乗せない」ガードを有効化する。
    // 既定は false（素材未整備でもプレースホルダで完走できるようにするため）。
    require: ['1', 'true', 'yes'].includes((process.env.WOOD_REQUIRE_ASSETS ?? '').toLowerCase()),
  },
};

/** リポジトリルートからの主要パス */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { homedir } from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(here, '..');
export const paths = {
  root: ROOT,
  output: resolve(ROOT, 'output'),
  video: resolve(ROOT, 'video'),
  scene: resolve(ROOT, 'scene'),
  remotionEntry: resolve(ROOT, 'src/remotion/index.ts'),
  remotionPublic: resolve(ROOT, 'src/remotion/public'),
  // 木材版で新規: 実写素材の置き場と、レンダリング時に参照する公開先
  assetsSource: resolve(ROOT, 'assets'),
  remotionAssets: resolve(ROOT, 'src/remotion/public/assets'),
  assetsManifest: resolve(ROOT, 'data/assets.manifest.json'),
  seed: resolve(ROOT, 'data/terms.seed.json'),
  used: resolve(ROOT, 'data/used.json'),
};
