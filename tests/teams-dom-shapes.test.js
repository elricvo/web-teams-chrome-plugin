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

test('privilégie les vrais messages de conversation rendus, indépendamment de l’hôte Teams', () => {
  const { messageNodes } = loadDomShapeHelpers();
  const bodyWrapper = { id: 'body', querySelector: (selector) => selector === '[id^="message-body-"]' ? { id: 'message-body-100' } : null };
  const railPreview = { id: 'rail', querySelector: (selector) => selector === '[id^="message-body-"]' ? null : { id: 'message-preview-chat-list-item_abc' } };
  const root = { querySelectorAll: (selector) => selector === '[data-testid="message-wrapper"]' ? [bodyWrapper, railPreview] : [] };
  const selected = messageNodes(root);
  assert.equal(selected.length, 1);
  assert.equal(selected[0], bodyWrapper);
});

test('ne confond pas les aperçus de la barre latérale avec la conversation active', () => {
  const { messageNodes } = loadDomShapeHelpers();
  const railPreview = { querySelector: () => null };
  const root = { querySelectorAll: () => [railPreview] };
  assert.equal(messageNodes(root).length, 0);
});

test('extrait seulement le HTML du contenu du message, sans auteur ni réactions', () => {
  const { messageContentHtml } = loadDomShapeHelpers();
  const wrapper = { innerHTML: '<span>VANOVERBEKE, Eric</span><div data-message-content><p>Bonjour</p></div><div>1 réaction</div>', querySelector: (selector) => selector === '[data-message-content]' ? { innerHTML: '<p>Bonjour</p>' } : null };
  assert.equal(messageContentHtml(wrapper), '<p>Bonjour</p>');
});

test('conserve un texte vide plutôt que les réactions lorsqu’un message n’a pas de contenu', () => {
  const { messageContentHtml } = loadDomShapeHelpers();
  assert.equal(messageContentHtml({ innerHTML: '<div>1 réaction</div>', querySelector: () => null }), '');
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
