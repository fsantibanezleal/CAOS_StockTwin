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
import { useCallback, useMemo, useState } from 'react';
import { Pause, Play, SkipBack, SkipForward, Square } from 'lucide-react';
import { usePausedViz } from '@fasl-work/caos-app-shell';

import type { Frames } from '../lib/scenario';

interface Props {
  frames: Frames | null;
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

export default function PlayBar({ frames, pos, onPos, lang = 'en' }: Props) {
  const t = (en: string, es: string) => (lang === 'es' ? es : en);
  const n = frames?.frames.length ?? 0;

  const [speed, setSpeed] = useState(1);
  const rate = BASE_LOADS_PER_S * speed;

  const [playing, setPlaying] = useState(false);
  const frame = useCallback(
    (_dt: number, elapsed: number) => {
      if (n === 0) return false;
      const p = (elapsed / 1000) * rate;
      onPos(Math.min(p, n - 1));
      return p < n - 1;
    },
    [n, rate, onPos],
  );

  const viz = usePausedViz(frame, { onPlayingChange: setPlaying });

  const idx = Math.min(Math.max(Math.floor(pos), 0), Math.max(n - 1, 0));
  const placed = useMemo(
    () => (frames && frames.frames[idx] ? frames.frames[idx].placed : 0),
    [frames, idx],
  );
  const total = useMemo(
    () => (frames && frames.frames.length ? frames.frames[frames.frames.length - 1].placed : 0),
    [frames],
  );

  if (!frames || n === 0) return null;

  const step = (d: number) => {
    viz.pause();
    onPos(Math.min(Math.max(Math.floor(pos) + d, 0), n - 1));
  };

  return (
    <div className="st-play" role="group" aria-label={t('Play the build', 'Reproducir la construcción')}>
      <button
        type="button"
        onClick={() => (playing ? viz.pause() : viz.restart())}
        aria-label={playing ? t('Pause', 'Pausar') : t('Play', 'Reproducir')}
        title={playing ? t('Pause, keeping this moment', 'Pausar, manteniendo este momento') : t('Play the build', 'Reproducir la construcción')}
      >
        {playing ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />}
      </button>

      {/* STOP IS NOT PAUSE. Pause holds the moment you are looking at; stop ends the run and puts
          the finished pile back on the stage, which is the state the tab opens in. Having only a
          play/pause toggle left no way to say "I am done watching" other than dragging the scrub to
          the end. */}
      <button
        type="button"
        onClick={() => { viz.pause(); onPos(n - 1); }}
        aria-label={t('Stop', 'Detener')}
        title={t('Stop, and show the finished pile', 'Detener, y mostrar la pila terminada')}
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

      <span className="st-play-read">
        {placed}/{total} {t('loads', 'cargas')}
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
