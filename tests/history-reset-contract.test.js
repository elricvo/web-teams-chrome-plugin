import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('..', import.meta.url);

test('effacer la session demande le retour explicite au bas de la conversation Teams', async () => {
  const [popup, collector] = await Promise.all([
    readFile(new URL('./src/popup/popup.js', root), 'utf8'),
    readFile(new URL('./src/content/collector-content.js', root), 'utf8')
  ]);
  assert.match(popup, /type:\s*'RESET_TEAMS_HISTORY_POSITION'/);
  assert.match(collector, /message\?\.type === 'RESET_TEAMS_HISTORY_POSITION'/);
  assert.match(collector, /scroller\.scrollTo\(\{ top: scroller\.scrollHeight/);
});
