import './ui/tokens.css';
import './ui/app.css';
import { createPixiApp } from './render/app';

const stage = document.querySelector<HTMLElement>('#stage');
if (!stage) {
  throw new Error('index.html is missing the #stage element');
}

await createPixiApp(stage);
