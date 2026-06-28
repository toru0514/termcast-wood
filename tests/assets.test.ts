import { describe, it, expect } from 'vitest';
import { assignAssets, slotsFor, hasEnoughAssets, ASSET_SLOTS } from '../src/assets/resolve.js';
import type { Scene } from '../src/types.js';

const scene = (id: number, visual: string): Scene => ({
  id,
  type: 'definition',
  narration: 'n',
  caption: 'c',
  visual,
  assets: [],
});

describe('slotsFor', () => {
  it('visual ごとの必要枚数を返す（未知は0）', () => {
    expect(slotsFor('photo_compare')).toBe(2);
    expect(slotsFor('grain_closeup')).toBe(1);
    expect(slotsFor('wood_title')).toBe(0);
    expect(slotsFor('unknown')).toBe(0);
  });
});

describe('assignAssets', () => {
  it('素材が無ければ全シーン空配列', () => {
    const scenes = [scene(1, 'photo_compare'), scene(2, 'grain_closeup')];
    const out = assignAssets(scenes, []);
    expect(out.every((s) => s.assets.length === 0)).toBe(true);
  });

  it('必要枚数ぶん順に割り当てる', () => {
    const scenes = [scene(1, 'photo_compare'), scene(2, 'grain_closeup')];
    const out = assignAssets(scenes, ['a.jpg', 'b.jpg', 'c.jpg']);
    expect(out[0].assets).toEqual(['a.jpg', 'b.jpg']); // photo_compare は2枚
    expect(out[1].assets).toEqual(['c.jpg']); // grain_closeup は1枚
  });

  it('素材が足りなければ循環して埋める（写真系が空にならない）', () => {
    const scenes = [scene(1, 'photo_compare'), scene(2, 'grain_closeup')];
    const out = assignAssets(scenes, ['only.jpg']);
    expect(out[0].assets).toEqual(['only.jpg', 'only.jpg']);
    expect(out[1].assets).toEqual(['only.jpg']);
  });

  it('テロップ系（0枚）は割り当てない', () => {
    const out = assignAssets([scene(1, 'wood_caption')], ['a.jpg']);
    expect(out[0].assets).toEqual([]);
  });
});

describe('hasEnoughAssets', () => {
  it('最大必要枚数を満たすか判定する', () => {
    const scenes = [scene(1, 'photo_compare'), scene(2, 'grain_closeup')];
    expect(hasEnoughAssets(scenes, ['a.jpg', 'b.jpg'])).toBe(true);
    expect(hasEnoughAssets(scenes, ['a.jpg'])).toBe(false);
  });

  it('写真を一切使わない構成は false（揃える対象が無い）', () => {
    expect(hasEnoughAssets([scene(1, 'wood_caption')], ['a.jpg'])).toBe(false);
  });

  it('ASSET_SLOTS は全 visual を網羅する', () => {
    expect(Object.keys(ASSET_SLOTS).sort()).toEqual(
      ['cross_section', 'grain_closeup', 'photo_compare', 'process_clip', 'wood_caption', 'wood_title'].sort(),
    );
  });
});
