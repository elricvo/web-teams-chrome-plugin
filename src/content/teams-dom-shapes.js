// Helpers sans dépendance, chargés avant le collecteur dans le contexte isolé Chrome.
(() => {
  /**
   * Retourne le sélecteur moderne des cartes de conversation. La même surface est
   * aujourd’hui rendue par Teams Free et Teams Microsoft 365 ; le nom d’hôte seul
   * ne suffit donc pas à distinguer la conversation active de la barre latérale.
   */
  function messageSelector(_hostname = '') { return '[data-testid="message-wrapper"]'; }

  /**
   * Ne retient que les cartes qui contiennent un vrai corps de message. Cette
   * garde exclut les aperçus `comfy-message-wrapper` de la liste de conversations.
   */
  function messageNodes(root) {
    if (!root?.querySelectorAll) return [];
    return [...root.querySelectorAll(messageSelector())].filter((node) => Boolean(node.querySelector?.('[id^="message-body-"]')));
  }

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
    const preview = wrapper.querySelector?.('[id^="message-preview-chat-list-item_"]');
    if (preview) return (preview.getAttribute?.('id') || preview.id || '').replace(/^message-preview-chat-list-item_/, '') || null;
    const body = wrapper.querySelector?.('[id^="message-body-"]');
    if (body) return (body.getAttribute?.('id') || body.id || '').replace(/^message-body-/, '') || null;
    const id = wrapper.getAttribute?.('id') || wrapper.id || null;
    return id || null;
  }

  globalThis.TeamsArchiveDom = { messageSelector, messageNodes, normalizeTeamsTimestamp, messageId };
})();
