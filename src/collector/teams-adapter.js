import { normalizeMessage } from '../shared/archive-core.js';

/**
 * Filtre et normalise des enregistrements déjà rendus pour un canal confirmé.
 * Cette fonction pure permet de tester la politique de périmètre hors navigateur.
 * @param {object[]} records Éléments produits par l’adaptateur DOM.
 * @param {string} confirmedChannelKey Clé Team/canal confirmée par l’utilisateur.
 * @returns {{messages: object[], replies: object[], warnings: string[], ignored: number}} Résultat normalisé.
 */
export function extractRenderedRecords(records = [], confirmedChannelKey) {
  const messages = [];
  const replies = [];
  const warnings = [];
  let ignored = 0;
  records.forEach((record) => {
    if (record.channelKey !== confirmedChannelKey) { ignored += 1; return; }
    const normalized = normalizeMessage(record);
    if (normalized.replyToId) replies.push(normalized); else messages.push(normalized);
  });
  const roots = new Set(messages.map((message) => message.id).filter(Boolean));
  replies.forEach((reply) => { if (reply.replyToId && !roots.has(reply.replyToId)) warnings.push(`orphan-reply:${reply.id ?? 'unknown'}`); });
  return { messages, replies, warnings, ignored };
}

/**
 * Résume une session pour l’interface sans qualifier une couverture d’intégrale.
 * @param {object} session Messages, réponses, avertissements et canal confirmés.
 * @returns {object} État de couverture et texte de sécurité.
 */
export function buildSessionSummary({ messages = [], replies = [], warnings = [], channel = {} } = {}) {
  return {
    channel,
    counts: { messages: messages.length, replies: replies.length },
    warnings,
    status: warnings.length ? 'partial' : 'observed-range-only',
    userStatement: 'Archive locale de consultation du contenu rendu ; exhaustivité non garantie.'
  };
}
