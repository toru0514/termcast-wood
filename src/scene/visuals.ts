import type { SceneType } from '../types.js';

/**
 * 木材版（README §3.5）: 実写スライド中心の visual セット。
 * 株版の図解コンポーネント（candle_* 等）を、実写を主役にした表示種別へ差し替える。
 */
export const VISUAL_NAMES = [
  'photo_compare', // 2枚の写真を並べて違いを示す（柾目 vs 板目 など）
  'grain_closeup', // 木目・質感のクローズアップにテロップを重ねる
  'cross_section', // 断面写真で構造を説明（年輪・芯材/辺材 など）
  'process_clip', // 加工・仕上げの短い実写クリップ（or 写真）に解説を重ねる
  'wood_title', // 用語タイトルカード（素材が無くても成立する導入）
  'wood_caption', // テロップ主体のまとめカード
] as const;
export type VisualName = (typeof VISUAL_NAMES)[number];

export function isVisualName(v: string): v is VisualName {
  return (VISUAL_NAMES as readonly string[]).includes(v);
}

/** 2枚並べて対比できる用語（木目・構造の対概念） */
const COMPARE_TERMS = new Set([
  '柾目', '板目', '柾目取り', '板目取り', '四方柾',
  '木表', '木裏', '芯材', '辺材', '心材',
  '無垢材', '集成材', '突板', '合板',
  '針葉樹', '広葉樹', '散孔材', '環孔材',
]);

/** 断面で構造を見せたい用語 */
const SECTION_TERMS = new Set([
  '年輪', '木口', '導管', '含水率', '背割り', '木取り',
  '芯材', '辺材', '心材', '四方柾',
]);

/** 加工・道具・仕上げなど、作業の実写が映える用語 */
const PROCESS_TERMS = new Set([
  'うづくり', '面取り', 'ほぞ', '留め', '蟻継ぎ', '相欠き', 'ダボ', 'ビスケットジョイント',
  '鉋', '鑿', '鋸', 'クランプ', '木工ボンド', 'サンディング',
  'オイルフィニッシュ', 'ウレタン塗装', '蜜蝋ワックス', '拭き漆', '塗装',
]);

/**
 * 用語とシーン種別から実写スライドの種別を推定する。
 * 未知の visual を Gemini が返しても、ここで安全な既定にフォールバックさせる。
 */
export function suggestVisual(term: string, type: SceneType): VisualName {
  if (type === 'hook') {
    return COMPARE_TERMS.has(term) ? 'photo_compare' : 'wood_title';
  }
  if (type === 'definition') {
    if (COMPARE_TERMS.has(term)) return 'photo_compare';
    if (SECTION_TERMS.has(term)) return 'cross_section';
    return 'grain_closeup';
  }
  if (type === 'example') {
    if (PROCESS_TERMS.has(term)) return 'process_clip';
    if (SECTION_TERMS.has(term)) return 'cross_section';
    return 'grain_closeup';
  }
  // summary
  return 'wood_caption';
}

/** Gemini 等が返した visual を検証し、不正なら推定値に置換する */
export function normalizeVisual(term: string, type: SceneType, visual?: string): VisualName {
  if (visual && isVisualName(visual)) return visual;
  return suggestVisual(term, type);
}
