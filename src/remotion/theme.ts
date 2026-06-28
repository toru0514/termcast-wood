/**
 * ブランドトークン（フォント・配色）。Cloud9 デザイントークン共通化の受け皿。
 * 木材版（README §3.5）: 自然・素朴・温かみのある世界観に合わせた配色。
 */
export const theme = {
  fontFamily:
    '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", sans-serif',
  color: {
    bg: '#efe4d2', // 生成り（クリーム）
    bgAccent: '#f6efe2', // 明るい木肌
    text: '#3a2a1a', // 焦茶（本文）
    sub: '#8a7350', // くすんだ木色（サブ）
    accent: '#a9744f', // 温かみのある木の茶
    deep: '#6b4a2b', // 濃い木目
    leaf: '#6f8b4e', // 葉のグリーン（差し色）
    line: '#cbb79a', // 罫線・枠
    overlay: 'rgba(48, 34, 22, 0.78)', // 写真上のテロップ帯
    onPhoto: '#fbf6ec', // 写真上の明るい文字
  },
  fontSize: {
    term: 96,
    caption: 64,
    sub: 40,
    disclaimer: 28,
  },
} as const;

export const VIDEO = {
  width: 1080,
  height: 1920,
  fps: 30,
} as const;
