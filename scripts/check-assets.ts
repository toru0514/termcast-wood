import { readFile } from 'node:fs/promises';
import { paths } from '../src/config.js';
import { TermSchema, type Term } from '../src/types.js';
import { createScriptGenerator } from '../src/script/index.js';
import { buildSceneFile } from '../src/scene/build.js';
import { createAssetStore, hasEnoughAssets } from '../src/assets/index.js';

/**
 * 各用語の実写素材の充足状況を一覧する（README §3.5.1）。
 * 「素材が揃った用語だけ生成キューに乗せる」運用の準備状況を可視化する。
 */
function slug(term: string): string {
  return `local-${Buffer.from(term).toString('hex').slice(0, 16)}`;
}

async function main() {
  const raw = JSON.parse(await readFile(paths.seed, 'utf8')) as Array<Record<string, unknown>>;
  const terms: Term[] = raw.map((obj) =>
    TermSchema.parse({
      id: slug(String(obj.term)),
      term: obj.term,
      reading: obj.reading ?? '',
      category: obj.category ?? '',
      difficulty: obj.difficulty ?? 1,
      status: 'pending',
    }),
  );

  const store = createAssetStore();
  const generator = createScriptGenerator();
  console.log(`素材ストア: ${store.name}\n`);

  let ready = 0;
  for (const term of terms) {
    const available = await store.assetsFor(term);
    // テンプレ台本でシーン構成を決め、photo_compare 等が満たせるかを判定
    const sceneFile = buildSceneFile(term, await generator.generate(term));
    const ok = hasEnoughAssets(sceneFile.scenes, available);
    if (ok) ready += 1;
    const mark = ok ? '✅' : available.length > 0 ? '🟡' : '⬜️';
    console.log(`${mark} ${term.term.padEnd(12)} 素材 ${available.length} 点  (${term.category})`);
  }

  console.log(`\n揃っている用語: ${ready} / ${terms.length}`);
  if (ready === 0) {
    console.log('※ まだ素材がありません。assets/ に写真を置き data/assets.manifest.json に登録してください。');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
