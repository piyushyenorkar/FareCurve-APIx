export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchAPI<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  return res.json();
}

export const api = {
  // Index
  indexLatest: () => fetchAPI<any>("/api/v1/index/latest"),
  indexOverall: (limit = 90) => fetchAPI<any[]>(`/api/v1/index/overall?limit=${limit}`),
  indexRoute: (origin: string, dest: string) => fetchAPI<any[]>(`/api/v1/index/route/${origin}/${dest}`),
  bookingCurve: (origin: string, dest: string) => fetchAPI<any>(`/api/v1/index/booking-curve/${origin}/${dest}`),
  routes: () => fetchAPI<any[]>("/api/v1/index/routes"),

  // Fares
  faresRaw: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return fetchAPI<any[]>(`/api/v1/fares/raw${qs}`);
  },
  fareBreakdown: (route: string) => fetchAPI<any>(`/api/v1/fares/breakdown/${route}`),

  // Forecast
  forecast: (origin: string, dest: string, window = 15) =>
    fetchAPI<any>(`/api/v1/forecast/${origin}/${dest}?window=${window}`),
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
