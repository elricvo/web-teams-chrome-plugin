import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function loadDomShapeHelpers() {
  const source = fs.readFileSync(new URL('../src/content/teams-dom-shapes.js', import.meta.url), 'utf8');
  const context = vm.createContext({ globalThis: {} });
  vm.runInContext(source, context);
  return context.globalThis.TeamsArchiveDom;
}

test('cible les wrappers de message Teams Free, distincts de ceux de Teams professionnel', () => {
  const { messageSelector } = loadDomShapeHelpers();
  assert.equal(messageSelector('teams.live.com'), '[data-testid="message-wrapper"]');
});

test('cible exactement les wrappers de message Teams professionnel et jamais le conteneur de liste', () => {
  const { messageSelector } = loadDomShapeHelpers();
  assert.equal(messageSelector('teams.microsoft.com'), '[data-testid="comfy-message-wrapper"]');
});

test('convertit une date Teams française DD/MM/YYYY HH:mm sans inversion mois/jour', () => {
  const { normalizeTeamsTimestamp } = loadDomShapeHelpers();
  assert.equal(normalizeTeamsTimestamp('09/11/2026 14:54'), '2026-11-09T14:54:00');
  assert.equal(normalizeTeamsTimestamp('17/09/2026 09:32'), '2026-09-17T09:32:00');
});

test('utilise l’identifiant de corps pour les messages Teams Free plutôt que l’identifiant visuel du menu', () => {
  const { messageId } = loadDomShapeHelpers();
  const wrapper = { id: 'menur1h', querySelector: (selector) => selector === '[id^="message-body-"]' ? { id: 'message-body-1789649041950' } : null };
  assert.equal(messageId(wrapper), '1789649041950');
});

test('conserve un datetime ISO fourni par Teams', () => {
  const { normalizeTeamsTimestamp } = loadDomShapeHelpers();
  assert.equal(normalizeTeamsTimestamp('2026-09-17T09:32:04.664Z'), '2026-09-17T09:32:04.664Z');
});
