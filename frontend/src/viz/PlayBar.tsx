/**
 * Play the build back: the base layer going down, the dozer levelling it, the crest advancing.
 *
 * WHY THIS EXISTS. A product that only shows the finished pile can say what was made and never how,
 * and the how is the entire subject. The bake records the surface every few placed loads, and this
 * steps through those frames.
 *
 * IT IS PAUSED BY DEFAULT AND IT STOPS ITSELF. The shell's `usePausedViz` is used rather than a
 * hand-rolled requestAnimationFrame for exactly that reason: an animation that starts on its own and
 * keeps running in a background tab is a compute bomb, and the standing rule is that every animation
 * defaults to paused, runs once, and halts when the tab is hidden.
 */
import { useCallback, useMemo, useState } from 'react';
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import { usePausedViz } from '@fasl-work/caos-app-shell';

import type { Frames } from '../lib/scenario';

interface Props {
  frames: Frames | null;
  /** Index of the frame currently drawn, and the setter the player drives. */
  index: number;
  onIndex: (i: number) => void;
  lang?: 'en' | 'es';
}

export default function PlayBar({ frames, index, onIndex, lang = 'en' }: Props) {
  const t = (en: string, es: string) => (lang === 'es' ? es : en);
  const n = frames?.frames.length ?? 0;
  const [speed, setSpeed] = useState(6); // frames per second

  // The shell's frame signature is (dt, elapsed) and RETURNING FALSE ENDS THE PASS. So the player
  // maps elapsed time onto a frame index and reports completion at the last one: a build has an end,
  // and looping it would suggest a steady state a stockpile under construction does not have.
  const [playing, setPlaying] = useState(false);
  const frame = useCallback(
    (_dt: number, elapsed: number) => {
      if (n === 0) return false;
      const i = Math.floor((elapsed / 1000) * speed);
      onIndex(Math.min(i, n - 1));
      return i < n - 1;
    },
    [n, speed, onIndex],
  );

  const viz = usePausedViz(frame, { onPlayingChange: setPlaying });

  const placed = useMemo(
    () => (frames && frames.frames[index] ? frames.frames[index].placed : 0),
    [frames, index],
  );
  const total = useMemo(
    () => (frames && frames.frames.length ? frames.frames[frames.frames.length - 1].placed : 0),
    [frames],
  );

  if (!frames || n === 0) return null;

  return (
    <div className="st-play" role="group" aria-label={t('Play the build', 'Reproducir la construcción')}>
      <button
        type="button"
        onClick={() => {
          if (playing) {
            viz.pause();
          } else {
            // Restart rather than resume when parked at the end, so pressing play always plays.
            viz.restart();
          }
        }}
        aria-label={playing ? t('Pause', 'Pausar') : t('Play', 'Reproducir')}
        title={playing ? t('Pause', 'Pausar') : t('Play the build', 'Reproducir la construcción')}
      >
        {playing ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />}
      </button>

      <button
        type="button"
        onClick={() => { viz.pause(); onIndex(Math.max(0, index - 1)); }}
        aria-label={t('Previous frame', 'Cuadro anterior')}
      >
        <SkipBack size={14} aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => { viz.pause(); onIndex(Math.min(n - 1, index + 1)); }}
        aria-label={t('Next frame', 'Cuadro siguiente')}
      >
        <SkipForward size={14} aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => { viz.pause(); onIndex(0); }}
        aria-label={t('Back to the start', 'Volver al inicio')}
      >
        <RotateCcw size={14} aria-hidden />
      </button>

      <input
        className="st-play-scrub"
        type="range"
        min={0}
        max={Math.max(n - 1, 0)}
        step={1}
        value={index}
        onChange={(e) => { viz.pause(); onIndex(Number(e.target.value)); }}
        aria-label={t('Build progress', 'Avance de la construcción')}
      />

      <span className="st-play-read">
        {placed}/{total} {t('loads', 'cargas')}
      </span>

      <label className="st-play-speed">
        <span>{t('speed', 'velocidad')}</span>
        <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
          <option value={2}>0.3x</option>
          <option value={6}>1x</option>
          <option value={14}>2.5x</option>
          <option value={30}>5x</option>
        </select>
      </label>
    </div>
  );
}
