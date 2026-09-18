// Content script : collecte uniquement le DOM déjà rendu ; le scroll automatique est initié explicitement depuis le popup.
(() => {
  if (globalThis.__teamsChannelArchiveInstalled) return;
  globalThis.__teamsChannelArchiveInstalled = true;

  let historyRun = null;
  const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
  function text(node) { return node?.textContent?.replace(/\s+/g, ' ').trim() || null; }
  const dom = globalThis.TeamsArchiveDom;
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
      const html = dom?.messageContentHtml ? dom.messageContentHtml(node) : '';
      return { id, channelKey: label || 'unknown-channel', replyToId, author: text(authorNode), createdAt, html, images: renderedImages(node), domIndex: index };
    });
    const warnings = [
      'visible-dom-only',
      ...(records.length === 0 ? ['conversation-message-surface-not-found'] : []),
      ...(records.some((r) => !r.id) ? ['unstable-or-missing-message-id'] : []),
      ...(records.some((r) => !r.createdAt) ? ['missing-message-timestamp'] : [])
    ];
    return { channel: label, records, warnings };
  }
  /** Retourne le conteneur de liste effectivement scrollable, sans faire défiler la page entière. */
  function historyScroller() {
    const candidates = [...document.querySelectorAll('[data-tid="message-pane-list-viewport"], [data-tid="message-pane-body"], [role="log"]')];
    for (const candidate of candidates) {
      let node = candidate;
      while (node && node !== document.body) {
        if (node.scrollHeight > node.clientHeight + 8) return node;
        node = node.parentElement;
      }
    }
    return null;
  }
  async function finishHistory(run, status, reason, warnings = []) {
    if (historyRun !== run) return;
    historyRun = null;
    await chrome.runtime.sendMessage({ type: 'HISTORY_FINISH', runId: run.runId, status, reason, warnings, at: new Date().toISOString(), progress: { cycle: run.cycle, stagnantCycles: run.stagnantCycles } });
  }
  async function runHistory(run) {
    try {
      while (!run.stopRequested && run.cycle < run.maxCycles) {
        run.cycle += 1;
        const visible = collectVisible();
        if (!visible.channel || visible.channel !== run.channel) {
          await finishHistory(run, 'stopped', 'channel-changed-or-ambiguous', ['channel-changed-or-ambiguous']);
          return;
        }
        const scroller = historyScroller();
        if (!scroller) {
          await finishHistory(run, 'error', 'history-scroll-container-not-found', ['history-scroll-container-not-found']);
          return;
        }
        const atTop = scroller.scrollTop <= 2;
        const batch = await chrome.runtime.sendMessage({
          type: 'HISTORY_BATCH', runId: run.runId, channel: run.channel, records: visible.records, warnings: visible.warnings,
          progress: { cycle: run.cycle, maxCycles: run.maxCycles, atTop, at: new Date().toISOString() }
        });
        if (!batch?.ok) throw new Error(batch?.error || 'Enregistrement du lot historique impossible.');
        run.stagnantCycles = batch.session?.history?.stagnantCycles ?? run.stagnantCycles;
        if (batch.decision?.stop) {
          await finishHistory(run, 'completed', batch.decision.reason);
          return;
        }
        const step = Math.max(480, Math.floor(scroller.clientHeight * 0.8));
        scroller.scrollBy({ top: -step, left: 0, behavior: 'auto' });
        await wait(run.delayMs);
      }
      await finishHistory(run, run.stopRequested ? 'stopped' : 'completed', run.stopRequested ? 'stopped-by-user' : 'max-cycles-reached');
    } catch (error) {
      await finishHistory(run, 'error', 'history-run-error', ['history-run-error']);
    }
  }
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'COLLECT_VISIBLE_TEAMS') {
      try { sendResponse({ ok: true, ...collectVisible() }); } catch (error) { sendResponse({ ok: false, error: String(error?.message || error) }); }
      return true;
    }
    if (message?.type === 'START_AUTO_HISTORY') {
      if (historyRun) { sendResponse({ ok: false, error: 'Une collecte historique est déjà active dans cet onglet.' }); return false; }
      const run = { runId: message.runId, channel: message.channel, cycle: 0, stagnantCycles: 0, maxCycles: Math.min(1000, Math.max(1, Number(message.maxCycles) || 500)), delayMs: Math.min(5000, Math.max(800, Number(message.delayMs) || 1500)), stopRequested: false };
      historyRun = run;
      runHistory(run);
      sendResponse({ ok: true });
      return false;
    }
    if (message?.type === 'STOP_AUTO_HISTORY') {
      if (historyRun) historyRun.stopRequested = true;
      sendResponse({ ok: true });
      return false;
    }
    return false;
  });
})();
