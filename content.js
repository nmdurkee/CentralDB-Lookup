// Injected onto centraldb.spectrumvoip.com
// Adds a floating button that triggers a fresh API call, catches the token, saves it

(function () {
  // Wait for DOM
  function init() {
    if (document.getElementById('__cdb_grab_btn')) return;

    const btn = document.createElement('button');
    btn.id = '__cdb_grab_btn';
    btn.textContent = '🔑 Copy Token';
    Object.assign(btn.style, {
      position: 'fixed', bottom: '20px', right: '20px', zIndex: '999999',
      background: '#3b82f6', color: 'white', border: 'none',
      borderRadius: '8px', padding: '10px 18px', fontSize: '13px',
      fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
      fontFamily: 'sans-serif', letterSpacing: '0.02em'
    });

    btn.addEventListener('click', async () => {
      btn.textContent = '⏳ Grabbing...';
      btn.style.background = '#1d4ed8';
      btn.disabled = true;

      try {
        // Make a real API call — the page will attach the auth header automatically
        // We intercept it via the XMLHttpRequest override below
        window.__cdb_token_resolve = null;
        const tokenPromise = new Promise((resolve) => {
          window.__cdb_token_resolve = resolve;
        });

        // Trigger a fetch to the API — page's MSAL will attach the Bearer token
        fetch('https://centraldb.spectrumvoip.com:8081/api/v1/master-search?search=test&module=connectwise')
          .catch(() => {}); // ignore response errors, we just want the header

        // Wait up to 5 seconds for the token to be caught
        const token = await Promise.race([
          tokenPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]);

        if (token) {
          // Copy to clipboard
          await navigator.clipboard.writeText(token);
          // Send to extension storage via custom event (picked up by isolated world script)
          document.dispatchEvent(new CustomEvent('__cdb_save_token', { detail: token }));
          showToast('✅ Token copied & saved!', '#15803d');
          btn.textContent = '✅ Token Saved';
          btn.style.background = '#15803d';
          setTimeout(() => {
            btn.textContent = '🔑 Copy Token';
            btn.style.background = '#3b82f6';
            btn.disabled = false;
          }, 3000);
        }
      } catch (e) {
        showToast('❌ ' + e.message, '#ef4444');
        btn.textContent = '🔑 Copy Token';
        btn.style.background = '#3b82f6';
        btn.disabled = false;
      }
    });

    document.body.appendChild(btn);

    // Override XMLHttpRequest to catch the Authorization header
    const _open = XMLHttpRequest.prototype.open;
    const _setHeader = XMLHttpRequest.prototype.setRequestHeader;

    XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
      if (name.toLowerCase() === 'authorization' && value.toLowerCase().startsWith('bearer ')) {
        const token = value.replace(/^[Bb]earer\s+/, '');
        if (window.__cdb_token_resolve) {
          window.__cdb_token_resolve(token);
          window.__cdb_token_resolve = null;
        }
        // Also always dispatch so extension stays updated
        document.dispatchEvent(new CustomEvent('__cdb_save_token', { detail: token }));
      }
      return _setHeader.apply(this, arguments);
    };

    // Also intercept fetch
    const _fetch = window.fetch;
    window.fetch = function (...args) {
      const result = _fetch.apply(this, args);
      // Try to get auth from request
      try {
        let auth = null;
        if (args[1]?.headers) {
          const h = args[1].headers;
          auth = h instanceof Headers ? h.get('authorization') : (h['authorization'] || h['Authorization']);
        }
        if (auth?.toLowerCase().startsWith('bearer ')) {
          const token = auth.replace(/^[Bb]earer\s+/, '');
          if (window.__cdb_token_resolve) {
            window.__cdb_token_resolve(token);
            window.__cdb_token_resolve = null;
          }
          document.dispatchEvent(new CustomEvent('__cdb_save_token', { detail: token }));
        }
      } catch (_) {}
      return result;
    };
  }

  function showToast(msg, bg) {
    const old = document.getElementById('__cdb_toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.id = '__cdb_toast';
    t.textContent = msg;
    Object.assign(t.style, {
      position: 'fixed', bottom: '70px', right: '20px', zIndex: '999999',
      background: bg, color: 'white', borderRadius: '8px',
      padding: '10px 16px', fontSize: '13px', fontWeight: '600',
      fontFamily: 'sans-serif', boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
    });
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init);
})();
