import test from 'node:test';
import assert from 'node:assert/strict';
import { decideHistoryStop, mergeHistoryRecords } from '../src/shared/history-core.js';

test('arrête quand la borne historique demandée est observée', () => {
  const result = decideHistoryStop({
    targetFrom: '2026-06-18',
    earliestObserved: '2026-06-17T23:59:00Z',
    newUniqueCount: 4,
    stagnantCycles: 0,
    cycle: 12,
    maxCycles: 500,
    atTop: false
  });
  assert.deepEqual(result, { stop: true, reason: 'target-date-reached', nextStagnantCycles: 0 });
});

test('n’arrête pas sur une borne récente tant que la date cible est absente', () => {
  const result = decideHistoryStop({
    targetFrom: '2026-06-18',
    earliestObserved: '2026-07-01T08:00:00Z',
    newUniqueCount: 3,
    stagnantCycles: 0,
    cycle: 12,
    maxCycles: 500,
    atTop: false
  });
  assert.deepEqual(result, { stop: false, reason: null, nextStagnantCycles: 0 });
});

test('arrête au haut de liste après quatre lots stables sans nouvel identifiant', () => {
  const result = decideHistoryStop({
    targetFrom: '2026-01-01',
    earliestObserved: '2026-06-20T08:00:00Z',
    newUniqueCount: 0,
    stagnantCycles: 3,
    cycle: 12,
    maxCycles: 500,
    atTop: true
  });
  assert.deepEqual(result, { stop: true, reason: 'history-top-stable', nextStagnantCycles: 4 });
});

test('arrête au plafond de cycles sans boucler indéfiniment', () => {
  const result = decideHistoryStop({
    targetFrom: null,
    earliestObserved: null,
    newUniqueCount: 1,
    stagnantCycles: 0,
    cycle: 500,
    maxCycles: 500,
    atTop: false
  });
  assert.deepEqual(result, { stop: true, reason: 'max-cycles-reached', nextStagnantCycles: 0 });
});

test('fusionne les lots par identifiant stable sans perdre les messages plus anciens', () => {
  const merged = mergeHistoryRecords(
    [{ id: 'newer', createdAt: '2026-09-18T10:00:00Z', text: 'Nouveau' }],
    [{ id: 'older', createdAt: '2026-09-17T10:00:00Z', text: 'Ancien' }, { id: 'newer', createdAt: '2026-09-18T10:00:00Z', text: 'Nouveau' }]
  );
  assert.equal(merged.records.length, 2);
  assert.equal(merged.newUniqueCount, 1);
  assert.equal(merged.earliestObserved, '2026-09-17T10:00:00Z');
});
