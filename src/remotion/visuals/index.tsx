import React from 'react';
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type { Scene } from '../../types.js';
import type { VisualName } from '../../scene/visuals.js';
import { theme } from '../theme.js';

export interface VisualProps {
  scene: Scene;
  term: string;
}

const VIDEO_EXT = /\.(mp4|mov|webm|m4v)$/i;
const isVideo = (file: string): boolean => VIDEO_EXT.test(file);

const cover: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover' };

const badgeStyle: React.CSSProperties = {
  position: 'absolute',
  top: 18,
  left: 18,
  padding: '6px 16px',
  borderRadius: 999,
  background: theme.color.overlay,
  color: theme.color.onPhoto,
  fontFamily: theme.fontFamily,
  fontSize: 24,
  fontWeight: 700,
  opacity: 0.9,
};

/**
 * 素材未整備でも成立させる木目プレースホルダ（README §3.5.1 のボトルネック対策）。
 * assets/ に実写を入れて assets.manifest.json に登録すると本物の写真へ自動で切り替わる。
 */
const WoodGrain: React.FC<{ seed?: number; label?: string }> = ({ seed = 0, label }) => {
  const lines = Array.from({ length: 13 }, (_, i) => i);
  return (
    <AbsoluteFill>
      <svg width="100%" height="100%" viewBox="0 0 1080 1920" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`wg-${seed}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={theme.color.bgAccent} />
            <stop offset="100%" stopColor={theme.color.accent} />
          </linearGradient>
        </defs>
        <rect width="1080" height="1920" fill={`url(#wg-${seed})`} />
        {lines.map((i) => {
          const y = 100 + i * 140 + ((seed * 41 + i * 57) % 50);
          const amp = 26 + ((seed + i) % 5) * 16;
          const op = 0.1 + (i % 3) * 0.06;
          return (
            <path
              key={i}
              d={`M -40 ${y} Q 360 ${y - amp} 720 ${y} T 1120 ${y + amp / 2}`}
              fill="none"
              stroke={theme.color.deep}
              strokeWidth={6 + (i % 3) * 5}
              opacity={op}
            />
          );
        })}
      </svg>
      {label ? <div style={badgeStyle}>{label}</div> : null}
    </AbsoluteFill>
  );
};

/** 1枚の素材（写真 or 動画）をフィット表示。無ければプレースホルダ。 */
const Media: React.FC<{ file?: string; seed?: number; style?: React.CSSProperties }> = ({
  file,
  seed = 0,
  style,
}) => {
  if (!file) return <WoodGrain seed={seed} label="📷 素材準備中" />;
  if (isVideo(file)) {
    return <OffthreadVideo src={staticFile(file)} style={{ ...cover, ...style }} muted />;
  }
  return <Img src={staticFile(file)} style={{ ...cover, ...style }} />;
};

// ===== 1. 2枚並べて対比（柾目 vs 板目 など） =====
const PhotoCompare: React.FC<VisualProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  const panel: React.CSSProperties = { position: 'relative', flex: 1, overflow: 'hidden' };
  return (
    <AbsoluteFill style={{ flexDirection: 'column', opacity: fade, background: theme.color.bg }}>
      <div style={panel}>
        <Media file={scene.assets[0]} seed={1} />
      </div>
      <div style={{ height: 10, background: theme.color.bg }} />
      <div style={panel}>
        <Media file={scene.assets[1]} seed={2} />
      </div>
    </AbsoluteFill>
  );
};

// ===== 2. 木目・質感のクローズアップ（ゆっくりズーム） =====
const GrainCloseup: React.FC<VisualProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 150], [1.0, 1.1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: theme.color.bg, overflow: 'hidden' }}>
      <div style={{ width: '100%', height: '100%', transform: `scale(${scale})` }}>
        <Media file={scene.assets[0]} seed={3} />
      </div>
    </AbsoluteFill>
  );
};

// ===== 3. 断面で構造を説明 =====
const CrossSection: React.FC<VisualProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 16 } });
  return (
    <AbsoluteFill
      style={{
        background: theme.color.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 920,
          height: 1180,
          transform: `scale(${0.9 + pop * 0.1})`,
          borderRadius: 28,
          overflow: 'hidden',
          border: `10px solid ${theme.color.line}`,
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
        }}
      >
        <Media file={scene.assets[0]} seed={4} />
      </div>
    </AbsoluteFill>
  );
};

// ===== 4. 加工・仕上げの実写クリップ =====
const ProcessClip: React.FC<VisualProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [0, 150], [0, -40], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: theme.color.bg, overflow: 'hidden' }}>
      <div style={{ width: '100%', height: '100%', transform: `translateX(${x}px) scale(1.06)` }}>
        <Media file={scene.assets[0]} seed={5} />
      </div>
    </AbsoluteFill>
  );
};

// ===== 5. 用語タイトルカード（導入。素材が無くても成立） =====
const WoodTitle: React.FC<VisualProps> = ({ term }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 13 } });
  return (
    <AbsoluteFill>
      <WoodGrain seed={term.length} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', transform: `scale(${pop})` }}>
          <div
            style={{
              fontFamily: theme.fontFamily,
              fontSize: 36,
              fontWeight: 700,
              color: theme.color.deep,
              letterSpacing: 4,
              marginBottom: 24,
            }}
          >
            きょうの木のことば
          </div>
          <div
            style={{
              fontFamily: theme.fontFamily,
              fontSize: theme.fontSize.term,
              fontWeight: 800,
              color: theme.color.text,
              padding: '20px 44px',
              background: theme.color.bgAccent,
              borderRadius: 28,
              border: `6px solid ${theme.color.accent}`,
              boxShadow: '0 16px 40px rgba(0,0,0,0.18)',
            }}
          >
            {term}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ===== 6. まとめテロップ（テロップ主体） =====
const WoodCaption: React.FC<VisualProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' });
  const y = interpolate(frame, [0, 14], [30, 0], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill>
      <WoodGrain seed={scene.id + 7} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            fontFamily: theme.fontFamily,
            fontSize: 60,
            fontWeight: 800,
            color: theme.color.text,
            maxWidth: 860,
            textAlign: 'center',
            lineHeight: 1.5,
            opacity,
            transform: `translateY(${y}px)`,
            padding: '40px 48px',
            background: theme.color.bgAccent,
            borderRadius: 28,
            boxShadow: '0 16px 40px rgba(0,0,0,0.18)',
          }}
        >
          {scene.caption}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const VISUAL_REGISTRY: Record<VisualName, React.FC<VisualProps>> = {
  photo_compare: PhotoCompare,
  grain_closeup: GrainCloseup,
  cross_section: CrossSection,
  process_clip: ProcessClip,
  wood_title: WoodTitle,
  wood_caption: WoodCaption,
};
