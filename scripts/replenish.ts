import { config } from '../src/config.js';
import { createTermStore } from '../src/pick/store.js';
import { suggestNewTerms } from '../src/pick/term-suggest.js';

/**
 * 用語ネタの自動補充（README §3.1）。
 * 未使用(pending)の在庫が閾値を下回ったら、Gemini に新しい木材用語を提案させてマスタへ追加する。
 * 日次実行(daily-run.sh)の先頭で呼ぶ想定。Gemini 未設定なら何もせず終了（generate は継続）。
 *
 * 環境変数:
 *   WOOD_REPLENISH_THRESHOLD … この数を下回ったら補充（既定 8）
 *   WOOD_REPLENISH_TARGET    … 補充後に目指す在庫数（既定 20）
 */
function log(msg: string) {
  console.log(`\x1b[35m[replenish]\x1b[0m ${msg}`);
}

async function main() {
  const threshold = Number(process.env.WOOD_REPLENISH_THRESHOLD ?? '8');
  const target = Number(process.env.WOOD_REPLENISH_TARGET ?? '20');

  const store = createTermStore();
  const pending = await store.pendingCount();
  log(`store=${store.name} 未使用在庫=${pending}（閾値 ${threshold}）`);

  if (pending >= threshold) {
    log('在庫は十分です。補充しません。');
    return;
  }
  if (!config.gemini.enabled) {
    log('⚠️ 在庫が少ないですが GEMINI_API_KEY 未設定のため自動補充できません。');
    log('   .env に GEMINI_API_KEY を設定すると、不足時に自動で用語を足します。');
    return;
  }

  const need = Math.max(1, target - pending);
  const existing = await store.listTermNames();
  log(`Gemini に ${need} 語を提案依頼中…（既存 ${existing.length} 語と重複回避）`);

  const suggested = await suggestNewTerms(need, existing);
  const added = await store.addTerms(suggested);
  log(`✅ ${added} 語を追加しました（提案 ${suggested.length} 語、重複除外後）。`);
  if (added > 0) {
    log('追加例: ' + suggested.slice(0, 8).map((t) => `${t.term}(${t.category})`).join('、'));
  }
}

main().catch((err) => {
  console.error(`[replenish] 失敗: ${(err as Error).message}`);
  // 補充に失敗しても日次の generate は止めない（exit 0）
  process.exit(0);
});
