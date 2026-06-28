import { z } from 'zod';

/**
 * パイプライン各段階の契約（型 + zod スキーマ）。
 * scene.json を中心に据え、レンダラー・台本生成・配信を疎結合に保つ。
 *
 * 木材版の差分:
 *  - 実写が主役のため、各シーンに素材参照 `assets`（写真/動画クリップ名）を持たせる（README §3.3 / §3.5.1）。
 *  - 投資系の免責は不要。`disclaimer` は任意（既定は空）で、空なら画面に出さない。
 */

// ===== ①ネタ管理 =====
export const TermStatus = z.enum(['pending', 'generated', 'published']);
export type TermStatus = z.infer<typeof TermStatus>;

export const TermSchema = z.object({
  id: z.string(),
  term: z.string(),
  reading: z.string().default(''),
  category: z.string().default(''),
  difficulty: z.number().int().min(1).max(3).default(1),
  status: TermStatus.default('pending'),
  published_at: z.string().nullable().optional(),
  youtube_video_id: z.string().nullable().optional(),
  tiktok_draft_id: z.string().nullable().optional(),
  drive_link: z.string().nullable().optional(),
});
export type Term = z.infer<typeof TermSchema>;

// ===== ②台本生成 =====
export const SceneType = z.enum(['hook', 'definition', 'example', 'summary']);
export type SceneType = z.infer<typeof SceneType>;

/** 台本ジェネレータが返すシーン下書き（id・尺はまだ無い） */
export const SceneDraftSchema = z.object({
  type: SceneType,
  narration: z.string().min(1),
  caption: z.string().min(1),
  visual: z.string().optional(),
});
export type SceneDraft = z.infer<typeof SceneDraftSchema>;

export const ScriptResultSchema = z.object({
  term: z.string(),
  scenes: z.array(SceneDraftSchema).min(1),
});
export type ScriptResult = z.infer<typeof ScriptResultSchema>;

/** 台本生成の抽象インターフェース（Gemini / テンプレ / 将来Claude を差し替え可能に） */
export interface ScriptGenerator {
  name: string;
  generate(term: Term): Promise<ScriptResult>;
}

// ===== ③シーン定義 =====
export const SceneSchema = z.object({
  id: z.number().int().positive(),
  type: SceneType,
  narration: z.string(),
  caption: z.string(),
  visual: z.string(),
  /**
   * 木材版（README §3.3 / §3.5.1）: このシーンで使う実写素材（写真/動画クリップ）。
   * src/remotion/public/assets 配下の相対ファイル名。未割り当てなら空配列。
   */
  assets: z.array(z.string()).default([]),
  /** ④音声合成後に書き戻す再生秒数（字幕同期に使用） */
  durationSec: z.number().positive().optional(),
});
export type Scene = z.infer<typeof SceneSchema>;

export const SceneFileSchema = z.object({
  term: z.string(),
  reading: z.string().default(''),
  category: z.string().default(''),
  /** 木材版では投資系免責は不要。空なら画面に表示しない。 */
  disclaimer: z.string().default(''),
  scenes: z.array(SceneSchema).min(1),
  /** ④で生成したナレーション音声ファイル名（src/remotion/public 配下） */
  audioFile: z.string().optional(),
});
export type SceneFile = z.infer<typeof SceneFileSchema>;

// ===== ④音声合成 =====
export interface TtsResult {
  /** public ディレクトリからの相対ファイル名 */
  audioFile: string;
  /** scenes と同順の再生秒数 */
  durations: number[];
  totalSec: number;
  /** 本物のVOICEVOXを使えずモックにフォールバックしたか */
  mocked: boolean;
}

export interface TtsEngine {
  name: string;
  /** 各シーンの narration を合成し、1本のWAVと各尺を返す */
  synthesize(scenes: Scene[], outDir: string, fileName: string): Promise<TtsResult>;
}

// ===== ⑥配信 =====
export const VideoMetaSchema = z.object({
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  disclaimer: z.string().default(''),
});
export type VideoMeta = z.infer<typeof VideoMetaSchema>;

export type PublishStatus = 'ok' | 'skipped' | 'error';

export interface PublishResult {
  platform: string;
  status: PublishStatus;
  /** 動画ID / 下書きID など */
  id?: string;
  /** ドライブ共有リンク等 */
  link?: string;
  message?: string;
}

export interface VideoFile {
  path: string;
}

/** 配信の共通インターフェース（README §3.6） */
export interface Publisher {
  name: string;
  publish(video: VideoFile, meta: VideoMeta): Promise<PublishResult>;
}

/**
 * 木材版では投資系の免責は不要（README §2 差分表）。
 * 互換のためエクスポートは残すが既定は空文字。空なら動画・説明文に出さない。
 */
export const DISCLAIMER = '';
