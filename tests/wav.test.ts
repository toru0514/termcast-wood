import { describe, it, expect } from 'vitest';
import { silentWav, wavDurationSec, concatWavs, concatWithGaps, parseWav } from '../src/tts/wav.js';
import { estimateDurationSec } from '../src/tts/duration.js';

describe('wav util', () => {
  it('silentWav の尺がほぼ指定通り', () => {
    const w = silentWav(2);
    expect(wavDurationSec(w)).toBeCloseTo(2, 1);
  });

  it('mono 16bit のフォーマットになる', () => {
    const info = parseWav(silentWav(1));
    expect(info.channels).toBe(1);
    expect(info.bitsPerSample).toBe(16);
    expect(info.sampleRate).toBe(24000);
  });

  it('concatWavs は尺を保ち各尺を返す', () => {
    const a = silentWav(1);
    const b = silentWav(1.5);
    const { wav, durations } = concatWavs([a, b]);
    expect(durations[0]).toBeCloseTo(1, 1);
    expect(durations[1]).toBeCloseTo(1.5, 1);
    expect(wavDurationSec(wav)).toBeCloseTo(2.5, 1);
  });

  it('concatWithGaps は各シーンに間を足す（尺を伸ばす）', () => {
    const a = silentWav(1);
    const b = silentWav(1.5);
    const { wav, durations } = concatWithGaps([a, b], 0.8);
    // 各 durations はナレーション尺 + 間
    expect(durations[0]).toBeCloseTo(1.8, 1);
    expect(durations[1]).toBeCloseTo(2.3, 1);
    // 合計は元 2.5s + 間 0.8*2 = 4.1s
    expect(wavDurationSec(wav)).toBeCloseTo(4.1, 1);
    // durations 合計と WAV 実尺は一致する（字幕同期の前提）
    expect(durations.reduce((x, y) => x + y, 0)).toBeCloseTo(wavDurationSec(wav), 1);
  });

  it('concatWithGaps(gap=0) は concatWavs と等価', () => {
    const { durations } = concatWithGaps([silentWav(1)], 0);
    expect(durations[0]).toBeCloseTo(1, 1);
  });
});

describe('estimateDurationSec', () => {
  it('最低でも 1.2 秒', () => {
    expect(estimateDurationSec('あ')).toBeGreaterThanOrEqual(1.2);
  });
  it('長い文ほど長い', () => {
    const short = estimateDurationSec('短い文です。');
    const long = estimateDurationSec('これはとても長い文章で、読み上げにそれなりの時間がかかります。');
    expect(long).toBeGreaterThan(short);
  });
});
