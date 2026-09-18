import { normalizeMessage, deduplicateMessages, isInPeriod, buildManifest, buildMarkdownArchive, buildImageDownloadPlan } from '../shared/archive-core.js';
import { extractRenderedRecords, buildSessionSummary } from '../collector/teams-adapter.js';
import { isSupportedTeamsUrl } from '../shared/teams-hosts.js';

const $ = (id) => document.getElementById(id);
let session = null;
let historyPoll = null;

/** Affiche un état utilisateur sans exposer le contenu archivé. */
function status(message) { $('status').textContent = message; }

/** Retourne l’onglet actif ; l’extension n’agit jamais sur un autre onglet. */
async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !isSupportedTeamsUrl(tab.url)) throw new Error('Ouvre une conversation ou un canal dans Teams Web avant la capture.');
  return tab;
}

function setExportState(enabled) {
  $('export').disabled = !enabled;
  $('export-markdown').disabled = !enabled;
  $('download-images').disabled = !enabled;
}

function renderHistoryState(nextSession) {
  session = nextSession || session;
  if (!session) return;
  setExportState(true);
  const history = session.history;
  if (!history) return;
  $('stop-history').disabled = history.status !== 'collecting';
  $('collect-history').disabled = history.status === 'collecting';
  const range = history.earliestObserved ? ` borne observée : ${history.earliestObserved.slice(0, 10)}.` : '';
  status(`Historique : ${history.status} — ${session.messages.length} message(s), ${session.replies.length} réponse(s), lot ${history.cycles}/${$('max-cycles').value || 500}.${range}${history.reason ? ` Arrêt : ${history.reason}.` : ''}`);
}

async function refreshHistoryState() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_SESSION' });
  if (!response?.ok || !response.session) return;
  renderHistoryState(response.session);
  if (response.session.history?.status !== 'collecting' && historyPoll) {
    clearInterval(historyPoll); historyPoll = null;
  }
}

/** Lance une collecte DOM progressive uniquement après consentement explicite et borne historique. */
async function collectHistoryAutomatically() {
  if (!$('authorize').checked) throw new Error('Coche la confirmation d’autorisation avant toute collecte.');
  const from = $('from').value;
  if (!from) throw new Error('Renseigne la date « Du » à atteindre avant de lancer la collecte automatique.');
  const tab = await activeTab();
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['src/content/teams-dom-shapes.js', 'src/content/collector-content.js'] });
  const visible = await chrome.tabs.sendMessage(tab.id, { type: 'COLLECT_VISIBLE_TEAMS' });
  if (!visible?.ok || !visible.channel) throw new Error(visible?.error || 'Conversation Teams non identifiable.');
  const runId = crypto.randomUUID();
  const maxCycles = Math.min(1000, Math.max(1, Number($('max-cycles').value) || 500));
  const initialized = await chrome.runtime.sendMessage({ type: 'HISTORY_INIT', runId, channel: visible.channel, requestedPeriod: { from, to: $('to').value || null }, persist: $('persist').checked, startedAt: new Date().toISOString() });
  if (!initialized?.ok) throw new Error(initialized?.error || 'Initialisation de collecte impossible.');
  const started = await chrome.tabs.sendMessage(tab.id, { type: 'START_AUTO_HISTORY', runId, channel: visible.channel, maxCycles, delayMs: 1500 });
  if (!started?.ok) throw new Error(started?.error || 'Démarrage de collecte impossible.');
  session = initialized.session;
  $('stop-history').disabled = false; $('collect-history').disabled = true; setExportState(true);
  status(`Collecte automatique démarrée vers ${from}. Laisse l’onglet Teams ouvert et évite de changer de conversation.`);
  if (historyPoll) clearInterval(historyPoll);
  historyPoll = setInterval(() => { refreshHistoryState().catch(() => {}); }, 1000);
}

async function stopHistoryCollection() {
  const tab = await activeTab();
  await chrome.tabs.sendMessage(tab.id, { type: 'STOP_AUTO_HISTORY' });
  status('Arrêt demandé : le lot courant sera finalisé puis la collecte s’arrêtera.');
}

/** Injecte le collecteur local dans l’onglet Teams validé puis récupère les éléments visibles. */
async function captureVisible() {
  if (!$('authorize').checked) throw new Error('Coche la confirmation d’autorisation avant toute capture.');
  const tab = await activeTab();
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['src/content/teams-dom-shapes.js', 'src/content/collector-content.js'] });
  const response = await chrome.tabs.sendMessage(tab.id, { type: 'COLLECT_VISIBLE_TEAMS' });
  if (!response?.ok) throw new Error(response?.error || 'La capture Teams a échoué.');
  const confirmedKey = response.channel || 'unknown-channel';
  const filtered = extractRenderedRecords(response.records, confirmedKey);
  const normalized = deduplicateMessages([...filtered.messages, ...filtered.replies]);
  const from = $('from').value || null;
  const to = $('to').value || null;
  const inPeriod = normalized.messages.filter((item) => isInPeriod(item.createdAt, from, to).inPeriod);
  const messages = inPeriod.filter((item) => !item.replyToId);
  const replies = inPeriod.filter((item) => item.replyToId);
  const warnings = [...new Set([...response.warnings, ...filtered.warnings, ...normalized.conflicts.map((item) => item.reason)])];
  session = { channel: { team: null, channel: response.channel }, requestedPeriod: { from, to }, messages, replies, warnings, rawCaptureCount: response.records.length };
  const summary = buildSessionSummary(session);
  await chrome.runtime.sendMessage({ type: 'SAVE_SESSION', persist: $('persist').checked, session });
  setExportState(true);
  status(`${summary.counts.messages} publication(s), ${summary.counts.replies} réponse(s) capturée(s). État : ${summary.status}.`);
}

/** Télécharge un texte comme fichier local sans requête réseau. */
async function downloadText(filename, content, mime) {
  const url = `data:${mime};charset=utf-8,${encodeURIComponent(content)}`;
  await chrome.downloads.download({ url, filename, saveAs: true });
}

/** Exporte le JSON brut et le manifeste d’exhaustivité limitée, sur demande explicite. */
async function exportArchive() {
  if (!session) throw new Error('Aucune session à exporter.');
  const manifest = buildManifest({ ...session, errors: session.warnings });
  const stamp = new Date().toISOString().slice(0, 10);
  await downloadText(`teams-archive-${stamp}.json`, JSON.stringify({ session, manifest }, null, 2), 'application/json');
  await downloadText(`teams-archive-${stamp}-manifest.json`, JSON.stringify(manifest, null, 2), 'application/json');
  status('Export JSON demandé : vérifie la destination choisie par Chrome.');
}

/** Exporte une version Markdown lisible, sans HTML Teams exécutable. */
async function exportMarkdown() {
  if (!session) throw new Error('Aucune session à exporter.');
  const stamp = new Date().toISOString().slice(0, 10);
  await downloadText(`teams-archive-${stamp}.md`, buildMarkdownArchive(session, stamp), 'text/markdown');
  status('Export Markdown demandé : vérifie la destination choisie par Chrome.');
}

/** Télécharge seulement les images HTTP(S) déjà rendues, après un clic explicite. */
async function downloadRenderedImages() {
  if (!session) throw new Error('Aucune session à exporter.');
  const stamp = new Date().toISOString().slice(0, 10);
  const plan = buildImageDownloadPlan([...session.messages, ...session.replies], stamp);
  if (!plan.length) { status('Aucune image HTTP(S) rendue à télécharger dans cette capture.'); return; }
  const results = await Promise.allSettled(plan.map((image) => chrome.downloads.download({
    url: image.url,
    filename: image.filename,
    conflictAction: 'uniquify',
    saveAs: false
  })));
  const succeeded = results.filter((result) => result.status === 'fulfilled').length;
  const failed = results.length - succeeded;
  status(failed ? `${succeeded} image(s) téléchargée(s) dans teams-archive-images/${stamp}/ ; ${failed} échec(s) (lien expiré ou accès refusé).` : `${succeeded} image(s) téléchargée(s) dans teams-archive-images/${stamp}/.`);
}

/** Efface de manière explicite les sessions locales persistantes et temporaires. */
async function erase() {
  if (historyPoll) { clearInterval(historyPoll); historyPoll = null; }
  await chrome.runtime.sendMessage({ type: 'ERASE_SESSION' });
  session = null; setExportState(false); $('stop-history').disabled = true; $('collect-history').disabled = false; status('Session locale effacée.');
}

$('capture').addEventListener('click', async () => { try { status('Capture du contenu actuellement rendu…'); await captureVisible(); } catch (error) { status(`Arrêt sûr : ${error.message}`); } });
$('collect-history').addEventListener('click', async () => { try { await collectHistoryAutomatically(); } catch (error) { status(`Collecte historique non démarrée : ${error.message}`); } });
$('stop-history').addEventListener('click', async () => { try { await stopHistoryCollection(); } catch (error) { status(`Arrêt non réalisé : ${error.message}`); } });
$('export').addEventListener('click', async () => { try { await exportArchive(); } catch (error) { status(`Export JSON non réalisé : ${error.message}`); } });
$('export-markdown').addEventListener('click', async () => { try { await exportMarkdown(); } catch (error) { status(`Export Markdown non réalisé : ${error.message}`); } });
$('download-images').addEventListener('click', async () => { try { await downloadRenderedImages(); } catch (error) { status(`Téléchargement des images non réalisé : ${error.message}`); } });
$('erase').addEventListener('click', erase);
refreshHistoryState().catch(() => {});
