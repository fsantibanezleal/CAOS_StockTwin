// Perceptually uniform colormaps. Never jet, never rainbow: false gradients change readings, and the
// interactive-visualization rubric makes that a correctness issue rather than a matter of taste.
//
// viridis for intensity (height, grade, coarse fraction). cividis for the CATEGORICAL lot-origin
// colouring, because it stays discriminable under colour-vision deficiency, which matters most exactly
// where the colour IS the information.

const VIRIDIS: ReadonlyArray<readonly [number, number, number]> = [
  [68, 1, 84], [72, 40, 120], [62, 74, 137], [49, 104, 142], [38, 130, 142],
  [31, 158, 137], [53, 183, 121], [109, 205, 89], [180, 222, 44], [253, 231, 37],
];

const CIVIDIS: ReadonlyArray<readonly [number, number, number]> = [
  [0, 32, 76], [0, 52, 110], [39, 72, 117], [69, 92, 117], [96, 112, 118],
  [123, 132, 121], [153, 154, 120], [185, 178, 114], [219, 203, 101], [253, 231, 55],
];

function ramp(stops: ReadonlyArray<readonly [number, number, number]>, t: number): [number, number, number] {
  const x = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const f = x - i;
  const a = stops[i];
  const b = stops[i + 1];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

export const viridis = (t: number): [number, number, number] => ramp(VIRIDIS, t);
export const cividis = (t: number): [number, number, number] => ramp(CIVIDIS, t);

export const rgbCss = ([r, g, b]: [number, number, number]): string => `rgb(${r},${g},${b})`;

/** A stable categorical colour for a deposition event, cycling through cividis. */
export function eventColour(eventId: number, cycle = 11): [number, number, number] {
  return cividis(((eventId % cycle) + 0.5) / cycle);
}

/**
 * Read a CSS custom property as a concrete colour string.
 *
 * A canvas cannot resolve `var(--color-fg)`: passing the variable name straight to a 2D context or a
 * WebGL uniform silently draws nothing, which is a defect this product line has shipped before. Every
 * canvas colour goes through here, and every canvas re-reads on a theme change.
 */
export function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}
