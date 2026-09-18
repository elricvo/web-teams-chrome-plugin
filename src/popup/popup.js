import { normalizeMessage, deduplicateMessages, isInPeriod, buildManifest, buildMarkdownArchive, buildImageDownloadPlan } from '../shared/archive-core.js';
import { extractRenderedRecords, buildSessionSummary } from '../collector/teams-adapter.js';
import { isSupportedTeamsUrl } from '../shared/teams-hosts.js';

const $ = (id) => document.getElementById(id);
let session = null;

/** Affiche un état utilisateur sans exposer le contenu archivé. */
function status(message) { $('status').textContent = message; }

/** Retourne l’onglet actif ; l’extension n’agit jamais sur un autre onglet. */
async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !isSupportedTeamsUrl(tab.url)) throw new Error('Ouvre une conversation ou un canal dans Teams Web avant la capture.');
  return tab;
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
  $('export').disabled = false;
  $('export-markdown').disabled = false;
  $('download-images').disabled = false;
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
  await chrome.storage.local.remove('teamsArchiveSession');
  await chrome.storage.session.remove('teamsArchiveSession');
  session = null; $('export').disabled = true; $('export-markdown').disabled = true; $('download-images').disabled = true; status('Session locale effacée.');
}

$('capture').addEventListener('click', async () => { try { status('Capture du contenu actuellement rendu…'); await captureVisible(); } catch (error) { status(`Arrêt sûr : ${error.message}`); } });
$('export').addEventListener('click', async () => { try { await exportArchive(); } catch (error) { status(`Export JSON non réalisé : ${error.message}`); } });
$('export-markdown').addEventListener('click', async () => { try { await exportMarkdown(); } catch (error) { status(`Export Markdown non réalisé : ${error.message}`); } });
$('download-images').addEventListener('click', async () => { try { await downloadRenderedImages(); } catch (error) { status(`Téléchargement des images non réalisé : ${error.message}`); } });
$('erase').addEventListener('click', erase);
