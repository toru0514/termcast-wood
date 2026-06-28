import { mkdir, copyFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { paths } from '../config.js';

/**
 * 木材版（README §3.5.1）: assets/ の実写素材を Remotion が staticFile で参照できるよう
 * src/remotion/public/assets へコピーし、public からの相対名（assets/xxx.jpg）を返す。
 *
 * @param sourceFiles assets/ 配下の相対ファイル名
 * @returns public 相対名（例: 'assets/masame_01.jpg'）。同順。
 */
export async function stageAssets(sourceFiles: string[]): Promise<string[]> {
  if (sourceFiles.length === 0) return [];
  await mkdir(paths.remotionAssets, { recursive: true });
  const staged: string[] = [];
  for (const file of sourceFiles) {
    const src = resolve(paths.assetsSource, file);
    const name = basename(file);
    await copyFile(src, resolve(paths.remotionAssets, name));
    staged.push(`assets/${name}`);
  }
  return staged;
}
