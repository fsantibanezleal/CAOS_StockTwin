// Fetching the committed CONTRACT-2 artifacts.
//
// The app is static, so these are plain files under the site root, copied there at build time by
// copy-data.mjs from the canonical `data/derived`. Nothing here computes science: it fetches what the
// bake already audited, and every verdict the page shows is recomputed live from the events.
//
// A missing artifact is reported, never faked. The Benchmark page renders "not baked" rather than a
// zero, because a zero in a metric column is indistinguishable from a real measurement.

import type { Manifest, ManifestIndex, Matrix, Metrics, Trace } from './contract.types';

const base = (): string => import.meta.env.BASE_URL ?? '/';

/** Cache-busted with the app version so a Pages CDN cannot serve last release's artifacts. */
const bust = (): string => `?v=${__APP_VERSION__}`;

async function getJson<T>(rel: string): Promise<T | null> {
  try {
    const r = await fetch(`${base()}data/${rel}${bust()}`);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export const loadIndex = (): Promise<ManifestIndex | null> => getJson<ManifestIndex>('manifests/index.json');
export const loadManifest = (id: string): Promise<Manifest | null> => getJson<Manifest>(`manifests/${id}.json`);
export const loadTrace = (id: string): Promise<Trace | null> => getJson<Trace>(`${id}/trace.json`);
export const loadMetrics = (id: string): Promise<Metrics | null> => getJson<Metrics>(`${id}/metrics.json`);
export const loadMatrix = (): Promise<Matrix | null> => getJson<Matrix>('matrix.json');

/**
 * The MineLib real lane: fetched at RUNTIME into browser memory, never committed, never bundled.
 *
 * MineLib grants academic download only, with no redistribution (Espinoza, Goycoolea, Moreno and
 * Newman 2013, doi:10.1007/s10479-012-1258-3). The instance files therefore appear nowhere in this
 * repository or in the built site; the browser fetches them from the public mirrors when a reader
 * selects a real case, holds them in memory for the session, and discards them. This is the posture
 * validated on the sibling PitForge product.
 *
 * The mirrors are plain-HTTPS raw files; the canonical MineLib host rejects programmatic access.
 */
const MIRROR_A = 'https://raw.githubusercontent.com/ampl/colab.ampl.com/master/authors/eduardosalaz/minelib/data';
const MIRROR_B = 'https://raw.githubusercontent.com/qarth/whattle/master/test/minelib';

export interface MinelibInstance {
  id: string;
  name: string;
  /** column index of the copper grade in a `.blocks` row, when the instance publishes one. */
  gradeCol: number;
  tonnageCol: number;
  nBlocks: number;
  url: string;
  provenance_en: string;
  provenance_es: string;
}

export const MINELIB_INSTANCES: MinelibInstance[] = [
  {
    id: 'kd', name: 'KD', gradeCol: 7, tonnageCol: 4, nBlocks: 14153,
    url: `${MIRROR_B}/kd/kd.blocks`,
    provenance_en: 'MineLib instance KD: 14,153 blocks with an explicit copper grade column and per-block tonnage. Fetched at runtime under MineLib’s academic-use grant; never redistributed.',
    provenance_es: 'Instancia KD de MineLib: 14.153 bloques con columna explícita de ley de cobre y tonelaje por bloque. Descargada en tiempo de ejecución bajo la licencia académica de MineLib; nunca redistribuida.',
  },
  {
    id: 'newman1', name: 'Newman 1', gradeCol: 5, tonnageCol: 6, nBlocks: 1060,
    url: `${MIRROR_A}/newman1/newman1.blocks`,
    provenance_en: 'MineLib instance Newman 1: 1,060 blocks with grade and tonnage. Fetched at runtime under MineLib’s academic-use grant; never redistributed.',
    provenance_es: 'Instancia Newman 1 de MineLib: 1.060 bloques con ley y tonelaje. Descargada en tiempo de ejecución bajo la licencia académica de MineLib; nunca redistribuida.',
  },
];

export interface RealBlocks { grades: number[]; tonnes: number[]; z: number[] }

/**
 * Parse a MineLib `.blocks` file into the columns this product needs.
 *
 * The free-column semantics vary per instance, so each one declares which index carries the grade and
 * which the tonnage; guessing would silently read a block value as a grade and produce a plausible
 * wrong stream.
 */
export function parseBlocks(text: string, inst: MinelibInstance): RealBlocks {
  const grades: number[] = [];
  const tonnes: number[] = [];
  const z: number[] = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('id')) continue;
    const f = t.split(/\s+/);
    const g = Number(f[inst.gradeCol]);
    const w = Number(f[inst.tonnageCol]);
    const zz = Number(f[3]);
    if (!Number.isFinite(g) || !Number.isFinite(w) || w <= 0) continue;
    grades.push(g);
    tonnes.push(w);
    z.push(Number.isFinite(zz) ? zz : 0);
  }
  return { grades, tonnes, z };
}

export async function fetchRealBlocks(inst: MinelibInstance): Promise<RealBlocks> {
  const r = await fetch(inst.url);
  if (!r.ok) throw new Error(`MineLib mirror returned HTTP ${r.status} for ${inst.id}`);
  return parseBlocks(await r.text(), inst);
}
