import { Application } from 'pixi.js';

/**
 * Browser zoom, or dragging the window to another monitor, changes the pixel ratio (T-R3).
 * A media query matches only the current ratio, so each change needs a new one.
 */
function followPixelRatio(app: Application): void {
  matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener(
    'change',
    () => {
      app.renderer.resolution = window.devicePixelRatio;
      app.resize();
      followPixelRatio(app);
    },
    { once: true },
  );
}

export async function createPixiApp(stage: HTMLElement): Promise<Application> {
  const app = new Application();
  await app.init({
    resizeTo: stage,
    backgroundAlpha: 0,
    antialias: true,
    resolution: window.devicePixelRatio,
    autoDensity: true,
  });
  stage.appendChild(app.canvas);
  followPixelRatio(app);
  return app;
}
