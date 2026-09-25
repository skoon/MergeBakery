import { Application } from 'pixi.js';

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
  return app;
}
