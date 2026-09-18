// Service worker : persistance locale et agrégation de lots explicitement déclenchés par le popup.
import { isInPeriod, normalizeMessage } from '../shared/archive-core.js';
import { decideHistoryStop, mergeHistoryRecords } from '../shared/history-core.js';

const SESSION_KEY = 'teamsArchiveSession';

async function readSession() {
  const inMemory = await chrome.storage.session.get(SESSION_KEY);
  if (inMemory[SESSION_KEY]) return inMemory[SESSION_KEY];
  const persistent = await chrome.storage.local.get(SESSION_KEY);
  return persistent[SESSION_KEY] || null;
}

async function writeSession(session, persist) {
  await chrome.storage.session.set({ [SESSION_KEY]: session });
  if (persist) await chrome.storage.local.set({ [SESSION_KEY]: session });
  else await chrome.storage.local.remove(SESSION_KEY);
}

function normalizeBatch(records = []) {
  return records.map(normalizeMessage);
}

async function handleMessage(message) {
  if (message?.type === 'GET_SESSION') return { ok: true, session: await readSession() };
  if (message?.type === 'ERASE_SESSION') {
    await chrome.storage.local.remove(SESSION_KEY);
    await chrome.storage.session.remove(SESSION_KEY);
    return { ok: true };
  }
  if (message?.type === 'SAVE_SESSION') {
    await writeSession(message.session, Boolean(message.persist));
    return { ok: true };
  }
  if (message?.type === 'HISTORY_INIT') {
    const { runId, channel, requestedPeriod = {}, persist = false, startedAt } = message;
    if (!runId || !channel) throw new Error('Paramètres de collecte historique incomplets.');
    const session = {
      channel: { team: null, channel }, requestedPeriod,
      messages: [], replies: [], warnings: ['visible-dom-only', 'automated-history-scroll'], rawCaptureCount: 0,
      history: { runId, status: 'collecting', startedAt, endedAt: null, reason: null, cycles: 0, stagnantCycles: 0, earliestObserved: null, latestObserved: null, targetFrom: requestedPeriod.from || null, persist: Boolean(persist) }
    };
    await writeSession(session, Boolean(persist));
    return { ok: true, session };
  }
  if (message?.type === 'HISTORY_BATCH') {
    const session = await readSession();
    if (!session?.history || session.history.runId !== message.runId) throw new Error('Session historique absente ou remplacée.');
    if (session.history.status !== 'collecting') return { ok: true, ignored: true, session };
    if (session.channel.channel !== message.channel) throw new Error('Le canal détecté a changé : lot refusé.');
    const normalized = normalizeBatch(message.records);
    const inPeriod = normalized.filter((record) => isInPeriod(record.createdAt, session.requestedPeriod.from, session.requestedPeriod.to).inPeriod);
    const merged = mergeHistoryRecords([...session.messages, ...session.replies], inPeriod);
    const observedTimestamps = [session.history.earliestObserved, session.history.latestObserved, ...normalized.map((record) => record.createdAt)].filter((value) => !Number.isNaN(Date.parse(value))).sort();
    const earliestObserved = observedTimestamps[0] || null;
    const latestObserved = observedTimestamps.at(-1) || null;
    session.messages = merged.records.filter((record) => !record.replyToId);
    session.replies = merged.records.filter((record) => record.replyToId);
    session.rawCaptureCount += message.records.length;
    session.history.outOfPeriodCount = (session.history.outOfPeriodCount || 0) + normalized.length - inPeriod.length;
    session.warnings = [...new Set([...session.warnings, ...(message.warnings || []), ...(normalized.length !== inPeriod.length ? ['out-of-period-batches-observed'] : [])])];
    const decision = decideHistoryStop({ targetFrom: session.history.targetFrom, earliestObserved, newUniqueCount: merged.newUniqueCount, stagnantCycles: session.history.stagnantCycles, cycle: message.progress.cycle, maxCycles: message.progress.maxCycles, atTop: Boolean(message.progress.atTop) });
    session.history = { ...session.history, cycles: message.progress.cycle, stagnantCycles: decision.nextStagnantCycles, earliestObserved, latestObserved, lastBatchAt: message.progress.at };
    await writeSession(session, session.history.persist);
    return { ok: true, newUniqueCount: merged.newUniqueCount, earliestObserved, decision, session };
  }
  if (message?.type === 'HISTORY_FINISH') {
    const session = await readSession();
    if (!session?.history || session.history.runId !== message.runId) throw new Error('Session historique absente ou remplacée.');
    session.history = { ...session.history, status: message.status, reason: message.reason, endedAt: message.at, cycles: message.progress?.cycle ?? session.history.cycles, stagnantCycles: message.progress?.stagnantCycles ?? session.history.stagnantCycles };
    session.warnings = [...new Set([...session.warnings, ...(message.warnings || []), message.reason || 'history-ended'])];
    await writeSession(session, session.history.persist);
    return { ok: true, session };
  }
  return null;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse).catch((error) => sendResponse({ ok: false, error: String(error?.message || error) }));
  return true;
});
