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
      `次の木材用語を、約30秒で、中身の濃い解説をする台本を作ってください。`,
      `用語: ${term.term}（読み: ${term.reading}、カテゴリ: ${term.category}、難易度: ${term.difficulty}）`,
      '',
      '構成は次の5シーンです:',
      '1. hook … 1文で興味を引く（例「この木目の違い、わかりますか？」）',
      '2. definition … 平易な言葉で定義',
      '3. example … その用語ならではの特徴・見分け方（type=example）',
      '4. example … 使われ方・具体例・注意点など、3とは別の角度（type=example）',
      '5. summary … 一言で締め（type=summary）',
      '',
      '制約（厳守）:',
      '- その用語固有の知識を入れる（樹種なら硬さ・色・木目・用途、加工なら手順や目的など）。他の用語にも当てはまる当たり障りのない説明は禁止。',
      '- narration は読み上げ用の自然な話し言葉。1シーン25〜40字、合計140〜170字程度（読み上げ約26秒）。',
      '- 冗長な前置き・修飾・繰り返しは禁止。要点を具体的に言い切る。',
      '- caption は画面テロップ用の短い一言（最大12字）。',
      '- 露骨な宣伝・販促は禁止。木材・木工の裾野を広げる、有用で素朴な情報に徹する。',
      '- 投資・金融の話題や免責は不要（このシリーズは木材用）。',
      '- 各シーンに type / narration / caption を必ず含めること。type は hook/definition/example/summary のいずれか。',
    ].join('\n');
  }
}
