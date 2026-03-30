// Background service worker — stays alive even when popup is closed
// Listens for token messages from content script via chrome.runtime

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'CDB_TOKEN' && msg.token) {
    chrome.storage.local.set({ bearerToken: msg.token, tokenSavedAt: Date.now() });
  }
});
