const DEFAULT_API_URL = "http://127.0.0.1:8000";

export const API_URL = (
  import.meta.env?.VITE_API_URL || DEFAULT_API_URL
).replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(message, { status = 0, detail = null, url = "" } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.url = url;
  }
}

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

async function parseErrorResponse(response) {
  try {
    const data = await response.json();

    if (typeof data?.detail === "string") {
      return {
        message: data.detail,
        detail: data,
      };
    }

    return {
      message: `API request failed with status ${response.status}.`,
      detail: data,
    };
  } catch {
    return {
      message: `API request failed with status ${response.status}.`,
      detail: null,
    };
  }
}

export async function apiRequest(path, options = {}) {
  const url = `${API_URL}${path}`;

  let response;

  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });
} catch (error) {
  // React StrictMode can intentionally abort an in-flight request
  // during development. Preserve AbortError so the page can ignore it.
  if (error?.name === "AbortError") {
    throw error;
  }

  throw new ApiError(
    "Unable to reach the Retail Intelligence API. Make sure the backend is running.",
    {
      status: 0,
      detail: error instanceof Error ? error.message : String(error),
      url,
    },
  );
}

  if (!response.ok) {
    const parsed = await parseErrorResponse(response);

    throw new ApiError(parsed.message, {
      status: response.status,
      detail: parsed.detail,
      url,
    });
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// ============================================================
// Platform
// ============================================================

export function getPlatformRoot(options = {}) {
  return apiRequest("/", options);
}

export function getHealth(options = {}) {
  return apiRequest("/health", options);
}

export function getReadiness(options = {}) {
  return apiRequest("/ready", options);
}

export function getMetrics(options = {}) {
  return apiRequest("/metrics", options);
}

// ============================================================
// Retail Intelligence
// ============================================================

export function getRetailOverview(options = {}) {
  return apiRequest("/api/retail/overview", options);
}

export function getTopProducts({ limit = 10, department, signal } = {}) {
  return apiRequest(
    `/api/retail/products/top${buildQuery({ limit, department })}`,
    { signal },
  );
}

export function getProductSegments(options = {}) {
  return apiRequest("/api/retail/products/segments", options);
}

export function getRetailDepartments({ limit = 10, signal } = {}) {
  return apiRequest(
    `/api/retail/departments${buildQuery({ limit })}`,
    { signal },
  );
}

export function getRetailProduct(productId, options = {}) {
  if (productId === undefined || productId === null || productId === "") {
    throw new ApiError(
      "A product_id is required to load product intelligence.",
    );
  }

  return apiRequest(
    `/api/retail/products/${encodeURIComponent(productId)}`,
    options,
  );
}

// ============================================================
// Recommendation Intelligence
// ============================================================

export function getRecommendationOverview(options = {}) {
  return apiRequest("/api/recommendations/overview", options);
}

export function getRecommendationSourceMix(options = {}) {
  return apiRequest("/api/recommendations/source-mix", options);
}

export function getRecommendationRankPerformance(options = {}) {
  return apiRequest("/api/recommendations/rank-performance", options);
}

export function getRecommendationDepartments({ limit = 10, signal } = {}) {
  return apiRequest(
    `/api/recommendations/departments${buildQuery({ limit })}`,
    { signal },
  );
}

// ============================================================
// Customer Intelligence — Aggregate
// ============================================================

export function getCustomerIntelligenceOverview(options = {}) {
  return apiRequest("/api/customer-intelligence/overview", options);
}

export function getCustomerPersonas({ limit = 10, signal } = {}) {
  return apiRequest(
    `/api/customer-intelligence/personas${buildQuery({ limit })}`,
    { signal },
  );
}

export function getCustomerFavoriteDepartments({
  limit = 10,
  signal,
} = {}) {
  return apiRequest(
    `/api/customer-intelligence/favorite-departments${buildQuery({
      limit,
    })}`,
    { signal },
  );
}

// ============================================================
// Customer 360 / Existing ML work
// ============================================================

export function getCustomers({ limit = 100, signal } = {}) {
  return apiRequest(
    `/api/customers${buildQuery({ limit })}`,
    { signal },
  );
}

function assertUserId(userId) {
  if (userId === undefined || userId === null || userId === "") {
    throw new ApiError(
      "A user_id is required for Customer 360 intelligence.",
    );
  }
}

export function getCustomer360(userId, options = {}) {
  assertUserId(userId);

  return apiRequest(
    `/api/customers/${encodeURIComponent(userId)}/360`,
    options,
  );
}

export function getCustomerNextBasket(userId, options = {}) {
  assertUserId(userId);

  return apiRequest(
    `/api/customers/${encodeURIComponent(userId)}/next-basket`,
    options,
  );
}

export function getCustomerRecommendations(userId, options = {}) {
  assertUserId(userId);

  return apiRequest(
    `/api/customers/${encodeURIComponent(userId)}/assistant`,
    options,
  );
}

export function getCustomerReorderIntelligence(userId, options = {}) {
  assertUserId(userId);

  return apiRequest(
    `/api/customers/${encodeURIComponent(userId)}/reorder-planner`,
    options,
  );
}

export function getCustomerShoppingDna(userId, options = {}) {
  assertUserId(userId);

  return apiRequest(
    `/api/customers/${encodeURIComponent(userId)}/shopping-dna`,
    options,
  );
}

// ============================================================
// Page-level loaders
// ============================================================

export async function loadExecutiveOverview({ signal } = {}) {
  const [retail, recommendations, customers] = await Promise.all([
    getRetailOverview({ signal }),
    getRecommendationOverview({ signal }),
    getCustomerIntelligenceOverview({ signal }),
  ]);

  return {
    retail,
    recommendations,
    customers,
  };
}

export async function loadProductIntelligence({
  limit = 10,
  signal,
} = {}) {
  const [overview, topProducts, segments, departments] =
    await Promise.all([
      getRetailOverview({ signal }),
      getTopProducts({ limit, signal }),
      getProductSegments({ signal }),
      getRetailDepartments({ limit, signal }),
    ]);

  return {
    overview,
    topProducts,
    segments,
    departments,
  };
}

export async function loadRecommendationIntelligence({
  limit = 10,
  signal,
} = {}) {
  const [overview, sourceMix, rankPerformance, departments] =
    await Promise.all([
      getRecommendationOverview({ signal }),
      getRecommendationSourceMix({ signal }),
      getRecommendationRankPerformance({ signal }),
      getRecommendationDepartments({ limit, signal }),
    ]);

  return {
    overview,
    sourceMix,
    rankPerformance,
    departments,
  };
}

export async function loadCustomerIntelligence({
  limit = 10,
  signal,
} = {}) {
  const [overview, personas, favoriteDepartments] =
    await Promise.all([
      getCustomerIntelligenceOverview({ signal }),
      getCustomerPersonas({ limit, signal }),
      getCustomerFavoriteDepartments({ limit, signal }),
    ]);

  return {
    overview,
    personas,
    favoriteDepartments,
  };
}