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
      en: 'Engines: repose-angle relaxation (Bak et al. 1987), Gray-Thornton segregation (doi:10.1098/rspa.2004.1420), per-cell lot ledger (doi:10.1016/j.minpro.2015.04.012). Data: oreblocks synthetic (CC-BY); MineLib (doi:10.1007/s10479-012-1258-3) fetched at runtime, never bundled.',
      es: 'Motores: relajacion con angulo de reposo (Bak et al. 1987), segregacion de Gray y Thornton (doi:10.1098/rspa.2004.1420), libro mayor de lotes por celda (doi:10.1016/j.minpro.2015.04.012). Datos: oreblocks sintetico (CC-BY); MineLib (doi:10.1007/s10479-012-1258-3) en tiempo de ejecucion, nunca empaquetado.',
    },
    disclaimer: {
      en: 'Static, in-browser, no backend. VRR = var_out / var_in, lower is better, always against the derived 1/N bound. Teaching only: no metal accounting, no blending LP, no setpoint.',
      es: 'Estatico, en el navegador, sin backend. VRR = var_salida / var_entrada, menor es mejor, siempre contra la cota derivada 1/N. Solo ensenanza: sin contabilidad metalurgica, sin LP de mezcla, sin consignas.',
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
