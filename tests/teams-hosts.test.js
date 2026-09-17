import test from 'node:test';
import assert from 'node:assert/strict';
import { isSupportedTeamsUrl } from '../src/shared/teams-hosts.js';

test('accepte Teams Free personnel sur teams.live.com', () => {
  assert.equal(isSupportedTeamsUrl('https://teams.live.com/v2/'), true);
});

test('accepte les hôtes Teams professionnel prévus', () => {
  assert.equal(isSupportedTeamsUrl('https://teams.microsoft.com/v2/'), true);
  assert.equal(isSupportedTeamsUrl('https://teams.cloud.microsoft/'), true);
});

test('refuse les autres origines', () => {
  assert.equal(isSupportedTeamsUrl('https://example.com/'), false);
});
