import type { ScriptGenerator, ScriptResult, Term } from '../types.js';
import { suggestVisual } from '../scene/visuals.js';

/**
 * API不要の決定的な台本生成。Gemini未設定時のフォールバック兼テスト用。
 * README §3.2 の固定構成（フック→定義→具体例→まとめ）に沿う。
 */
export class TemplateScriptGenerator implements ScriptGenerator {
  name = 'template';

  async generate(term: Term): Promise<ScriptResult> {
    const t = term.term;
    const cat = term.category || '木材';

    return {
      term: t,
      scenes: [
        {
          type: 'hook',
          narration: `${t}って、知っていますか？名前は聞いても、説明はむずかしいですよね。`,
          caption: `${t}って？`,
          visual: suggestVisual(t, 'hook'),
        },
        {
          type: 'definition',
          narration: `${t}は、${cat}でよく使う、木の基本のことばです。`,
          caption: `${cat}の基本`,
          visual: suggestVisual(t, 'definition'),
        },
        {
          type: 'example',
          narration: `家具や床材を選ぶとき、違いに気づくヒントになりますよ。`,
          caption: `選ぶヒントに`,
          visual: suggestVisual(t, 'example'),
        },
        {
          type: 'summary',
          narration: `以上、${t}でした。少しずつ、木を見る目が育っていきますよ。`,
          caption: `今日のまとめ`,
          visual: suggestVisual(t, 'summary'),
        },
      ],
    };
  }
}
