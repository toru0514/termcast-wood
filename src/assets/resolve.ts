import type { Scene } from '../types.js';
import type { VisualName } from '../scene/visuals.js';

/**
 * 木材版（README §3.5.1）: 各 visual が必要とする実写素材の枚数。
 * photo_compare だけ 2 枚（並べて違いを見せる）、テロップ系は 0 枚。
 */
export const ASSET_SLOTS: Record<VisualName, number> = {
  photo_compare: 2,
  grain_closeup: 1,
  cross_section: 1,
  process_clip: 1,
  wood_title: 0,
  wood_caption: 0,
};

/** visual が必要とする素材枚数（未知の visual は 0 扱い） */
export function slotsFor(visual: string): number {
  return ASSET_SLOTS[visual as VisualName] ?? 0;
}

/**
 * 用意できた素材（public 相対名）をシーンへ割り当てる純粋関数。
 * - 素材が無ければ全シーン assets:[]（→ レンダラーがプレースホルダ表示）。
 * - 素材が足りない場合は先頭から循環して埋め、写真系シーンが空にならないようにする。
 */
export function assignAssets(scenes: Scene[], available: string[]): Scene[] {
  if (available.length === 0) {
    return scenes.map((s) => ({ ...s, assets: [] }));
  }
  let cursor = 0;
  const next = (): string => {
    const a = available[cursor % available.length];
    cursor += 1;
    return a;
  };
  return scenes.map((s) => {
    const slots = slotsFor(s.visual);
    const assets = Array.from({ length: slots }, () => next());
    return { ...s, assets };
  });
}

/** その用語が「素材十分」か（写真系シーンを満たせる枚数があるか）を判定する */
export function hasEnoughAssets(scenes: Scene[], available: string[]): boolean {
  const need = scenes.reduce((max, s) => Math.max(max, slotsFor(s.visual)), 0);
  return available.length >= need && need > 0;
}
