/**
 * Every top-level route, declared ONCE.
 *
 * The header nav read one list and the router re-declared the same paths as string literals in the
 * same file, so each path existed twice and adding or renaming one meant editing both. That is the
 * class of duplication that produces a nav entry pointing at a route that no longer exists, and it
 * cannot be caught by a type check when the two copies are strings.
 *
 * The element lives here with the label, so a route is one object: path, both labels, and what it
 * renders. `main.tsx` feeds the shell config from this array and generates its `<Route>` children
 * from the same array.
 *
 * The focus route is NOT here on purpose. It renders outside the shell, per ADR-0070, and it is
 * reached from the App rather than from the nav, so it is not a nav entry and giving it one would
 * put a full-bleed instrument in a row of prose pages.
 */
import type { ReactElement } from 'react';

import Tool from '../pages/Tool';
import Introduction from '../pages/Introduction';
import Methodology from '../pages/Methodology';
import Implementation from '../pages/Implementation';
import Experiments from '../pages/Experiments';
import Benchmark from '../pages/Benchmark';

export interface AppRoute {
  path: string;
  en: string;
  es: string;
  element: ReactElement;
}

export const ROUTES: AppRoute[] = [
  { path: '/', en: 'App', es: 'App', element: <Tool /> },
  { path: '/introduction', en: 'Introduction', es: 'Introducción', element: <Introduction /> },
  { path: '/methodology', en: 'Methodology', es: 'Metodología', element: <Methodology /> },
  { path: '/implementation', en: 'Implementation', es: 'Implementación', element: <Implementation /> },
  { path: '/experiments', en: 'Experiments', es: 'Experimentos', element: <Experiments /> },
  { path: '/benchmark', en: 'Benchmark', es: 'Benchmark', element: <Benchmark /> },
];
