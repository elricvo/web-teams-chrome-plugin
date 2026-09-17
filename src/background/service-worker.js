// Service worker : session locale et export explicitement déclenché par le popup.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'SAVE_SESSION') return;
  const area = message.persist ? chrome.storage.local : chrome.storage.session;
  area.set({ teamsArchiveSession: message.session }).then(() => sendResponse({ ok: true })).catch((error) => sendResponse({ ok: false, error: String(error) }));
  return true;
});
