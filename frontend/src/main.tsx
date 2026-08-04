import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layers } from 'lucide-react';
import { AppShell, applyTheme, CitationsProvider, readTheme, type ShellConfig } from '@fasl-work/caos-app-shell';
import '@fasl-work/caos-app-shell/styles.css';
import './stocktwin.css';
import { CITATIONS } from './data/citations';
import { architecture } from './architecture';
import { ROUTES } from './lib/routes';
import Tool from './pages/Tool';
import Focus from './pages/Focus';

applyTheme(readTheme());

// ONE LIST OF ROUTES. The nav and the router both read `ROUTES`, so a path exists in exactly one
// place: this file used to declare each of the six twice, once as a nav entry and once as a
// <Route>, which is how a nav item ends up pointing at a route somebody renamed.
const config: ShellConfig = {
  product: { name: 'StockTwin', mark: <Layers size={18} aria-hidden="true" /> },
  routes: ROUTES.map(({ path, en, es }) => ({ path, en, es })),
  links: { github: 'https://github.com/fsantibanezleal/CAOS_StockTwin' },
  version: __APP_VERSION__,
  architecture,
  // THE FOOTER IS NOT A METHODS SECTION. It had the engine, two DOIs, the calibration corpus, the
  // lane split and the definition of the metric crammed into it, which is four lines of type at the
  // bottom of every page and the wrong home for every one of those facts. Methodology and
  // Implementation are the pages that exist to carry them, and they do.
  //
  // What stays is what a footer is for: what this is, the one limit a reader needs before trusting a
  // number, and the provenance of the engine it all runs on. The provenance is a required item and
  // it is ONE clause: the engine, its version, its licence, and the survey the geometry is
  // calibrated against with its DOI.
  footer: {
    disclaimer: {
      en: 'Teaching and research. No metal accounting, no blending optimizer, no plant setpoint.',
      es: 'Ensenanza e investigacion. Sin contabilidad metalurgica, sin optimizador de mezcla, sin consignas de planta.',
    },
    provenance: {
      en: 'Engine: bedblend 0.6.0 (MIT); dump geometry calibrated to 28 UAV-surveyed dumps, Young and Rogers 2022, doi:10.3390/mining2010006.',
      es: 'Motor: bedblend 0.6.0 (MIT); geometria de descarga calibrada contra 28 descargas levantadas con UAV, Young y Rogers 2022, doi:10.3390/mining2010006.',
    },
  },
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <CitationsProvider items={CITATIONS}>
        <Routes>
          {/* ADR-0070: the focus view renders OUTSIDE the shell. The header and footer are exactly
              the chrome a focus view exists to escape, so it cannot be a child of AppShell. It is
              not in ROUTES because it is not a nav entry: it is reached from the App. */}
          <Route path="/focus/:caseId" element={<Focus />} />
          {/* The nav entry, which resolves to whichever case the App last had selected. */}
          <Route path="/focus" element={<Focus />} />
          <Route path="*" element={
            <AppShell config={config}>
              <Routes>
                {ROUTES.map((r) => (
                  <Route key={r.path} path={r.path} element={r.element} />
                ))}
                <Route path="*" element={<Tool />} />
              </Routes>
            </AppShell>
          } />
        </Routes>
      </CitationsProvider>
    </BrowserRouter>
  </StrictMode>,
);
