import React from 'react';
import { Composition } from 'remotion';
import { DISCLAIMER, type SceneFile } from '../types.js';
import { VIDEO } from './theme.js';
import { Short, totalFrames } from './Short.js';

/** プレビュー / 単体レンダリング時の既定 props（実行時は inputProps で上書き） */
const defaultProps: SceneFile = {
  term: '柾目と板目',
  reading: 'まさめといため',
  category: '木目',
  disclaimer: DISCLAIMER,
  audioFile: undefined,
  scenes: [
    { id: 1, type: 'hook', narration: 'プレビュー', caption: 'この木目の違い、わかる？', visual: 'photo_compare', assets: [], durationSec: 4 },
    { id: 2, type: 'definition', narration: 'プレビュー', caption: 'まっすぐ平行が柾目', visual: 'photo_compare', assets: [], durationSec: 5 },
    { id: 3, type: 'example', narration: 'プレビュー', caption: '山形・タケノコ模様が板目', visual: 'grain_closeup', assets: [], durationSec: 4 },
    { id: 4, type: 'summary', narration: 'プレビュー', caption: '今日のまとめ', visual: 'wood_caption', assets: [], durationSec: 4 },
  ],
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Short"
      component={Short}
      durationInFrames={totalFrames(defaultProps.scenes)}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
      defaultProps={defaultProps}
      calculateMetadata={({ props }) => ({
        durationInFrames: totalFrames(props.scenes),
      })}
    />
  );
};
