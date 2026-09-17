// Helpers sans dépendance, chargés avant le collecteur dans le contexte isolé Chrome.
(() => {
  /** Retourne le sélecteur du wrapper Teams observé dans le MHTML de qualification. */
  function messageSelector() { return '[data-testid="comfy-message-wrapper"]'; }

  /** Normalise uniquement les formats de date observés ; ne devine pas les dates relatives. */
  function normalizeTeamsTimestamp(value) {
    if (typeof value !== 'string') return null;
    const input = value.trim();
    if (/^\d{4}-\d{2}-\d{2}T/.test(input)) return input;
    const match = input.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const [, day, month, year, hour, minute] = match;
    return `${year}-${month}-${day}T${hour.padStart(2, '0')}:${minute}:00`;
  }

  /** Extrait l’identifiant stable du vrai élément de message, sans utiliser l’ID du panneau. */
  function messageId(wrapper) {
    const node = wrapper.querySelector?.('[id^="message-preview-chat-list-item_"]') || wrapper;
    const id = node.getAttribute?.('id') || node.id || null;
    return id?.replace(/^message-preview-chat-list-item_/, '') || null;
  }

  globalThis.TeamsArchiveDom = { messageSelector, normalizeTeamsTimestamp, messageId };
})();
