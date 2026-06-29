import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config, paths } from '../config.js';
import { TermSchema, type Term } from '../types.js';
import { selectTerm } from './select.js';

export interface PublishFields {
  youtube_video_id?: string | null;
  tiktok_draft_id?: string | null;
  drive_link?: string | null;
}

/** 用語マスタへ追加する1語（自動補充で使用） */
export interface NewTerm {
  term: string;
  reading: string;
  category: string;
  difficulty: number;
}

/** ①ネタ管理の抽象。Supabase 本番 / ローカルJSON フォールバックを差し替え可能に。 */
export interface TermStore {
  name: string;
  /** 次に動画化する1語を選定（pending → difficulty昇順・カテゴリ分散） */
  pickNext(): Promise<Term | null>;
  /** 用語名を指定して1語取得（--term / 再撮影・デモ用）。見つからなければ null */
  pickByName(term: string): Promise<Term | null>;
  /** 未使用（pending）の用語数。自動補充の判定に使う */
  pendingCount(): Promise<number>;
  /** 既存の用語名一覧（重複追加を避けるため） */
  listTermNames(): Promise<string[]>;
  /** 用語をマスタへ追加（既存と重複する term はスキップ）。追加した件数を返す */
  addTerms(terms: NewTerm[]): Promise<number>;
  markGenerated(id: string): Promise<void>;
  markPublished(id: string, fields: PublishFields): Promise<void>;
  /** ステータスは変えずに成果物ID（Drive/YouTube）だけ記録する */
  recordArtifacts(id: string, fields: PublishFields): Promise<void>;
}

// ===== ローカルJSON ストア（Supabase未設定時のフォールバック） =====
interface UsedRecord {
  status: 'generated' | 'published';
  published_at?: string;
  category: string;
  youtube_video_id?: string | null;
  tiktok_draft_id?: string | null;
  drive_link?: string | null;
}
type UsedMap = Record<string, UsedRecord>;

function slug(term: string): string {
  return `local-${Buffer.from(term).toString('hex').slice(0, 16)}`;
}

export class LocalTermStore implements TermStore {
  name = 'local-json';

  private async loadSeed(): Promise<Term[]> {
    const raw = JSON.parse(await readFile(paths.seed, 'utf8')) as unknown[];
    return raw.map((r) => {
      const obj = r as Record<string, unknown>;
      return TermSchema.parse({
        id: slug(String(obj.term)),
        term: obj.term,
        reading: obj.reading ?? '',
        category: obj.category ?? '',
        difficulty: obj.difficulty ?? 1,
        status: 'pending',
      });
    });
  }

  private async loadUsed(): Promise<UsedMap> {
    if (!existsSync(paths.used)) return {};
    return JSON.parse(await readFile(paths.used, 'utf8')) as UsedMap;
  }

  private async saveUsed(used: UsedMap): Promise<void> {
    await writeFile(paths.used, JSON.stringify(used, null, 2));
  }

  async pickNext(): Promise<Term | null> {
    const seed = await this.loadSeed();
    const used = await this.loadUsed();
    const pending = seed.filter((t) => !used[t.id]);

    // 直近 published のカテゴリを新しい順に（カテゴリ分散用）
    const recentCategories = Object.values(used)
      .filter((u) => u.published_at)
      .sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? ''))
      .map((u) => u.category);

    return selectTerm(pending, recentCategories);
  }

  async pickByName(term: string): Promise<Term | null> {
    const seed = await this.loadSeed();
    return seed.find((t) => t.term === term) ?? null;
  }

  async pendingCount(): Promise<number> {
    const seed = await this.loadSeed();
    const used = await this.loadUsed();
    return seed.filter((t) => !used[t.id]).length;
  }

  async listTermNames(): Promise<string[]> {
    const seed = await this.loadSeed();
    return seed.map((t) => t.term);
  }

  async addTerms(terms: NewTerm[]): Promise<number> {
    const raw = JSON.parse(await readFile(paths.seed, 'utf8')) as NewTerm[];
    const existing = new Set(raw.map((t) => t.term));
    const toAdd = terms.filter((t) => t.term && !existing.has(t.term));
    if (toAdd.length === 0) return 0;
    const merged = [...raw, ...toAdd];
    await writeFile(paths.seed, JSON.stringify(merged, null, 2) + '\n');
    return toAdd.length;
  }

  async markGenerated(id: string): Promise<void> {
    const seed = await this.loadSeed();
    const term = seed.find((t) => t.id === id);
    const used = await this.loadUsed();
    used[id] = { ...used[id], status: 'generated', category: term?.category ?? '' };
    await this.saveUsed(used);
  }

  async markPublished(id: string, fields: PublishFields): Promise<void> {
    const used = await this.loadUsed();
    const prev = used[id] ?? { category: '' };
    used[id] = {
      ...prev,
      status: 'published',
      published_at: new Date().toISOString(),
      ...fields,
    };
    await this.saveUsed(used);
  }

  async recordArtifacts(id: string, fields: PublishFields): Promise<void> {
    const used = await this.loadUsed();
    const prev = used[id] ?? { status: 'generated', category: '' };
    used[id] = { ...prev, ...fields } as UsedRecord;
    await this.saveUsed(used);
  }
}

// ===== Supabase ストア（本番） =====
export class SupabaseTermStore implements TermStore {
  name = 'supabase';
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(config.supabase.url, config.supabase.key, {
      auth: { persistSession: false },
    });
  }

  async pickNext(): Promise<Term | null> {
    const { data: pendingRows, error } = await this.client
      .from(config.supabase.table)
      .select('*')
      .eq('status', 'pending');
    if (error) throw new Error(`Supabase pickNext failed: ${error.message}`);

    const { data: publishedRows } = await this.client
      .from(config.supabase.table)
      .select('category, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(20);

    const pending = (pendingRows ?? []).map((r) => TermSchema.parse(r));
    const recentCategories = (publishedRows ?? []).map((r) => String(r.category ?? ''));
    return selectTerm(pending, recentCategories);
  }

  async pickByName(term: string): Promise<Term | null> {
    const { data, error } = await this.client
      .from(config.supabase.table)
      .select('*')
      .eq('term', term)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`Supabase pickByName failed: ${error.message}`);
    return data ? TermSchema.parse(data) : null;
  }

  async pendingCount(): Promise<number> {
    const { count, error } = await this.client
      .from(config.supabase.table)
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');
    if (error) throw new Error(`Supabase pendingCount failed: ${error.message}`);
    return count ?? 0;
  }

  async listTermNames(): Promise<string[]> {
    const { data, error } = await this.client.from(config.supabase.table).select('term');
    if (error) throw new Error(`Supabase listTermNames failed: ${error.message}`);
    return (data ?? []).map((r) => String(r.term));
  }

  async addTerms(terms: NewTerm[]): Promise<number> {
    if (terms.length === 0) return 0;
    const { data, error } = await this.client
      .from(config.supabase.table)
      .upsert(terms, { onConflict: 'term', ignoreDuplicates: true })
      .select('term');
    if (error) throw new Error(`Supabase addTerms failed: ${error.message}`);
    return (data ?? []).length;
  }

  async markGenerated(id: string): Promise<void> {
    const { error } = await this.client
      .from(config.supabase.table)
      .update({ status: 'generated' })
      .eq('id', id);
    if (error) throw new Error(`Supabase markGenerated failed: ${error.message}`);
  }

  async markPublished(id: string, fields: PublishFields): Promise<void> {
    const { error } = await this.client
      .from(config.supabase.table)
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        ...fields,
      })
      .eq('id', id);
    if (error) throw new Error(`Supabase markPublished failed: ${error.message}`);
  }

  async recordArtifacts(id: string, fields: PublishFields): Promise<void> {
    const { error } = await this.client
      .from(config.supabase.table)
      .update({ ...fields })
      .eq('id', id);
    if (error) throw new Error(`Supabase recordArtifacts failed: ${error.message}`);
  }
}

export function createTermStore(): TermStore {
  return config.supabase.enabled ? new SupabaseTermStore() : new LocalTermStore();
}
