import { render } from 'preact';
import { App } from './components/App';
// styles.css is injected as raw CSS by scripts/create-html.js to avoid
// create-figma-plugin v4 CSS-modules mangling of class names.

export default function (rootNode: HTMLElement) {
  render(<App />, rootNode);
}
