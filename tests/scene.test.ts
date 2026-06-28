import { describe, it, expect } from 'vitest';
import { buildSceneFile, applyDurations } from '../src/scene/build.js';
import { suggestVisual, normalizeVisual } from '../src/scene/visuals.js';
import { DISCLAIMER, type ScriptResult, type Term } from '../src/types.js';

const term: Term = {
  id: 'masame',
  term: '柾目',
  reading: 'まさめ',
  category: '木目',
  difficulty: 1,
  status: 'pending',
};

const script: ScriptResult = {
  term: '柾目',
  scenes: [
    { type: 'hook', narration: 'n1', caption: 'c1' },
    { type: 'definition', narration: 'n2', caption: 'c2' },
  ],
};

describe('buildSceneFile', () => {
  it('id 連番・disclaimer・visual・assets を付与する', () => {
    const sf = buildSceneFile(term, script);
    expect(sf.scenes.map((s) => s.id)).toEqual([1, 2]);
    expect(sf.disclaimer).toBe(DISCLAIMER);
    // 柾目は対比できる用語なので hook/definition とも photo_compare
    expect(sf.scenes[0].visual).toBe('photo_compare');
    expect(sf.scenes[1].visual).toBe('photo_compare');
    // 素材は未割り当ての既定で空配列
    expect(sf.scenes[0].assets).toEqual([]);
  });
});

describe('applyDurations', () => {
  it('尺と audioFile を書き戻す', () => {
    const sf = buildSceneFile(term, script);
    const out = applyDurations(sf, [3.2, 4.1], 'narration.wav');
    expect(out.audioFile).toBe('narration.wav');
    expect(out.scenes.map((s) => s.durationSec)).toEqual([3.2, 4.1]);
  });

  it('尺の数がシーン数と一致しないと例外', () => {
    const sf = buildSceneFile(term, script);
    expect(() => applyDurations(sf, [1], 'x.wav')).toThrow();
  });
});

describe('visuals', () => {
  it('加工・道具系の example は process_clip', () => {
    expect(suggestVisual('面取り', 'example')).toBe('process_clip');
  });
  it('断面系の definition は cross_section', () => {
    expect(suggestVisual('年輪', 'definition')).toBe('cross_section');
  });
  it('対比できる用語は photo_compare', () => {
    expect(suggestVisual('柾目', 'hook')).toBe('photo_compare');
    expect(suggestVisual('無垢材', 'definition')).toBe('photo_compare');
  });
  it('未知用語は安全な既定にフォールバック', () => {
    expect(suggestVisual('謎用語', 'hook')).toBe('wood_title');
    expect(suggestVisual('謎用語', 'definition')).toBe('grain_closeup');
    expect(suggestVisual('謎用語', 'summary')).toBe('wood_caption');
  });
  it('不正な visual は推定値に置換', () => {
    expect(normalizeVisual('面取り', 'example', 'not_a_visual')).toBe('process_clip');
    expect(normalizeVisual('面取り', 'example', 'grain_closeup')).toBe('grain_closeup');
  });
});
