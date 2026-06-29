import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { config } from '../config.js';
import type { NewTerm } from './store.js';

/** 木材版のカテゴリ（用語自動補充もこの範囲で提案させる） */
export const WOOD_CATEGORIES = ['木目', '樹種', '加工', '仕上げ', '構造', '道具'] as const;

/**
 * Gemini に木材用語を提案させ、新規ネタを自動補充する（README §3.1）。
 * 既存と重複しない実在の用語を、初心者向けショートに向くものに絞って返す。
 */
export async function suggestNewTerms(count: number, existing: string[]): Promise<NewTerm[]> {
  if (!config.gemini.enabled) {
    throw new Error('GEMINI_API_KEY が未設定のため用語の自動補充はできません');
  }
  const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  const model = genAI.getGenerativeModel({
    model: config.gemini.model,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            term: { type: SchemaType.STRING },
            reading: { type: SchemaType.STRING },
            category: { type: SchemaType.STRING, enum: [...WOOD_CATEGORIES], format: 'enum' },
            difficulty: { type: SchemaType.INTEGER },
          },
          required: ['term', 'reading', 'category', 'difficulty'],
        },
      },
    },
  });

  const prompt = [
    'あなたは木材・木工の用語監修者です。初心者向けショート動画のネタになる木材用語を提案してください。',
    `提案数: ${count} 個。`,
    `カテゴリは次のいずれか: ${WOOD_CATEGORIES.join(' / ')}。`,
    '各用語に term（用語名）, reading（ひらがなの読み）, category, difficulty（1=やさしい〜3=難しい）を付ける。',
    '条件:',
    '- 実在し、20〜30秒で解説でき、木の美しさ・多様さ・面白さが伝わるものを優先。',
    '- 樹種・木目・加工・仕上げ・構造・道具をバランスよく。',
    '- 次の既存用語とは重複させない:',
    existing.join('、'),
  ].join('\n');

  const res = await model.generateContent(prompt);
  const arr = JSON.parse(res.response.text()) as Array<Record<string, unknown>>;
  const existingSet = new Set(existing);
  const seen = new Set<string>();
  const out: NewTerm[] = [];
  for (const r of arr) {
    const term = String(r.term ?? '').trim();
    const category = String(r.category ?? '');
    if (!term || existingSet.has(term) || seen.has(term)) continue;
    if (!(WOOD_CATEGORIES as readonly string[]).includes(category)) continue;
    const difficulty = Math.min(3, Math.max(1, Number(r.difficulty) || 1));
    seen.add(term);
    out.push({ term, reading: String(r.reading ?? ''), category, difficulty });
  }
  return out;
}
