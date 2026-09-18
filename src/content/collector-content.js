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
  function collectVisible() {
    const label = channelLabel();
    const records = candidateNodes().map((node, index) => {
      const id = dom?.messageId(node) || null;
      const authorNode = node.querySelector('[data-tid="message-author-name"],[data-tid*="author"],[aria-label*="Author"]');
      const timeNode = node.querySelector('time[datetime],time,[data-tid*="timestamp"]');
      const rawTimestamp = timeNode?.getAttribute('datetime') || text(timeNode);
      const createdAt = dom?.normalizeTeamsTimestamp(rawTimestamp) || rawTimestamp || null;
      const replyToId = node.getAttribute('data-reply-to-id') || null;
      return { id, channelKey: label || 'unknown-channel', replyToId, author: text(authorNode), createdAt, html: node.innerHTML, domIndex: index };
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
