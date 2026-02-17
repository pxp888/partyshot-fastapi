export const ACCESS_TOKEN_KEY = "access_token";
export const REFRESH_TOKEN_KEY = "refresh_token";

/**
 * Store a token pair (access & refresh) in localStorage.
 */
function storeTokens({ access_token, refresh_token }) {
  if (access_token) localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
  if (refresh_token) localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
}

/**
 * Retrieve the current access token from localStorage.
 */
function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * Retrieve the current refresh token from localStorage.
 */
function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/**
 * Perform a fetch request that automatically adds the JWT (if present),
 * handles 401 responses by attempting a refresh, and retries once.
 */
async function authFetch(endpoint, options = {}, retry = true) {
  const token = getAccessToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(endpoint, { ...options, headers });

  // If we get a 401, try to refresh the token once
  if (response.status === 401 && retry) {
    const refreshed = await refreshToken();
    if (refreshed) {
      // Retry the original request with the new access token
      return authFetch(endpoint, options, false);
    }
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Request failed: ${response.status} ${errText}`);
  }

  // Parse JSON if possible
  const contentType = response.headers.get("Content-Type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

/**
 * Log in with credentials, store the returned tokens, and return the JSON.
 */
export async function sendJson(endpoint, body) {
  const options = {
    method: "POST",
    body: JSON.stringify(body),
  };
  const data = await authFetch(endpoint, options);
  // After a successful login, store the tokens if they were returned
  if (data.access_token || data.refresh_token) storeTokens(data);
  return data;
}

/**
 * GET a JSON endpoint with automatic JWT handling.
 */
export async function receiveJson(endpoint) {
  const options = { method: "GET" };
  const data = await authFetch(endpoint, options);
  return data;
}

/**
 * Refresh the access token using the stored refresh token.
 * Returns true if the token was refreshed successfully.
 */
async function refreshToken() {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  try {
    const resp = await fetch("/api/refresh", {
      method: "POST",
      headers: { Authorization: `Bearer ${refresh}` },
    });
    if (!resp.ok) return false;
    const data = await resp.json();
    if (data.access_token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
      return true;
    }
    const uuidData = await sendJson("/api/generate-wssecret", {}); // socket secret
    localStorage.setItem("wssecret", uuidData.wssecret); // socket secret
  } catch {
    return false;
  }
  return false;
}
