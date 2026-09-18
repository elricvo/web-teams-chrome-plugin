import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMessage, deduplicateMessages, isInPeriod, buildManifest, toSafeText, buildImageDownloadPlan, buildMarkdownArchive } from '../src/shared/archive-core.js';

test('normalise un message en texte sûr sans exécuter son HTML', () => {
  const result = normalizeMessage({ id: 'm-1', author: 'Ada', createdAt: '2026-01-05T10:00:00Z', html: '<p>Bonjour <b>équipe</b><script>alert(1)</script></p>' });
  assert.equal(result.id, 'm-1');
  assert.equal(result.text, 'Bonjour équipe');
  assert.equal(result.quality.includes('html-sanitized'), true);
});

test('signale les champs de message absents sans inventer de valeur', () => {
  const result = normalizeMessage({ html: '<p>Sans métadonnée</p>' });
  assert.equal(result.id, null);
  assert.equal(result.author, null);
  assert.equal(result.quality.includes('missing-id'), true);
  assert.equal(result.quality.includes('missing-created-at'), true);
});

test('dédoublonne par identifiant stable et conserve le message le plus récent', () => {
  const result = deduplicateMessages([
    { id: 'm-1', lastModifiedAt: '2026-01-01T10:00:00Z', text: 'ancien' },
    { id: 'm-1', lastModifiedAt: '2026-01-02T10:00:00Z', text: 'nouveau' }
  ]);
  assert.equal(result.messages.length, 1);
  assert.equal(result.messages[0].text, 'nouveau');
  assert.equal(result.conflicts.length, 1);
});

test('marque une date invalide hors période au lieu de l’inclure silencieusement', () => {
  assert.deepEqual(isInPeriod('date-invalide', '2026-01-01', '2026-01-31'), { inPeriod: false, reason: 'invalid-date' });
});

test('inclut les bornes de période', () => {
  assert.deepEqual(isInPeriod('2026-01-31T23:00:00Z', '2026-01-01', '2026-01-31'), { inPeriod: true, reason: null });
});

test('construit un manifeste qui expose les limites et les compteurs', () => {
  const manifest = buildManifest({ channel: { team: 'Test', channel: 'Archives' }, requestedPeriod: { from: '2026-01-01', to: '2026-01-31' }, messages: [{ id: 'm-1', createdAt: '2026-01-02T10:00:00Z' }], replies: [{ id: 'r-1', createdAt: '2026-01-03T10:00:00Z' }], errors: ['thread-not-opened'] });
  assert.equal(manifest.counts.messages, 1);
  assert.equal(manifest.counts.replies, 1);
  assert.equal(manifest.coverage.status, 'partial');
  assert.equal(manifest.limitations.includes('thread-not-opened'), true);
});

test('conserve le protocole de collecte automatique dans le manifeste', () => {
  const manifest = buildManifest({
    channel: { channel: 'Conversation test' }, requestedPeriod: { from: '2026-06-18', to: '2026-09-18' },
    messages: [{ id: 'm-1', createdAt: '2026-06-18T10:00:00Z' }],
    history: { status: 'completed', reason: 'target-date-reached', cycles: 17, earliestObserved: '2026-06-17T23:59:00Z', latestObserved: '2026-09-18T10:00:00Z', outOfPeriodCount: 1 }, errors: ['automated-history-scroll']
  });
  assert.deepEqual(manifest.historyCollection, { status: 'completed', reason: 'target-date-reached', cycles: 17, earliestObserved: '2026-06-17T23:59:00Z', latestObserved: '2026-09-18T10:00:00Z', outOfPeriodCount: 1 });
});

test('transforme le HTML hostile en texte inerte', () => {
  assert.equal(toSafeText('<img src=x onerror=alert(1)>Bonjour&nbsp;<a href="javascript:evil()">monde</a>'), 'Bonjour monde');
});

test('prépare seulement les images HTTPS rendues, sans doublon ni vidéo/blob', () => {
  const plan = buildImageDownloadPlan([{ images: [
    { url: 'https://cdn.example.test/plan.png?token=secret', alt: 'Plan' },
    { url: 'https://cdn.example.test/plan.png?token=secret', alt: 'Doublon' },
    { url: 'blob:https://teams.microsoft.com/abc', alt: 'Non exportable' },
    { url: 'data:image/png;base64,abc', alt: 'Non exportable' }
  ] }], '2026-09-18');
  assert.deepEqual(plan, [{ url: 'https://cdn.example.test/plan.png?token=secret', alt: 'Plan', filename: 'teams-archive-images/2026-09-18/image-001.png' }]);
});

test('génère un Markdown chronologique lisible sans rendre le texte archivé actif', () => {
  const markdown = buildMarkdownArchive({
    channel: { channel: 'Conversation test' },
    requestedPeriod: { from: '2026-09-16', to: '2026-09-18' },
    messages: [{ author: 'Ada', createdAt: '2026-09-18T10:00:00Z', text: '# Faux titre\nBonjour', images: [{ url: 'https://cdn.example.test/plan.webp', alt: 'Plan' }] }],
    warnings: ['visible-dom-only']
  }, '2026-09-18');
  assert.match(markdown, /# Archive Teams/);
  assert.match(markdown, /### 1\. Ada — 2026-09-18T10:00:00Z/);
  assert.match(markdown, /> # Faux titre/);
  assert.match(markdown, /2026-09-18T10:00:00Z — Plan — `teams-archive-images\/2026-09-18\/image-001\.webp`/);
});
