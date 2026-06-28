import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { paths } from '../config.js';
import {
  SceneType,
  type ScriptGenerator,
  type ScriptResult,
  type SceneDraft,
  type Term,
} from '../types.js';
import { suggestVisual } from '../scene/visuals.js';

interface ContentScene {
  type: string;
  narration: string;
  caption: string;
}
type ContentFile = Record<string, { scenes: ContentScene[] }>;

/**
 * API不要の決定的な台本生成。Gemini未設定時のフォールバック兼テスト用。
 * README §3.2 の固定構成（フック→定義→具体例→まとめ）に沿う。
 *
 * 用語ごとの濃い解説は data/term-content.json（知識ベース）から引く。
 * 登録が無い用語は汎用テンプレにフォールバックする。
 */
export class TemplateScriptGenerator implements ScriptGenerator {
  name = 'template';

  private async loadContent(): Promise<ContentFile> {
    if (!existsSync(paths.termContent)) return {};
    return JSON.parse(await readFile(paths.termContent, 'utf8')) as ContentFile;
  }

  async generate(term: Term): Promise<ScriptResult> {
    const t = term.term;
    const content = await this.loadContent();
    const curated = content[t]?.scenes;

    if (curated && curated.length > 0) {
      const scenes: SceneDraft[] = curated.map((s) => {
        const type = SceneType.parse(s.type);
        return {
          type,
          narration: s.narration,
          caption: s.caption,
          visual: suggestVisual(t, type),
        };
      });
      return { term: t, scenes };
    }

    // ===== 汎用フォールバック（知識ベース未登録の用語）=====
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
