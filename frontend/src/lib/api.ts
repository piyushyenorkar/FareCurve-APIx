export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  return res.json();
}

export const api = {
  // AI Chat
  chat: (messages: any[]) => fetchAPI<any>("/api/v1/ai/chat", {
    method: "POST",
    body: JSON.stringify({ messages })
  }),
  // Index
  indexLatest: () => fetchAPI<any>("/api/v1/index/latest"),
  indexOverall: (limit = 90) => fetchAPI<any[]>(`/api/v1/index/overall?limit=${limit}`),
  indexRoute: (origin: string, dest: string, carrier?: string, ota?: string) => {
    const params = new URLSearchParams();
    if (carrier && carrier !== "ALL") params.append("carrier", carrier);
    if (ota && ota !== "ALL") params.append("ota", ota);
    const qs = params.toString() ? "?" + params.toString() : "";
    return fetchAPI<any[]>(`/api/v1/index/route/${origin}/${dest}${qs}`);
  },
  bookingCurve: (origin: string, dest: string) => fetchAPI<any>(`/api/v1/index/booking-curve/${origin}/${dest}`),
  routes: () => fetchAPI<any[]>("/api/v1/index/routes"),

  // Fares
  faresRaw: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return fetchAPI<any[]>(`/api/v1/fares/raw${qs}`);
  },
  fareBreakdown: (route: string, window: string = "ALL") => fetchAPI<any>(`/api/v1/fares/breakdown/${route}?window=${window}`),

  // Forecast
    forecast: (origin: string, dest: string, window = 15, carrier?: string, ota?: string) => {
    const params = new URLSearchParams({ window: window.toString() });
    if (carrier && carrier !== "ALL") params.append("carrier", carrier);
    if (ota && ota !== "ALL") params.append("ota", ota);
    return fetchAPI<any>(`/api/v1/forecast/${origin}/${dest}?${params.toString()}`);
  },
  forecastAll: () => fetchAPI<any[]>("/api/v1/forecast/all"),

  // Anomalies
  anomalies: (limit = 50) => fetchAPI<any[]>(`/api/v1/anomalies?limit=${limit}`),

  // Quality
  qualityCurrent: () => fetchAPI<any>("/api/v1/quality/current"),
  qualityHistory: (days = 30) => fetchAPI<any[]>(`/api/v1/quality/history?days=${days}`),

  // Reference
  complianceMatrix: () => fetchAPI<any[]>("/api/v1/reference/compliance-matrix"),
  cpiAirfare: () => fetchAPI<any[]>("/api/v1/reference/cpi-airfare"),
  atfCorrelation: () => fetchAPI<any>("/api/v1/reference/atf-correlation"),
};


