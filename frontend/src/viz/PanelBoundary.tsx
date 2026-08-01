import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * A per-panel error boundary.
 *
 * One view throwing must never blank the whole workbench. Without this, a single bad cell index in one
 * chart takes down the case selector with it and the reader sees an empty page with no way back, which
 * is strictly worse than seeing eleven working panels and one that says what went wrong.
 */
export class PanelBoundary extends Component<
  { children: ReactNode; name: string; es?: boolean },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error(`[StockTwin] panel "${this.props.name}" failed`, error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const es = this.props.es;
    return (
      <div className="st-boundary" role="alert">
        <strong>{es ? 'Este panel fallo' : 'This panel failed'}</strong>
        <p style={{ margin: '0.4rem 0 0' }}>
          {es
            ? `El panel "${this.props.name}" no pudo dibujarse. El resto del taller sigue funcionando.`
            : `The "${this.props.name}" panel could not draw. The rest of the workbench still works.`}
        </p>
        <code>{this.state.error.message}</code>
      </div>
    );
  }
}
