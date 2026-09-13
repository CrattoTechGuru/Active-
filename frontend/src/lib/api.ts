const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Surface the backend's structured error rather than a generic
    // "something went wrong" — the analysis page needs the real reason
    // to show a real error state for cash-out failures.
    throw new Error(body.message ?? body.error ?? `Request failed (${res.status})`);
  }

  return body as T;
}

export interface AnalysisResponse {
  dailyStats: { period_date: string; streams: string; revenue_cents: string }[];
  balanceCents: number;
}

export function getAnalysis(artistId: string) {
  return request<AnalysisResponse>(`/analysis/artists/${artistId}`);
}

export function cashOut(artistId: string, amountCents: number) {
  return request<{ payoutId: string; status: string; stripeTransferId?: string }>(
    `/analysis/artists/${artistId}/cash-out`,
    { method: 'POST', body: JSON.stringify({ amountCents }) }
  );
}

export function setSplits(
  trackId: string,
  splits: { collaboratorArtistId: string; percentage: number }[]
) {
  return request<{ status: string }>(`/distribution/tracks/${trackId}/splits`, {
    method: 'PUT',
    body: JSON.stringify({ splits }),
  });
}

export function submitDistribution(trackId: string) {
  return request<{ status: string; presaveLink: string }>(
    `/distribution/tracks/${trackId}/submit`,
    { method: 'POST' }
  );
}
