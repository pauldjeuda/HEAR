import { expect, it } from 'vitest';
import { WebAudioEngine } from './web-audio.engine';

it('exposes the shared audio event stream in browser builds', () => {
  const engine = new WebAudioEngine();

  expect(engine.events).toBeDefined();
});
