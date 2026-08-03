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
  footer: {
    provenance: {
      en: 'Engine: bedblend, published separately (pypi.org/project/bedblend). Dump geometry calibrated against 28 UAV-surveyed haul-truck dumps (doi:10.3390/mining2010006); construction model from doi:10.3390/min11060636. Data: synthetic dig sequences, seeded and reproducible.',
      es: 'Motor: bedblend, publicado aparte (pypi.org/project/bedblend). Geometria de descarga calibrada contra 28 descargas relevadas con dron (doi:10.3390/mining2010006); modelo de construccion de doi:10.3390/min11060636. Datos: secuencias de extraccion sinteticas, con semilla y reproducibles.',
    },
    disclaimer: {
      en: 'Static, in-browser. The simulation is baked offline; the browser recomputes every verdict from the event log. VRR = var_out / var_in, lower is better. Teaching only: no metal accounting, no blending LP, no setpoint.',
      es: 'Estatico, en el navegador. La simulacion se hornea fuera de linea; el navegador recalcula cada veredicto desde la bitacora de eventos. VRR = var_salida / var_entrada, menor es mejor. Solo ensenanza: sin contabilidad metalurgica, sin LP de mezcla, sin consignas.',
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
