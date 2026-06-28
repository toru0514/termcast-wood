import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { config } from '../config.js';
import { ScriptResultSchema, type ScriptGenerator, type ScriptResult, type Term } from '../types.js';
import { normalizeVisual } from '../scene/visuals.js';

/**
 * ②台本生成: Gemini Flash アダプタ（README §3.2）。
 * - Flash系のみ使用（Pro系は2026年4月以降有料専用）。
 * - JSON モードで構造化出力を安定させる。
 */
export class GeminiScriptGenerator implements ScriptGenerator {
  name = 'gemini';
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }

  async generate(term: Term): Promise<ScriptResult> {
    const model = this.genAI.getGenerativeModel({
      model: config.gemini.model,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            scenes: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  type: {
                    type: SchemaType.STRING,
                    enum: ['hook', 'definition', 'example', 'summary'],
                    format: 'enum',
                  },
                  narration: { type: SchemaType.STRING },
                  caption: { type: SchemaType.STRING },
                },
                required: ['type', 'narration', 'caption'],
              },
            },
          },
          required: ['scenes'],
        },
      },
    });

    const prompt = this.buildPrompt(term);
    const res = await model.generateContent(prompt);
    const json = JSON.parse(res.response.text()) as {
      scenes: Array<{ type: string; narration: string; caption: string; visual?: string }>;
    };

    const scenes = json.scenes.map((s) => ({
      type: s.type as ScriptResult['scenes'][number]['type'],
      narration: s.narration,
      caption: s.caption,
      visual: normalizeVisual(term.term, s.type as ScriptResult['scenes'][number]['type'], s.visual),
    }));

    return ScriptResultSchema.parse({ term: term.term, scenes });
  }

  private buildPrompt(term: Term): string {
    return [
      'あなたは木材・木工の初心者向けショート動画の構成作家です。',
      'トーンは「木について中立に、わかりやすく教えてくれる存在」。やわらかく、素朴で、職人的な落ち着いた語り口。',
      `次の木材用語を、約20秒でやさしく解説する台本を作ってください。短くテンポよく。`,
      `用語: ${term.term}（読み: ${term.reading}、カテゴリ: ${term.category}、難易度: ${term.difficulty}）`,
      '',
      '構成は次の4シーン固定です:',
      '1. hook … 1文で興味を引く（例「この木目の違い、わかりますか？」）',
      '2. definition … 平易な言葉で一言定義',
      '3. example … 実物・身近な例で説明（家具・床材・道具など）',
      '4. summary … 一言で締め',
      '',
      '制約（厳守）:',
      '- narration は読み上げ用の自然な話し言葉。1シーン20〜30字、合計90〜110字程度。',
      '- 冗長な前置き・修飾・繰り返しは禁止。要点だけを一息で言い切る。',
      '- caption は画面テロップ用の短い一言（最大12字）。',
      '- 露骨な宣伝・販促は禁止。木材・木工の裾野を広げる、有用で素朴な情報に徹する。',
      '- 投資・金融の話題や免責は不要（このシリーズは木材用）。',
      '- 各シーンに type / narration / caption を必ず含めること。',
    ].join('\n');
  }
}
