import type { SceneFile, Term, VideoMeta } from './types.js';

/** scene.json と term から配信メタデータ（3媒体共通）を生成する */
export function buildVideoMeta(term: Term, sceneFile: SceneFile): VideoMeta {
  const summary = sceneFile.scenes.find((s) => s.type === 'definition')?.caption ?? '';
  const tags = [
    '木材',
    '木工',
    'DIY',
    '木材用語',
    term.term,
    term.category,
    '無垢材',
    '家具',
  ].filter(Boolean);

  return {
    title: `【サクッと木材用語】${term.term}とは？`,
    description: [
      `木材・木工の初心者向けに「${term.term}」をやさしく解説します。`,
      summary && `ポイント: ${summary}`,
      '',
      '#木材 #木工 #DIY #木材用語',
    ]
      .filter(Boolean)
      .join('\n'),
    tags,
    disclaimer: sceneFile.disclaimer,
  };
}

/** generate → publish 間で受け渡すマニフェスト */
export interface RunManifest {
  termId: string;
  term: string;
  video: string;
  scene: string;
  meta: VideoMeta;
  generatedAt: string;
  ttsEngine: string;
  driveFileId?: string;
  driveLink?: string;
  youtubeVideoId?: string;
  youtubeLink?: string;
}
