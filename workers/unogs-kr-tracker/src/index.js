const COUNTRY_CODE = "348";
const COUNTRY_NAME = "South Korea";
const UNOGS_BASE = "https://unogs.com";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const BASE_HEADERS = {
  "User-Agent": USER_AGENT,
  "Accept": "application/json, text/plain, */*",
  "Referer": `${UNOGS_BASE}/countrydetail`,
  "REFERRER": "http://unogs.com",
  "Origin": UNOGS_BASE
};
const NEW_SEARCH_PARAMS = {
  limit: "100",
  offset: "0",
  query: "new last 30 days",
  countrylist: COUNTRY_CODE,
  country_andorunique: "or",
  start_year: "1900",
  end_year: "2026",
  start_rating: "0",
  end_rating: "10",
  genrelist: "",
  type: "",
  audio: "",
  subtitle: "",
  audiosubtitle_andor: "or",
  person: "",
  personid: "",
  filterby: "",
  orderby: "Date"
};

// Worker entry points for the scheduled scraper and JSON API.
export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(refreshSnapshots(env));
  },

  async fetch(request, env) {
    return handleRequest(request, env);
  }
};

// Routes public API requests and applies CORS only for configured origins.
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const cors = getCorsHeaders(request, env);

  try {
    if (request.method === "OPTIONS") {
      if (!cors) {
        return new Response(null, { status: 403 });
      }
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === "/api/expiring.json") {
      return serveSnapshot("expiring:latest", env, cors);
    }

    if (url.pathname === "/api/new.json") {
      return serveSnapshot("new:latest", env, cors);
    }

    if (url.pathname === "/api/refresh") {
      return refreshFromRequest(request, env, cors);
    }

    return jsonResponse({ error: "not found" }, { status: 404, cors });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "internal error" },
      { status: 500, cors }
    );
  }
}

// Reads a stored snapshot from KV without making uNoGS subrequests.
async function serveSnapshot(key, env, cors) {
  const body = await env.SNAPSHOTS.get(key);
  if (!body) {
    return jsonResponse(
      { error: "No snapshot is available yet. Run /api/refresh or wait for cron." },
      { status: 404, cors }
    );
  }
  return jsonResponse(body, { cors });
}

// Handles manual refresh, requiring a shared secret only when configured.
async function refreshFromRequest(request, env, cors) {
  if (request.method !== "GET" && request.method !== "POST") {
    return jsonResponse({ error: "method not allowed" }, { status: 405, cors });
  }

  if (env.REFRESH_TOKEN) {
    const provided = getRefreshToken(request);
    if (!provided || !(await constantTimeEquals(provided, env.REFRESH_TOKEN))) {
      return jsonResponse({ error: "unauthorized" }, { status: 401, cors });
    }
  }

  const result = await refreshSnapshots(env);
  if (!env.REFRESH_TOKEN) {
    result.warning = "REFRESH_TOKEN is not configured; /api/refresh is publicly callable.";
  }
  return jsonResponse(result, { cors });
}

// Scrapes both uNoGS searches and stores the latest normalized snapshots in KV.
async function refreshSnapshots(env) {
  const token = await getToken();
  const collectedAt = new Date().toISOString();
  const [expiringResults, newResults] = await Promise.all([
    search(token, { query: "expiring", countrylist: COUNTRY_CODE }),
    search(token, NEW_SEARCH_PARAMS)
  ]);

  const expiringSnapshot = {
    source: "unogs",
    sourceUrl: `${UNOGS_BASE}/countrydetail`,
    country: COUNTRY_CODE,
    countryName: COUNTRY_NAME,
    collectedAt,
    items: expiringResults.map((item) => normalizeResult(item, "expiring"))
  };
  const newItems = newResults
    .map((item) => normalizeResult(item, "new"))
    .sort((a, b) => dateValue(b.addedDate) - dateValue(a.addedDate));
  const newSnapshot = {
    source: "unogs",
    sourceUrl:
      `${UNOGS_BASE}/search/new%20last%2030%20days?country_andorunique=or&` +
      `start_year=1900&end_year=2026&end_rating=10&genrelist=&` +
      `audiosubtitle_andor=or&countrylist=${COUNTRY_CODE}`,
    country: COUNTRY_CODE,
    countryName: COUNTRY_NAME,
    collectedAt,
    candidatesAnalyzed: newResults.length,
    items: newItems
  };

  await Promise.all([
    env.SNAPSHOTS.put("expiring:latest", JSON.stringify(expiringSnapshot)),
    env.SNAPSHOTS.put("new:latest", JSON.stringify(newSnapshot))
  ]);

  return {
    ok: true,
    collectedAt,
    expiring: expiringSnapshot.items.length,
    added: newSnapshot.items.length
  };
}

// Requests the short-lived uNoGS bearer token used by search endpoints.
async function getToken() {
  const body = new URLSearchParams({
    user_name: (Date.now() / 1000).toFixed(3)
  });
  const response = await fetch(`${UNOGS_BASE}/api/user`, {
    method: "POST",
    headers: {
      ...BASE_HEADERS,
      "Accept": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
    },
    body
  });

  if (!response.ok) {
    throw new Error(`uNoGS token request failed with HTTP ${response.status}`);
  }

  const data = await response.json();
  const token = data?.token?.access_token;
  if (!token) {
    throw new Error("uNoGS token response did not include access_token");
  }
  return token;
}

// Runs one uNoGS search request and returns its result array.
async function search(token, params) {
  const query = new URLSearchParams(params);
  const response = await fetch(`${UNOGS_BASE}/api/search?${query}`, {
    headers: {
      ...BASE_HEADERS,
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`uNoGS search failed with HTTP ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data?.results) ? data.results : [];
}

// Converts raw uNoGS search data into the dashboard snapshot shape.
function normalizeResult(result, kind) {
  const title = decodeHtml(result.title);
  const netflixId = stringValue(result.nfid);
  const type = stringValue(result.vtype);
  const slug = stringValue(result.slug);
  const item = {
    title,
    netflixId,
    url: `${UNOGS_BASE}/${type}/${netflixId}/${slug}`,
    type,
    year: stringValue(result.year),
    synopsis: decodeHtml(result.synopsis),
    runtime: formatRuntime(result.runtime),
    imdbId: stringValue(result.imdbid),
    posterUrl: stringValue(result.poster),
    boxartUrl: stringValue(result.img),
    genres: [],
    // Extra fields available for free in the same search response.
    rating: numberValue(result.avgrating),
    top250: numberValue(result.top250),
    top250tv: numberValue(result.top250tv)
  };

  if (kind === "expiring") {
    item.expiryDate = stringValue(result.expires);
    item.expiryText = item.expiryDate ? `Expires on ${item.expiryDate}` : "";
  } else {
    item.addedDate = stringValue(result.cbdate);
    item.addedText = item.addedDate ? `Added on ${item.addedDate}` : "";
  }

  return item;
}

// Builds CORS headers only when the request origin is explicitly allowed.
function getCorsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin || !getAllowedOrigins(env).has(origin)) {
    return null;
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Refresh-Token",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

// Parses comma-separated origin configuration from wrangler vars.
function getAllowedOrigins(env) {
  return new Set(
    stringValue(env.ALLOWED_ORIGINS)
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  );
}

// Serializes JSON responses and merges optional CORS headers.
function jsonResponse(body, options = {}) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...(options.cors || {})
  };
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status: options.status || 200,
    headers
  });
}

// Reads the manual refresh token from bearer auth, header, or query string.
function getRefreshToken(request) {
  const auth = request.headers.get("Authorization") || "";
  if (auth.startsWith("Bearer ")) {
    return auth.slice("Bearer ".length);
  }

  const headerToken = request.headers.get("X-Refresh-Token");
  if (headerToken) {
    return headerToken;
  }

  return new URL(request.url).searchParams.get("token") || "";
}

// Compares secrets without leaking early-exit timing for same-length inputs.
async function constantTimeEquals(left, right) {
  const encoder = new TextEncoder();
  const leftDigest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(left)));
  const rightDigest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(right)));
  let diff = left.length === right.length ? 0 : 1;
  for (let index = 0; index < leftDigest.length; index += 1) {
    diff |= leftDigest[index] ^ rightDigest[index];
  }
  return diff === 0;
}

// Decodes common HTML entities and numeric character references from uNoGS text.
function decodeHtml(value) {
  return stringValue(value)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

// Formats uNoGS search runtime seconds into the same compact label uNoGS shows.
function formatRuntime(value) {
  const totalSeconds = Number(value);
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return "--";
  }

  const seconds = Math.trunc(totalSeconds);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  const parts = [];

  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (remainingSeconds || parts.length === 0) parts.push(`${remainingSeconds}s`);

  return parts.join("");
}

// Converts nullish values to the empty string for stable JSON fields.
function stringValue(value) {
  return value === null || value === undefined ? "" : String(value);
}

// Converts nullable values to a finite number, defaulting to 0.
function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

// Converts date-like strings to comparable timestamps with empty dates last.
function dateValue(value) {
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
}
