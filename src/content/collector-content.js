// Content script : analyse uniquement le DOM déjà rendu, sans appel réseau ni interception Teams.
(() => {
  if (globalThis.__teamsChannelArchiveInstalled) return;
  globalThis.__teamsChannelArchiveInstalled = true;

  function text(node) { return node?.textContent?.replace(/\s+/g, ' ').trim() || null; }
  const dom = globalThis.TeamsArchiveDom;
  function candidateNodes() { return dom ? [...document.querySelectorAll(dom.messageSelector(window.location.hostname))] : []; }
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
    return { channel: label, records, warnings: [ 'visible-dom-only', ...(records.some((r) => !r.id) ? ['unstable-or-missing-message-id'] : []) ] };
  }
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'COLLECT_VISIBLE_TEAMS') return;
    try { sendResponse({ ok: true, ...collectVisible() }); } catch (error) { sendResponse({ ok: false, error: String(error?.message || error) }); }
    return true;
  });
})();
