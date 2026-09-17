import test from 'node:test';
import assert from 'node:assert/strict';
import { extractRenderedRecords, buildSessionSummary } from '../src/collector/teams-adapter.js';

test('extrait seulement les enregistrements du canal confirmé', () => {
  const result = extractRenderedRecords([
    { channelKey: 'team-a/channel-a', id: '1', author: 'Ada', createdAt: '2026-01-01T10:00:00Z', html: '<p>Bonjour</p>' },
    { channelKey: 'team-b/channel-b', id: '2', author: 'Lin', createdAt: '2026-01-01T11:00:00Z', html: '<p>À ignorer</p>' }
  ], 'team-a/channel-a');
  assert.equal(result.messages.length, 1);
  assert.equal(result.messages[0].id, '1');
  assert.equal(result.ignored, 1);
});

test('signale une réponse sans publication racine connue', () => {
  const result = extractRenderedRecords([
    { channelKey: 'team-a/channel-a', id: 'r-1', replyToId: 'missing-root', author: 'Ada', createdAt: '2026-01-01T10:00:00Z', html: '<p>Réponse</p>' }
  ], 'team-a/channel-a');
  assert.equal(result.replies.length, 1);
  assert.equal(result.warnings.includes('orphan-reply:r-1'), true);
});

test('résume les limites d’une session sans annoncer une intégralité', () => {
  const summary = buildSessionSummary({ messages: [{ id: 'm-1' }], replies: [], warnings: ['dom-ambiguous'], channel: { team: 'A', channel: 'B' } });
  assert.equal(summary.status, 'partial');
  assert.match(summary.userStatement, /exhaustivité non garantie/i);
});
