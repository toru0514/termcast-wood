import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config, paths } from '../config.js';
import type { Term } from '../types.js';

/**
 * 木材版で新規（README §3.5.1）: 用語ごとの実写素材を引き当てる抽象。
 * 実写が主役のため「用語 → 素材ファイル名の配列」を返す。
 *
 * 返すのは assets/ ディレクトリからの相対ファイル名（実体は assets/ 配下に置く前提）。
 * 本番は Supabase の素材テーブル、未設定時はローカルの data/assets.manifest.json を使う。
 */
export interface AssetStore {
  name: string;
  /** その用語で使える実写素材（assets/ 配下の相対ファイル名）を順序付きで返す */
  assetsFor(term: Term): Promise<string[]>;
}

type Manifest = Record<string, string[]>;

// ===== ローカル素材ストア（Supabase未設定時のフォールバック） =====
export class LocalAssetStore implements AssetStore {
  name = 'local-manifest';

  private async loadManifest(): Promise<Manifest> {
    if (!existsSync(paths.assetsManifest)) return {};
    return JSON.parse(await readFile(paths.assetsManifest, 'utf8')) as Manifest;
  }

  async assetsFor(term: Term): Promise<string[]> {
    const manifest = await this.loadManifest();
    // 用語名 or 読みでマッチ（マニフェストのキーは用語名を基本とする）
    const files = manifest[term.term] ?? manifest[term.id] ?? [];
    // 実体が assets/ にあるものだけ採用（撮影漏れを除外）
    return files.filter((f) => existsSync(resolve(paths.assetsSource, f)));
  }
}

// ===== Supabase 素材ストア（本番） =====
interface AssetRow {
  term: string;
  file: string;
  sort?: number | null;
}

export class SupabaseAssetStore implements AssetStore {
  name = 'supabase-assets';
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(config.supabase.url, config.supabase.key, {
      auth: { persistSession: false },
    });
  }

  async assetsFor(term: Term): Promise<string[]> {
    const { data, error } = await this.client
      .from(config.supabase.assetsTable)
      .select('term, file, sort')
      .eq('term', term.term)
      .order('sort', { ascending: true });
    if (error) throw new Error(`Supabase assetsFor failed: ${error.message}`);
    const rows = (data ?? []) as AssetRow[];
    // レンダリングはローカルファイルを参照するため、実体が assets/ にあるものだけ採用する。
    // （Supabase Storage に置く運用でも、撮影素材は assets/ に同期しておくこと。README §3.5.1）
    return rows.map((r) => r.file).filter((f) => existsSync(resolve(paths.assetsSource, f)));
  }
}

export function createAssetStore(): AssetStore {
  return config.supabase.enabled ? new SupabaseAssetStore() : new LocalAssetStore();
}
