/**
 * Play the build back: the truck driving in, tipping, and driving away, load after load.
 *
 * WHY THIS EXISTS. A product that only shows the finished pile can say what was made and never how,
 * and the how is the entire subject.
 *
 * A LOAD IS NOT A FRAME. It was, and the result was exactly what it sounds like: material appeared
 * out of nothing, the truck was in a different place every tick, and between two ticks nothing
 * connected them. A load is an EVENT with a duration. This player therefore runs on a continuous
 * clock in units of loads, and hands the scene a fractional position: which load is being worked and
 * how far through it we are. The scene interpolates the surface between the load's before and after,
 * and walks the truck along the route the engine actually solved.
 *
 * IT IS PAUSED BY DEFAULT AND IT STOPS ITSELF. The shell's `usePausedViz` is used rather than a
 * hand-rolled requestAnimationFrame for exactly that reason: an animation that starts on its own and
 * keeps running in a background tab is a compute bomb, and the standing rule is that every animation
 * defaults to paused, runs once, and halts when the tab is hidden.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pause, Play, SkipBack, SkipForward, Square } from 'lucide-react';
import { usePausedViz } from '@fasl-work/caos-app-shell';

import type { Frames } from '../lib/scenario';

interface Props {
  frames: Frames | null;
  /** Total steps. On a sequential campaign that is every placed load then every reclaim cut; on a
   *  concurrent one the cuts happen DURING the build, so it is the build alone. */
  total?: number;
  /** Cuts taken during the build, so the readout can say the loader is already working. */
  concurrentCuts?: number;
  /** Timeline positions of every reclaim cut, marked on the scrub so the reader can find them. */
  marks?: number[];
  /** Fractional position through the build, in loads. `2.4` is 40 percent through the third load. */
  pos: number;
  onPos: (p: number) => void;
  lang?: 'en' | 'es';
}

/** Loads per second at 1x. THE DEFAULT IS 1x, and it is the rate the previous default called 2.5x.
 *  The scale is relative because that is what a transport control means to a reader; the absolute
 *  rate is a truck every two thirds of a second, which is fast enough to watch a campaign and slow
 *  enough to follow one truck. */
const BASE_LOADS_PER_S = 1.5;

const SPEEDS = [0.5, 1, 2, 5];

export default function PlayBar({ frames, total, pos, onPos, lang = 'en', concurrentCuts = 0, marks = [] }: Props) {
  const t = (en: string, es: string) => (lang === 'es' ? es : en);
  const nBuild = frames?.frames.length ?? 0;
  const n = total ?? nBuild;

  const [speed, setSpeed] = useState(1);
  const rate = BASE_LOADS_PER_S * speed;

  const [playing, setPlaying] = useState(false);

  // WHERE THIS RUN STARTED. The shell's loop hands out elapsed milliseconds from zero, so a player
  // that maps elapsed straight onto a position can only ever play from the beginning: pausing
  // half way and pressing play again threw the reader back to load one, which made stopping in
  // place useless even when it worked. Each run records the position it began at and adds elapsed
  // to that, so play RESUMES and the scrub is an equal citizen with the transport.
  const origin = useRef(0);

  const frame = useCallback(
    (_dt: number, elapsed: number) => {
      if (n === 0) return false;
      const p = origin.current + (elapsed / 1000) * rate;
      onPos(Math.min(p, n - 1));
      return p < n - 1;
    },
    [n, rate, onPos],
  );

  const viz = usePausedViz(frame, { onPlayingChange: setPlaying });

  /** Play from where the reader is. At the very end there is nothing left to watch, so it rewinds. */
  const resume = useCallback(() => {
    origin.current = pos >= n - 1 - 1e-6 ? 0 : pos;
    viz.restart();
  }, [pos, n, viz]);

  const idx = Math.min(Math.max(Math.floor(pos), 0), Math.max(n - 1, 0));
  const reclaiming = idx >= nBuild;
  const placed = useMemo(
    () => (frames && frames.frames[idx] ? frames.frames[idx].placed : 0),
    [frames, idx],
  );
  const built = useMemo(
    () => (frames && frames.frames.length ? frames.frames[frames.frames.length - 1].placed : 0),
    [frames],
  );
  const nCuts = frames?.reclaim?.length ?? 0;

  if (!frames || n === 0) return null;

  const step = (d: number) => {
    viz.pause();
    onPos(Math.min(Math.max(Math.floor(pos) + d, 0), n - 1));
  };

  return (
    <div className="st-play" role="group" aria-label={t('Play the build', 'Reproducir la construcción')}>
      <button
        type="button"
        onClick={() => (playing ? viz.pause() : resume())}
        aria-label={playing ? t('Pause', 'Pausar') : t('Play', 'Reproducir')}
        title={
          playing
            ? t('Pause here', 'Pausar aquí')
            : t('Play from here', 'Reproducir desde aquí')
        }
      >
        {playing ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />}
      </button>

      {/* STOP HALTS ON THE FRAME YOU ARE LOOKING AT. It used to jump to the finished pile, which is
          not stopping, it is skipping to the end: the one moment the reader had chosen to look at
          was the thing it threw away. It now snaps to that load's own frame, so the stage shows a
          load boundary rather than a position part-way through a tip. */}
      <button
        type="button"
        onClick={() => {
          viz.pause();
          onPos(Math.min(Math.max(Math.round(pos), 0), n - 1));
        }}
        aria-label={t('Stop', 'Detener')}
        title={t('Stop on this load', 'Detener en esta carga')}
      >
        <Square size={13} aria-hidden />
      </button>

      <button type="button" onClick={() => step(-1)} aria-label={t('Previous load', 'Carga anterior')}>
        <SkipBack size={14} aria-hidden />
      </button>
      <button type="button" onClick={() => step(1)} aria-label={t('Next load', 'Carga siguiente')}>
        <SkipForward size={14} aria-hidden />
      </button>
      {/* The scrub is continuous, not stepped: a load is a duration, so half way through one is a
          real position and the reader is allowed to stop there. */}
      {/* THE CUTS ARE MARKED ON THE TRACK. A reader cannot look for something whose position is
          invisible: at eight loads out of 745 a cut is a tenth of the bar, and hunting for the
          orange truck by dragging was a lottery. Each tick is a cut, and clicking one jumps to it. */}
      <span className="st-play-track">
        <input
          className="st-play-scrub"
          type="range"
          min={0}
          max={Math.max(n - 1, 0)}
          step={0.02}
          value={pos}
          onChange={(e) => { viz.pause(); onPos(Number(e.target.value)); }}
          aria-label={t('Build progress', 'Avance de la construcción')}
        />
        {marks.length > 0 && n > 1 && (
          <span className="st-play-marks" aria-hidden="true">
            {marks.map((m, i) => (
              <button
                key={i}
                type="button"
                // Addressable, so the release gate can click a cut and check the reclaim machines
                // are actually on screen. A mark nothing can select is a mark nothing can verify.
                data-cut={i}
                style={{ left: `${(m / (n - 1)) * 100}%` }}
                title={t(`Cut ${i + 1}: jump here`, `Corte ${i + 1}: saltar aquí`)}
                onClick={() => { viz.pause(); onPos(m + 0.5); }}
              />
            ))}
          </span>
        )}
      </span>

      {/* The readout says which half of the operation is on the stage: loads going on, or cuts
          coming off. A single "n of m" counter cannot, and the two are different machines. */}
      {/* WHAT THE READOUT HAS TO SAY depends on which operation is running. On a sequential campaign
          the timeline has two halves and the counter switches between them. On a CONCURRENT one there
          is no second half: the loader is working the same timeline the trucks are, so the readout
          carries both counts at once rather than pretending the reclaim has not started. */}
      <span className="st-play-read">
        {concurrentCuts > 0
          ? `${placed}/${built} ${t('loads', 'cargas')} · ${concurrentCuts} ${t('cuts', 'cortes')}`
          : reclaiming
            ? `${idx - nBuild + 1}/${nCuts} ${t('cuts', 'cortes')}`
            : `${placed}/${built} ${t('loads', 'cargas')}`}
      </span>

      <label className="st-play-speed">
        <span>{t('speed', 'velocidad')}</span>
        <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
          {SPEEDS.map((x) => (
            <option key={x} value={x}>
              {x}x
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
