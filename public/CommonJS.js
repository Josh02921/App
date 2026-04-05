// ============================================================
// CommonJS.js - Heaven Church Admin
// Replaces Google Apps Script's google.script.run with fetch()
// ============================================================

// Global flag - login page does NOT require session token
(function() {
  function isLoginPage() {
    try {
      if (window.onLoginPage === true) return true;
      const urlParams = new URLSearchParams(window.location.search);
      const currentPage = urlParams.get('page');
      if (currentPage === 'login') return true;
      if (!currentPage) {
        try {
          const storedToken = window.localStorage && window.localStorage.getItem('sessionToken');
          if (!storedToken || storedToken.trim() === '') return true;
        } catch (e) { return true; }
      }
      return false;
    } catch (e) { return false; }
  }

  if (isLoginPage()) {
    window.onLoginPage = true;
    try {
      if (typeof window.localStorage !== 'undefined') {
        window.localStorage.removeItem('sessionToken');
        window.sessionToken = '';
      }
    } catch (e) {}
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('page') !== 'login') {
      urlParams.set('page', 'login');
      urlParams.delete('sessionToken');
      window.location.href = window.location.origin + window.location.pathname + '?' + urlParams.toString();
      return;
    }
    return; // Stop - login page displays normally
  }

  window.onLoginPage = false;

  // For non-login pages, ensure token is in URL
  function ensureTokenInURL() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('sessionToken');
      const currentPage = urlParams.get('page') || 'dashboard';

      if (!urlToken || urlToken.trim() === '') {
        let storedToken = '';
        try {
          storedToken = window.localStorage.getItem('sessionToken') || '';
        } catch (e) {}

        if (storedToken && storedToken.trim() !== '') {
          const newParams = new URLSearchParams();
          newParams.set('page', currentPage);
          newParams.set('sessionToken', storedToken);
          window.location.href = window.location.origin + window.location.pathname + '?' + newParams.toString();
          return true;
        } else {
          window.location.href = window.location.origin + window.location.pathname + '?page=login';
          return true;
        }
      } else {
        try { window.localStorage.setItem('sessionToken', urlToken); } catch (e) {}
        window.sessionToken = urlToken;
      }
      return false;
    } catch (error) {
      console.error('Error in ensureTokenInURL:', error);
      return false;
    }
  }

  const redirecting = ensureTokenInURL();
  if (redirecting) return;
})();

// ============================================================
// Session Manager
// ============================================================
const sessionManager = {
  storageKey: 'sessionToken',
  getToken() {
    try {
      if (window.sessionToken) return window.sessionToken;
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('sessionToken');
      if (urlToken) {
        window.sessionToken = urlToken;
        return urlToken;
      }
      if (typeof window !== 'undefined') {
        const token = window.localStorage.getItem(this.storageKey);
        if (token) {
          window.sessionToken = token;
          return token;
        }
      }
      return '';
    } catch (error) {
      return window.sessionToken || '';
    }
  },
  setToken(value) {
    try {
      if (typeof window !== 'undefined') {
        if (value) {
          window.localStorage.setItem(this.storageKey, value);
        } else {
          window.localStorage.removeItem(this.storageKey);
        }
      }
    } catch (error) {}
    window.sessionToken = value || '';
  },
  clearToken() {
    this.setToken('');
  }
};

// ============================================================
// Core API function - replaces google.script.run
// ============================================================
function callApi(functionName, params, successHandler, failureHandler) {
  params = params || {};
  const token = sessionManager.getToken();
  const payload = Object.assign({}, params);
  if (token && !payload.sessionToken) {
    payload.sessionToken = token;
  }

  fetch('/api/gas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ function: functionName, params: payload })
  })
  .then(function(response) {
    if (!response.ok) {
      return response.json().catch(function() {
        throw new Error('HTTP ' + response.status + ': ' + response.statusText);
      }).then(function(data) {
        throw new Error(data.message || 'API error ' + response.status);
      });
    }
    return response.json();
  })
  .then(function(data) {
    if (successHandler) successHandler(data);
  })
  .catch(function(error) {
    console.error('callApi error [' + functionName + ']:', error);
    if (failureHandler) failureHandler(error);
  });
}

// ============================================================
// Navigation - replaces google.script.run.getScriptUrl()
// ============================================================
let navigationInProgress = false;

function navigateToPage(page) {
  if (navigationInProgress) {
    console.log('Navigation already in progress, ignoring:', page);
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  let currentToken = urlParams.get('sessionToken') || sessionManager.getToken() || '';

  if (!currentToken && page !== 'login') {
    console.error('No session token - redirecting to login');
    window.location.href = '/?page=login';
    return;
  }

  navigationInProgress = true;

  if (currentToken) sessionManager.setToken(currentToken);

  const newParams = new URLSearchParams();
  newParams.set('page', page);
  if (currentToken) newParams.set('sessionToken', currentToken);

  const targetUrl = window.location.origin + window.location.pathname + '?' + newParams.toString();
  console.log('Navigating to:', page);
  window.location.href = targetUrl;
}

// ============================================================
// Logout
// ============================================================
function logout() {
  const token = sessionManager.getToken();
  sessionManager.clearToken();
  if (token) {
    fetch('/api/gas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ function: 'logoutUser', params: { sessionToken: token } })
    }).catch(function() {}).finally(function() {
      window.location.href = '/?page=login';
    });
  } else {
    window.location.href = '/?page=login';
  }
}

// ============================================================
// Update user info on all pages
// ============================================================
function updateUserInfoOnPage() {
  try {
    let storedUsername = '';
    try { storedUsername = localStorage.getItem('username') || ''; } catch (e) {}

    const usernameElements = document.querySelectorAll(
      '#sidebar-username, .user-name, [id$="-username"], [id$="-header-username"]'
    );
    const roleElements = document.querySelectorAll(
      '#sidebar-userrole, .user-role, [id$="-userrole"], [id$="-sidebar-userrole"]'
    );

    if (storedUsername && storedUsername !== 'Admin') {
      usernameElements.forEach(function(el) {
        if (el && (el.textContent === 'Admin' || !el.textContent.trim())) {
          el.textContent = storedUsername;
        }
      });
    }

    const sessionToken = sessionManager.getToken();
    if (sessionToken) {
      callApi('validateSessionTokenApi', { sessionToken: sessionToken }, function(result) {
        if (result && result.success && result.user) {
          const username = result.user.username || 'Admin';
          const role = result.user.role || 'Administrator';

          usernameElements.forEach(function(el) {
            if (el) el.textContent = username;
          });
          roleElements.forEach(function(el) {
            if (el) el.textContent = role;
          });

          try { localStorage.setItem('username', username); } catch (e) {}
        }
      }, function(error) {
        console.error('Error validating session:', error);
      });
    }
  } catch (error) {
    console.error('Error in updateUserInfoOnPage:', error);
  }
}

// ============================================================
// Sidebar navigation setup
// ============================================================
function setupSidebarNavigation() {
  const sidebar = document.querySelector('.sidebar');
  if (!sidebar) return false;

  const urlParams = new URLSearchParams(window.location.search);
  const currentPage = urlParams.get('page') || 'dashboard';
  sidebar.setAttribute('data-current-page', currentPage);

  // Mark active item
  document.querySelectorAll('.sidebar-item[data-page]').forEach(function(btn) {
    const page = btn.getAttribute('data-page');
    if (page === currentPage) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
    btn.addEventListener('click', function() {
      navigateToPage(page);
    });
  });

  return true;
}

function ensureSidebarVisible() {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.style.display = '';
    sidebar.style.visibility = 'visible';
    sidebar.style.opacity = '1';
    return true;
  }
  return false;
}

function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const main = document.querySelector('main.page-shell');
  if (!sidebar) return;

  const isCollapsed = sidebar.classList.toggle('collapsed');
  if (main) {
    main.style.marginLeft = isCollapsed ? '0' : 'var(--sidebar-width, 250px)';
    main.style.width = isCollapsed ? '100%' : 'calc(100% - var(--sidebar-width, 250px))';
  }
}

// ============================================================
// Init on DOM ready
// ============================================================
(function() {
  function init() {
    if (!window.onLoginPage) {
      setupSidebarNavigation();
      ensureSidebarVisible();
      updateUserInfoOnPage();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  setTimeout(init, 300);
})();

// ============================================================
// Compatibility stubs for functions called in HTML pages
// ============================================================

// getScriptUrl is called in some pages - return empty string
if (typeof window !== 'undefined') {
  window.getScriptUrl = function() { return ''; };
}

// Make navigateToPage available globally
window.navigateToPage = navigateToPage;
window.logout = logout;
window.callApi = callApi;
window.sessionManager = sessionManager;
window.updateUserInfoOnPage = updateUserInfoOnPage;
window.ensureSidebarVisible = ensureSidebarVisible;
window.toggleSidebar = toggleSidebar;
