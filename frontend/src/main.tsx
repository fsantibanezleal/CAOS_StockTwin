import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layers } from 'lucide-react';
import { AppShell, applyTheme, CitationsProvider, readTheme, type ShellConfig } from '@fasl-work/caos-app-shell';
import '@fasl-work/caos-app-shell/styles.css';
import './stocktwin.css';
import { CITATIONS } from './data/citations';
import { architecture } from './architecture';
import Tool from './pages/Tool';
import Introduction from './pages/Introduction';
import Methodology from './pages/Methodology';
import Implementation from './pages/Implementation';
import Experiments from './pages/Experiments';
import Benchmark from './pages/Benchmark';
import Focus from './pages/Focus';

applyTheme(readTheme());

const config: ShellConfig = {
  product: { name: 'StockTwin', mark: <Layers size={18} aria-hidden="true" /> },
  routes: [
    { path: '/', en: 'App', es: 'App' },
    { path: '/introduction', en: 'Introduction', es: 'Introducción' },
    { path: '/methodology', en: 'Methodology', es: 'Metodología' },
    { path: '/implementation', en: 'Implementation', es: 'Implementación' },
    { path: '/experiments', en: 'Experiments', es: 'Experimentos' },
    { path: '/benchmark', en: 'Benchmark', es: 'Benchmark' },
  ],
  links: { github: 'https://github.com/fsantibanezleal/CAOS_StockTwin' },
  version: __APP_VERSION__,
  architecture,
  // THE FOOTER IS NOT A METHODS SECTION. It had the engine, two DOIs, the calibration corpus, the
  // lane split and the definition of the metric crammed into it, which is four lines of type at the
  // bottom of every page and the wrong home for every one of those facts. Methodology and
  // Implementation are the pages that exist to carry them, and they do. What stays here is what a
  // footer is for: what this is, and the one limit a reader needs before trusting a number.
  footer: {
    disclaimer: {
      en: 'Teaching and research. No metal accounting, no blending optimizer, no plant setpoint.',
      es: 'Ensenanza e investigacion. Sin contabilidad metalurgica, sin optimizador de mezcla, sin consignas de planta.',
    },
  },
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <CitationsProvider items={CITATIONS}>
        <Routes>
          {/* ADR-0070: the focus view renders OUTSIDE the shell. The header and footer are exactly
              the chrome a focus view exists to escape, so it cannot be a child of AppShell. */}
          <Route path="/focus/:caseId" element={<Focus />} />
          {/* The nav entry, which resolves to whichever case the App last had selected. */}
          <Route path="/focus" element={<Focus />} />
          <Route path="*" element={
            <AppShell config={config}>
              <Routes>
                <Route path="/" element={<Tool />} />
                <Route path="/introduction" element={<Introduction />} />
                <Route path="/methodology" element={<Methodology />} />
                <Route path="/implementation" element={<Implementation />} />
                <Route path="/experiments" element={<Experiments />} />
                <Route path="/benchmark" element={<Benchmark />} />
                <Route path="*" element={<Tool />} />
              </Routes>
            </AppShell>
          } />
        </Routes>
      </CitationsProvider>
    </BrowserRouter>
  </StrictMode>,
);
