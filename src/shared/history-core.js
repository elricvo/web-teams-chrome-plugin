/**
 * Décide l'arrêt d'une collecte DOM progressive sans prétendre prouver une exhaustivité.
 * La borne date est prioritaire ; l'absence de nouveaux IDs au sommet déclenche un arrêt prudent.
 */
export function decideHistoryStop({ targetFrom = null, earliestObserved = null, newUniqueCount = 0, stagnantCycles = 0, cycle = 0, maxCycles = 500, atTop = false } = {}) {
  const nextStagnantCycles = newUniqueCount > 0 ? 0 : stagnantCycles + 1;
  if (cycle >= maxCycles) return { stop: true, reason: 'max-cycles-reached', nextStagnantCycles };
  const target = targetFrom ? Date.parse(`${targetFrom}T00:00:00.000Z`) : Number.NaN;
  const earliest = earliestObserved ? Date.parse(earliestObserved) : Number.NaN;
  if (!Number.isNaN(target) && !Number.isNaN(earliest) && earliest <= target) {
    return { stop: true, reason: 'target-date-reached', nextStagnantCycles };
  }
  if (atTop && nextStagnantCycles >= 4) return { stop: true, reason: 'history-top-stable', nextStagnantCycles };
  return { stop: false, reason: null, nextStagnantCycles };
}

/**
 * Fusionne des messages déjà capturés et un lot rendu récemment, sans dépendre de l'ordre DOM.
 * Les enregistrements sans ID restent distingués par une empreinte déterministe de secours.
 */
export function mergeHistoryRecords(existing = [], incoming = []) {
  const keyFor = (record) => record.id ? `id:${record.id}` : `fallback:${record.createdAt || ''}|${record.author || ''}|${record.html || record.text || ''}`;
  const index = new Map(existing.map((record) => [keyFor(record), record]));
  let newUniqueCount = 0;
  incoming.forEach((record) => {
    const key = keyFor(record);
    if (!index.has(key)) newUniqueCount += 1;
    index.set(key, record);
  });
  const records = [...index.values()].sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
  const timestamps = records.map((record) => record.createdAt).filter((value) => !Number.isNaN(Date.parse(value))).sort();
  return { records, newUniqueCount, earliestObserved: timestamps[0] || null, latestObserved: timestamps.at(-1) || null };
}
