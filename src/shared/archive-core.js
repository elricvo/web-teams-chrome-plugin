/* Fonctions pures de normalisation et d’export du contenu Teams rendu dans le DOM. */

/**
 * Transforme du HTML non fiable en texte sans exécuter de contenu.
 * L’approche retire les blocs exécutables et balises, puis décode les entités simples.
 * @param {string|null|undefined} html Contenu HTML collecté.
 * @returns {string} Texte inerte, normalisé pour la recherche et l’export.
 */
export function toSafeText(html) {
  if (typeof html !== 'string') return '';
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Évite qu'un contenu archivé ne devienne une structure Markdown active. */
export function quoteMarkdown(value) {
  return String(value ?? '').replace(/\r\n?/g, '\n').split('\n').map((line) => `> ${line}`).join('\n');
}

/** Produit un nom local déterministe et sans chemin pour une image rendue. */
export function imageFilename(url, index) {
  let extension = 'img';
  try {
    const name = new URL(url).pathname.split('/').pop() || '';
    const match = name.match(/\.([a-z0-9]{1,5})$/i);
    if (match) extension = match[1].toLowerCase();
  } catch { /* URL invalide : conservée avec une extension générique. */ }
  return `image-${String(index + 1).padStart(3, '0')}.${extension}`;
}

/**
 * Prépare les images HTTP(S) déjà rendues pour un téléchargement explicitement demandé.
 * Les données `blob:`, `data:` et les vidéos sont hors périmètre.
 */
export function buildImageDownloadPlan(messages = [], stamp = 'archive') {
  const seen = new Set();
  const plan = [];
  messages.forEach((message) => (message.images || []).forEach((image) => {
    const url = image?.url;
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url) || seen.has(url)) return;
    seen.add(url);
    plan.push({ url, alt: String(image.alt || 'Image Teams'), filename: `teams-archive-images/${stamp}/${imageFilename(url, plan.length)}` });
  }));
  return plan;
}

/** Échappe le texte d’alternative afin qu’une image rendue ne puisse pas casser la syntaxe Markdown. */
export function markdownImageAlt(value) {
  return String(value ?? 'Image Teams').replace(/[\\\[\]\\]/g, '\\$&').replace(/\r?\n/g, ' ');
}

/** Construit une archive Markdown lisible sans insérer le HTML Teams non fiable. */
export function buildMarkdownArchive({ channel = {}, requestedPeriod = {}, messages = [], replies = [], warnings = [] } = {}, stamp = new Date().toISOString().slice(0, 10)) {
  const all = [...messages, ...replies].slice().sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
  const imagePlan = buildImageDownloadPlan(all, stamp);
  const filenameByUrl = new Map(imagePlan.map((image) => [image.url, image.filename]));
  const lines = [
    '# Archive Teams — consultation locale',
    '',
    '> Ce document est dérivé du contenu rendu dans Teams Web. Il ne constitue pas un export officiel ni une preuve d’exhaustivité.',
    '',
    '## Périmètre',
    '',
    `- **Conversation / canal :** ${channel.channel || 'Non identifié'}`,
    `- **Période demandée :** ${requestedPeriod.from || 'sans borne'} → ${requestedPeriod.to || 'sans borne'}`,
    `- **Messages :** ${messages.length} · **réponses :** ${replies.length}`,
    `- **Limites :** ${warnings.length ? warnings.join(', ') : 'aucune signalée'}`,
    '',
    '## Échanges',
    ''
  ];
  all.forEach((message, index) => {
    lines.push(`### ${index + 1}. ${message.author || 'Auteur inconnu'} — ${message.createdAt || 'Date indisponible'}`, '', quoteMarkdown(message.text || '(message sans texte)'));
    const images = (message.images || []).map((image) => ({ ...image, filename: filenameByUrl.get(image.url) })).filter((image) => image.filename);
    if (images.length) {
      lines.push('', 'Images rendues associées :');
      images.forEach((image) => lines.push(`- ${message.createdAt || 'Date indisponible'} — ![${markdownImageAlt(image.alt)}](${image.filename}) (téléchargement explicite requis)`));
    }
    lines.push('');
  });
  return `${lines.join('\n')}\n`;
}

/**
 * Normalise un message rendu en un objet stable sans inventer les métadonnées absentes.
 * @param {object} raw Données extraites du DOM Teams.
 * @returns {object} Message normalisé avec indicateurs de qualité.
 */
export function normalizeMessage(raw = {}) {
  const quality = ['html-sanitized'];
  const id = raw.id ?? null;
  const createdAt = raw.createdAt ?? null;
  if (!id) quality.push('missing-id');
  if (!createdAt) quality.push('missing-created-at');
  return {
    id,
    threadId: raw.threadId ?? null,
    replyToId: raw.replyToId ?? null,
    author: raw.author ?? null,
    createdAt,
    lastModifiedAt: raw.lastModifiedAt ?? createdAt,
    html: typeof raw.html === 'string' ? raw.html : '',
    text: toSafeText(raw.html),
    attachments: Array.isArray(raw.attachments) ? raw.attachments : [],
    images: Array.isArray(raw.images) ? raw.images.filter((image) => image && typeof image.url === 'string').map((image) => ({ url: image.url, alt: typeof image.alt === 'string' ? image.alt : 'Image Teams' })) : [],
    quality
  };
}

/**
 * Dédoublonne une liste de messages en préférant la version la plus récemment modifiée.
 * @param {object[]} messages Messages normalisés.
 * @returns {{messages: object[], conflicts: object[]}} Messages canoniques et conflits tracés.
 */
export function deduplicateMessages(messages = []) {
  const byKey = new Map();
  const conflicts = [];
  messages.forEach((message, index) => {
    const fallback = `${message.createdAt ?? 'unknown'}|${message.author ?? 'unknown'}|${message.text ?? ''}`;
    const key = message.id ? `id:${message.id}` : `fallback:${fallback}`;
    const previous = byKey.get(key);
    if (!previous) { byKey.set(key, message); return; }
    const previousTime = Date.parse(previous.lastModifiedAt ?? '') || 0;
    const currentTime = Date.parse(message.lastModifiedAt ?? '') || 0;
    const winner = currentTime >= previousTime ? message : previous;
    byKey.set(key, winner);
    conflicts.push({ key, discardedIndex: currentTime >= previousTime ? index - 1 : index, reason: 'duplicate-message' });
  });
  return { messages: [...byKey.values()], conflicts };
}

/**
 * Détermine l’appartenance d’un horodatage à une période inclusive.
 * @param {string|null} value Horodatage source.
 * @param {string|null} from Borne inférieure YYYY-MM-DD ou ISO.
 * @param {string|null} to Borne supérieure YYYY-MM-DD ou ISO.
 * @returns {{inPeriod: boolean, reason: string|null}} Décision et motif éventuel.
 */
export function isInPeriod(value, from, to) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { inPeriod: false, reason: 'invalid-date' };
  const start = from ? new Date(`${from}T00:00:00.000Z`) : null;
  const end = to ? new Date(`${to}T23:59:59.999Z`) : null;
  if (start && Number.isNaN(start.getTime())) return { inPeriod: false, reason: 'invalid-from' };
  if (end && Number.isNaN(end.getTime())) return { inPeriod: false, reason: 'invalid-to' };
  if (start && date < start) return { inPeriod: false, reason: 'before-period' };
  if (end && date > end) return { inPeriod: false, reason: 'after-period' };
  return { inPeriod: true, reason: null };
}

/**
 * Produit un manifeste d’archive qui expose explicitement le périmètre et les limites.
 * @param {object} session État de session de collecte.
 * @returns {object} Manifeste exportable JSON.
 */
export function buildManifest({ channel = {}, requestedPeriod = {}, messages = [], replies = [], errors = [], history = null } = {}) {
  const timestamps = [...messages, ...replies].map((item) => item.createdAt).filter(Boolean).map(Date.parse).filter((value) => !Number.isNaN(value));
  const limitations = [...new Set(errors)];
  const requestedStart = requestedPeriod.from ?? null;
  const requestedEnd = requestedPeriod.to ?? null;
  const observedStart = timestamps.length ? new Date(Math.min(...timestamps)).toISOString() : null;
  const observedEnd = timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : null;
  const completeRange = Boolean(observedStart && observedEnd && requestedStart && requestedEnd && observedStart.slice(0, 10) <= requestedStart && observedEnd.slice(0, 10) >= requestedEnd && !limitations.length);
  return {
    format: 'teams-channel-archive-manifest',
    formatVersion: '0.1.0',
    generatedAt: new Date().toISOString(),
    channel: { team: channel.team ?? null, channel: channel.channel ?? null },
    requestedPeriod: { from: requestedStart, to: requestedEnd },
    observedPeriod: { from: observedStart, to: observedEnd },
    counts: { messages: messages.length, replies: replies.length },
    limitations,
    ...(history ? { historyCollection: { status: history.status || null, reason: history.reason || null, cycles: Number.isFinite(history.cycles) ? history.cycles : null, earliestObserved: history.earliestObserved || null, latestObserved: history.latestObserved || null, outOfPeriodCount: Number.isFinite(history.outOfPeriodCount) ? history.outOfPeriodCount : 0 } } : {}),
    coverage: { status: completeRange ? 'observed-range-only' : 'partial', statement: 'Archive locale de consultation ; exhaustivité non garantie.' }
  };
}
