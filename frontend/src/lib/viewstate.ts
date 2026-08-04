/**
 * The state a round trip between the App and the focus route has to survive.
 *
 * ADR-0070 clause 8: "Both directions MUST preserve scenario and parameter state. A round trip that
 * resets the user's work is a broken flow, not a working one." The previous implementation carried
 * the case id and nothing else, so a reader who set the colour field, opened the overlays they
 * wanted, moved the blend batch and scrubbed to load 400 got all of it back at defaults on the way
 * out and again on the way back. The scenario survived; the work did not.
 *
 * It is encoded in the QUERY STRING rather than in a store, for the reason the ADR gives the route
 * itself: a focus view is something you share and teach from. A store makes the round trip work and
 * leaves the address bar describing a view nobody is looking at.
 *
 * Only non-default values are written, so the common URL stays `/focus/valley` and not a paragraph.
 */

import { KNOBS, type Knobs } from './scenario';

export interface ViewState extends Knobs {
  /** The colour field on the stage: an assay key, or `coarse` / `thickness`. */
  colour: string;
  paths: boolean;
  crest: boolean;
  plan: boolean;
  /** Show the recent path history rather than only the truck working this frame. */
  history: boolean;
  /** Fractional position through the timeline; -1 is the finished pile. */
  pos: number;
}

export const DEFAULT_VIEW: ViewState = {
  ...KNOBS,
  colour: 'cu',
  paths: true,
  crest: true,
  plan: true,
  history: false,
  pos: -1,
};

const B = (v: string | null, d: boolean) => (v === null ? d : v === '1');
const N = (v: string | null, d: number) => {
  const x = v === null ? NaN : Number(v);
  return Number.isFinite(x) ? x : d;
};

/** Read whatever of the view state the URL carries; everything absent takes its default. */
export function readView(q: URLSearchParams): ViewState {
  return {
    colour: q.get('colour') ?? DEFAULT_VIEW.colour,
    paths: B(q.get('paths'), DEFAULT_VIEW.paths),
    crest: B(q.get('crest'), DEFAULT_VIEW.crest),
    plan: B(q.get('plan'), DEFAULT_VIEW.plan),
    history: B(q.get('hist'), DEFAULT_VIEW.history),
    pos: N(q.get('pos'), DEFAULT_VIEW.pos),
    batch: N(q.get('batch'), DEFAULT_VIEW.batch),
    threshold: N(q.get('thr'), DEFAULT_VIEW.threshold),
    cutoff: N(q.get('cut'), DEFAULT_VIEW.cutoff),
  };
}

/** Write only what differs from the default, so a shared link stays readable. */
export function writeView(v: ViewState): string {
  const q = new URLSearchParams();
  if (v.colour !== DEFAULT_VIEW.colour) q.set('colour', v.colour);
  if (v.paths !== DEFAULT_VIEW.paths) q.set('paths', v.paths ? '1' : '0');
  if (v.crest !== DEFAULT_VIEW.crest) q.set('crest', v.crest ? '1' : '0');
  if (v.plan !== DEFAULT_VIEW.plan) q.set('plan', v.plan ? '1' : '0');
  if (v.history !== DEFAULT_VIEW.history) q.set('hist', v.history ? '1' : '0');
  if (v.pos >= 0) q.set('pos', v.pos.toFixed(2));
  if (v.batch !== DEFAULT_VIEW.batch) q.set('batch', String(Math.round(v.batch)));
  if (v.threshold !== DEFAULT_VIEW.threshold) q.set('thr', v.threshold.toFixed(3));
  if (v.cutoff !== DEFAULT_VIEW.cutoff) q.set('cut', v.cutoff.toFixed(4));
  const s = q.toString();
  return s ? `?${s}` : '';
}

/** The App address for a case at a given view state. */
export const appHref = (id: string, v: ViewState): string => {
  const q = writeView(v);
  return `/${q ? `${q}&case=${id}` : `?case=${id}`}`;
};

/** The focus address for a case at a given view state. */
export const focusHref = (id: string, v: ViewState): string => `/focus/${id}${writeView(v)}`;
