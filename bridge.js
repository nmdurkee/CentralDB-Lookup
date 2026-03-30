// Runs in ISOLATED world — can access chrome.storage
// Listens for token events dispatched by the MAIN world content script
document.addEventListener('__cdb_save_token', (e) => {
  const token = e.detail;
  if (token) {
    chrome.storage.local.set({ bearerToken: token, tokenSavedAt: Date.now() });
  }
});
