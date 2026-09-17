// Content script : analyse uniquement le DOM déjà rendu, sans appel réseau ni interception Teams.
(() => {
  if (globalThis.__teamsChannelArchiveInstalled) return;
  globalThis.__teamsChannelArchiveInstalled = true;

  function text(node) { return node?.textContent?.replace(/\s+/g, ' ').trim() || null; }
  function candidateNodes() { return [...document.querySelectorAll('[data-message-id],[data-tid*="message"],[role="article"]')]; }
  function channelLabel() {
    const heading = document.querySelector('h1,[role="heading"][aria-level="1"],header [data-tid*="channel"]');
    return text(heading) || document.title || null;
  }
  function collectVisible() {
    const label = channelLabel();
    const records = candidateNodes().map((node, index) => {
      const id = node.getAttribute('data-message-id') || node.id || null;
      const authorNode = node.querySelector('[data-tid*="author"],[data-tid*="sender"],[aria-label*="Author"]');
      const timeNode = node.querySelector('time,[data-tid*="timestamp"]');
      const replyToId = node.getAttribute('data-reply-to-id') || null;
      return { id, channelKey: label || 'unknown-channel', replyToId, author: text(authorNode), createdAt: timeNode?.getAttribute('datetime') || text(timeNode), html: node.innerHTML, domIndex: index };
    });
    return { channel: label, records, warnings: [ 'visible-dom-only', ...(records.some((r) => !r.id) ? ['unstable-or-missing-message-id'] : []) ] };
  }
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'COLLECT_VISIBLE_TEAMS') return;
    try { sendResponse({ ok: true, ...collectVisible() }); } catch (error) { sendResponse({ ok: false, error: String(error?.message || error) }); }
    return true;
  });
})();
