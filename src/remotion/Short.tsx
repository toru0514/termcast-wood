import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import type { Scene, SceneFile } from '../types.js';
import { isVisualName } from '../scene/visuals.js';
import { theme, VIDEO } from './theme.js';
import { VISUAL_REGISTRY } from './visuals/index.js';

const fallbackDuration = 4;

function sceneFrames(scene: Scene, fps: number): number {
  return Math.max(1, Math.round((scene.durationSec ?? fallbackDuration) * fps));
}

const BrandHeader: React.FC<{ term: string }> = ({ term }) => (
  <div
    style={{
      position: 'absolute',
      top: 70,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      zIndex: 10,
    }}
  >
    <div
      style={{
        padding: '10px 28px',
        borderRadius: 999,
        background: theme.color.overlay,
        color: theme.color.onPhoto,
        fontFamily: theme.fontFamily,
        fontSize: theme.fontSize.sub,
        fontWeight: 700,
        letterSpacing: 2,
      }}
    >
      🪵 サクッと木材用語 ｜ {term}
    </div>
  </div>
);

const Caption: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 320,
        left: 50,
        right: 50,
        display: 'flex',
        justifyContent: 'center',
        opacity,
        zIndex: 10,
      }}
    >
      <div
        style={{
          padding: '20px 36px',
          borderRadius: 24,
          background: theme.color.overlay,
          textAlign: 'center',
          fontFamily: theme.fontFamily,
          fontSize: theme.fontSize.caption,
          fontWeight: 800,
          color: theme.color.onPhoto,
          textShadow: '0 4px 18px rgba(0,0,0,0.45)',
        }}
      >
        {scene.caption}
      </div>
    </div>
  );
};

/** 木材版では投資系免責は不要。任意のクレジット等が入った場合のみ表示する。 */
const FooterNote: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      position: 'absolute',
      bottom: 60,
      left: 0,
      right: 0,
      textAlign: 'center',
      fontFamily: theme.fontFamily,
      fontSize: theme.fontSize.disclaimer,
      color: theme.color.onPhoto,
      opacity: 0.8,
      zIndex: 10,
    }}
  >
    {text}
  </div>
);

const SceneView: React.FC<{ scene: Scene; term: string }> = ({ scene, term }) => {
  const Visual = isVisualName(scene.visual)
    ? VISUAL_REGISTRY[scene.visual]
    : VISUAL_REGISTRY.wood_title;
  // wood_title / wood_caption は visual 自体が大きく文字を見せるため、下部テロップの重複を抑止する
  const showCaption = scene.visual !== 'wood_caption' && scene.visual !== 'wood_title';
  return (
    <AbsoluteFill>
      <Visual scene={scene} term={term} />
      {showCaption ? <Caption scene={scene} /> : null}
    </AbsoluteFill>
  );
};

export const Short: React.FC<SceneFile> = ({ scenes, term, disclaimer, audioFile }) => {
  let acc = 0;
  const placed = scenes.map((scene) => {
    const from = acc;
    const frames = sceneFrames(scene, VIDEO.fps);
    acc += frames;
    return { scene, from, frames };
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 35%, ${theme.color.bgAccent}, ${theme.color.bg})`,
      }}
    >
      {audioFile ? <Audio src={staticFile(audioFile)} /> : null}
      <BrandHeader term={term} />
      {placed.map(({ scene, from, frames }) => (
        <Sequence key={scene.id} from={from} durationInFrames={frames}>
          <SceneView scene={scene} term={term} />
        </Sequence>
      ))}
      {disclaimer ? <FooterNote text={disclaimer} /> : null}
    </AbsoluteFill>
  );
};

/** inputProps から総フレーム数を算出（Remotion calculateMetadata 用） */
export function totalFrames(scenes: Scene[]): number {
  return scenes.reduce(
    (sum, s) => sum + Math.max(1, Math.round((s.durationSec ?? fallbackDuration) * VIDEO.fps)),
    0,
  );
}
