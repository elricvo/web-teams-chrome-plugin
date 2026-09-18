// Content script : analyse uniquement le DOM déjà rendu, sans appel réseau ni interception Teams.
(() => {
  if (globalThis.__teamsChannelArchiveInstalled) return;
  globalThis.__teamsChannelArchiveInstalled = true;

  function text(node) { return node?.textContent?.replace(/\s+/g, ' ').trim() || null; }
  const dom = globalThis.TeamsArchiveDom;
  // Les hôtes Microsoft 365 et Teams Free peuvent présenter simultanément une
  // barre de prévisualisation et la conversation. Seule la présence d’un corps
  // `message-body-*` qualifie un élément comme message de la conversation active.
  function candidateNodes() { return dom?.messageNodes ? dom.messageNodes(document) : []; }
  function channelLabel() {
    const heading = document.querySelector('h1,[role="heading"][aria-level="1"],header [data-tid*="channel"]');
    return text(heading) || document.title || null;
  }
  /** Retourne les images de contenu ou pièces jointes visuelles, jamais les avatars/réactions. */
  function renderedImages(node) {
    return [...node.querySelectorAll('[data-message-content] img[src], [data-tid="file-attachment-grid"] img[src]')].map((image) => {
      const rawUrl = image.currentSrc || image.getAttribute('src');
      try {
        const url = new URL(rawUrl, document.baseURI);
        return /^https?:$/.test(url.protocol) ? { url: url.href, alt: image.getAttribute('alt') || image.getAttribute('aria-label') || 'Image Teams' } : null;
      } catch { return null; }
    }).filter(Boolean);
  }
  function collectVisible() {
    const label = channelLabel();
    const records = candidateNodes().map((node, index) => {
      const id = dom?.messageId(node) || null;
      const authorNode = node.querySelector('[data-tid="message-author-name"],[data-tid*="author"],[aria-label*="Author"]');
      const timeNode = node.querySelector('time[datetime],time,[data-tid*="timestamp"]');
      const rawTimestamp = timeNode?.getAttribute('datetime') || text(timeNode);
      const createdAt = dom?.normalizeTeamsTimestamp(rawTimestamp) || rawTimestamp || null;
      const replyToId = node.getAttribute('data-reply-to-id') || null;
      return { id, channelKey: label || 'unknown-channel', replyToId, author: text(authorNode), createdAt, html: node.innerHTML, images: renderedImages(node), domIndex: index };
    });
    const warnings = [
      'visible-dom-only',
      ...(records.length === 0 ? ['conversation-message-surface-not-found'] : []),
      ...(records.some((r) => !r.id) ? ['unstable-or-missing-message-id'] : []),
      ...(records.some((r) => !r.createdAt) ? ['missing-message-timestamp'] : [])
    ];
    return { channel: label, records, warnings };
  }
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'COLLECT_VISIBLE_TEAMS') return;
    try { sendResponse({ ok: true, ...collectVisible() }); } catch (error) { sendResponse({ ok: false, error: String(error?.message || error) }); }
    return true;
  });
})();
