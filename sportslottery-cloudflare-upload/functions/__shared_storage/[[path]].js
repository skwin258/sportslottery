const sharedKeys = ['sf_config', 'sf_schedule'];
const globalSharedKeys = ['sf_disabled_accounts', 'sf_logout_tokens'];
const sharedAccounts = ['sk1201', 'sk1203', 'sk1205', 'sk1207', 'koko85830'];
const stateKey = 'state';

function getStore(env) {
  return env.SF_STORE || env.SPORTS_STORE || env.SHARED_STORAGE;
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function isAllowedStorageKey(key) {
  if (globalSharedKeys.includes(key)) return true;
  if (sharedKeys.includes(key)) return true;
  const parts = String(key || '').split(':');
  return parts.length === 2 && sharedAccounts.includes(parts[0]) && sharedKeys.includes(parts[1]);
}

async function readState(env) {
  const store = getStore(env);
  if (!store) return {};
  return (await store.get(stateKey, 'json')) || {};
}

async function writeState(env, state) {
  const store = getStore(env);
  if (!store) throw new Error('Missing KV binding SF_STORE');
  await store.put(stateKey, JSON.stringify(state));
}

function clientScript() {
  return `
(function () {
  var sharedKeys = ${JSON.stringify(sharedKeys)};
  var accounts = {
    sk1201: 'aaa888',
    sk1203: 'aaa888',
    sk1205: 'aaa888',
    sk1207: 'aaa888',
    koko85830: 'er85830'
  };
  var userKey = 'sf_active_user';
  var disabledAccountsKey = 'sf_disabled_accounts';
  var logoutTokensKey = 'sf_logout_tokens';
  var clientIdKey = '__shared_storage_client_id';
  var clientId = sessionStorage.getItem(clientIdKey);
  if (!clientId) {
    clientId = String(Date.now()) + '-' + Math.random().toString(36).slice(2);
    sessionStorage.setItem(clientIdKey, clientId);
  }

  var nativeSetItem = Storage.prototype.setItem;
  var nativeRemoveItem = Storage.prototype.removeItem;
  var activeUser = localStorage.getItem(userKey) || '';
  var bootState = {};
  var disabledAccounts = {};
  var logoutTokens = {};

  function isSharedKey(key) {
    return sharedKeys.indexOf(key) !== -1;
  }

  function refreshDisabledAccounts(state) {
    try {
      disabledAccounts = state && state[disabledAccountsKey] ? JSON.parse(state[disabledAccountsKey]) : {};
    } catch (e) {
      disabledAccounts = {};
    }
  }

  function refreshLogoutTokens(state) {
    try {
      logoutTokens = state && state[logoutTokensKey] ? JSON.parse(state[logoutTokensKey]) : {};
    } catch (e) {
      logoutTokens = {};
    }
  }

  function logoutSeenKey(user) {
    return 'sf_logout_seen_' + user;
  }

  function rememberLogoutTokenFor(user, state) {
    if (!user) return;
    var tokens = {};
    try {
      tokens = state && state[logoutTokensKey] ? JSON.parse(state[logoutTokensKey]) : {};
    } catch (e) {
      tokens = {};
    }
    if (tokens[user]) nativeSetItem.call(localStorage, logoutSeenKey(user), String(tokens[user]));
  }

  function scopedKey(key) {
    return activeUser && isSharedKey(key) ? activeUser + ':' + key : key;
  }

  function publish(key, value) {
    if (!activeUser || !isSharedKey(key)) return;
    fetch('/__shared_storage/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: clientId, key: scopedKey(key), value: value })
    }).catch(function () {});
  }

  function applyState(state, shouldReload) {
    refreshDisabledAccounts(state);
    refreshLogoutTokens(state);
    if (activeUser && disabledAccounts[activeUser]) {
      logout();
      return;
    }
    if (activeUser && logoutTokens[activeUser]) {
      var token = String(logoutTokens[activeUser]);
      if (localStorage.getItem(logoutSeenKey(activeUser)) !== token) {
        nativeSetItem.call(localStorage, logoutSeenKey(activeUser), token);
        logout();
        return;
      }
    }
    var changed = false;
    sharedKeys.forEach(function (key) {
      var stateKey = scopedKey(key);
      if (!activeUser || typeof state[stateKey] !== 'string') {
        if (localStorage.getItem(key) !== null) {
          nativeRemoveItem.call(localStorage, key);
          changed = true;
        }
        return;
      }
      if (localStorage.getItem(key) !== state[stateKey]) {
        nativeSetItem.call(localStorage, key, state[stateKey]);
        changed = true;
      }
    });
    if (changed && shouldReload && location.pathname.indexOf('/admin') === -1) location.reload();
  }

  function fetchState(shouldReload) {
    return fetch('/__shared_storage/state', { cache: 'no-store' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (state) { if (state) applyState(state, shouldReload); })
      .catch(function () {});
  }

  try {
    var boot = new XMLHttpRequest();
    boot.open('GET', '/__shared_storage/state', false);
    boot.send(null);
    if (boot.status === 200) {
      bootState = JSON.parse(boot.responseText || '{}');
      applyState(bootState, false);
    }
  } catch (e) {}

  Storage.prototype.setItem = function (key, value) {
    nativeSetItem.apply(this, arguments);
    if (this === localStorage) publish(key, String(value));
  };

  Storage.prototype.removeItem = function (key) {
    nativeRemoveItem.apply(this, arguments);
    if (this === localStorage) publish(key, null);
  };

  setInterval(function () {
    fetchState(true);
  }, 1500);

  function addLoginStyles() {
    if (document.getElementById('sf-login-style')) return;
    var style = document.createElement('style');
    style.id = 'sf-login-style';
    style.textContent = [
      '#sf-login-cover{position:fixed;inset:0;z-index:99999;background:#f0f2f5;display:flex;align-items:center;justify-content:center;font-family:Segoe UI,system-ui,sans-serif}',
      '#sf-login-box{width:min(360px,calc(100vw - 32px));background:#fff;border-radius:12px;box-shadow:0 10px 35px rgba(0,0,0,.16);padding:24px}',
      '#sf-login-box h2{font-size:20px;margin:0 0 18px;color:#222}',
      '#sf-login-box label{display:block;font-size:13px;font-weight:700;color:#555;margin:12px 0 6px}',
      '#sf-login-box input{width:100%;box-sizing:border-box;padding:10px 12px;border:1.5px solid #ddd;border-radius:8px;font-size:15px}',
      '#sf-login-box button{width:100%;margin-top:16px;padding:10px 12px;border:0;border-radius:8px;background:#0d6efd;color:#fff;font-weight:700;cursor:pointer}',
      '#sf-login-error{display:none;margin-top:10px;color:#dc3545;font-size:13px}',
      '#sf-user-chip{display:none}'
    ].join('');
    document.head.appendChild(style);
  }

  function showLogin() {
    addLoginStyles();
    nativeRemoveItem.call(localStorage, sharedKeys[0]);
    nativeRemoveItem.call(localStorage, sharedKeys[1]);
    var cover = document.createElement('div');
    cover.id = 'sf-login-cover';
    cover.innerHTML = '<form id="sf-login-box"><h2>登入</h2><label>帳號</label><input id="sf-login-user" autocomplete="username"><label>密碼</label><input id="sf-login-pass" type="password" autocomplete="current-password"><button type="submit">登入</button><div id="sf-login-error">帳號或密碼錯誤</div></form>';
    document.body.appendChild(cover);
    document.getElementById('sf-login-user').focus();
    document.getElementById('sf-login-box').addEventListener('submit', function (e) {
      e.preventDefault();
      var user = document.getElementById('sf-login-user').value.trim();
      var pass = document.getElementById('sf-login-pass').value;
      if (accounts[user] && accounts[user] === pass) {
        refreshDisabledAccounts(bootState);
        if (disabledAccounts[user]) {
          document.getElementById('sf-login-error').textContent = '你已被停用';
          document.getElementById('sf-login-error').style.display = 'block';
          return;
        }
        rememberLogoutTokenFor(user, bootState);
        nativeSetItem.call(localStorage, userKey, user);
        location.reload();
      } else {
        document.getElementById('sf-login-error').style.display = 'block';
      }
    });
  }

  function logout() {
    nativeRemoveItem.call(localStorage, userKey);
    sharedKeys.forEach(function (key) { nativeRemoveItem.call(localStorage, key); });
    location.reload();
  }

  function logoutEverywhere() {
    if (!activeUser) {
      logout();
      return;
    }
    fetch('/__shared_storage/state', { cache: 'no-store' })
      .then(function (res) { return res.ok ? res.json() : {}; })
      .then(function (state) {
        var tokens = {};
        try {
          tokens = state && state[logoutTokensKey] ? JSON.parse(state[logoutTokensKey]) : {};
        } catch (e) {
          tokens = {};
        }
        tokens[activeUser] = String(Date.now());
        nativeSetItem.call(localStorage, logoutSeenKey(activeUser), tokens[activeUser]);
        return fetch('/__shared_storage/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId: clientId, key: logoutTokensKey, value: JSON.stringify(tokens) })
        });
      })
      .finally(logout);
  }

  window.sfLogoutEverywhere = logoutEverywhere;

  function startAutoLogout() {
    var timeoutMs = 30 * 60 * 1000;
    var timer = null;
    function resetTimer() {
      clearTimeout(timer);
      timer = setTimeout(logout, timeoutMs);
    }
    ['click','mousemove','keydown','touchstart','scroll','pointerdown'].forEach(function (eventName) {
      window.addEventListener(eventName, resetTimer, { passive: true });
    });
    resetTimer();
  }

  if (!activeUser || !accounts[activeUser]) {
    document.addEventListener('DOMContentLoaded', showLogin);
  } else {
    document.addEventListener('DOMContentLoaded', startAutoLogout);
  }
})();
`;
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  if (context.request.method === 'GET' && pathname === '/__shared_storage/client.js') {
    return new Response(clientScript(), {
      headers: {
        'content-type': 'application/javascript; charset=utf-8',
        'cache-control': 'no-store'
      }
    });
  }

  if (context.request.method === 'GET' && pathname === '/__shared_storage/state') {
    return json(await readState(context.env));
  }

  if (context.request.method === 'GET' && pathname === '/__shared_storage/events') {
    return new Response(null, { status: 204 });
  }

  if (context.request.method === 'POST' && pathname === '/__shared_storage/state') {
    let payload = {};
    try {
      payload = await context.request.json();
    } catch {
      return json({ ok: false }, 400);
    }

    if (!isAllowedStorageKey(payload.key)) {
      return json({ ok: false }, 400);
    }

    const state = await readState(context.env);
    if (payload.value === null) delete state[payload.key];
    else state[payload.key] = String(payload.value);
    await writeState(context.env, state);
    return json({ ok: true });
  }

  return new Response('Not found', { status: 404 });
}
