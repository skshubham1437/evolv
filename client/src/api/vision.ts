import { request, API_BASE as API } from './core';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Vision {
  id: number;
  user_id: number;
  core_values: string;         // JSON array string
  identity_statements: string; // JSON array string
  ideal_day: string;           // JSON array string
  vision_images: string;       // JSON array string
  future_self_text: string;
  created_at: string;
}

export interface FocusArea {
  id: number;
  name: string;
  icon: string;
  current_score: number;
  target_score: number;
}

export interface BucketListItem {
  id: number;
  title: string;
  category: string;
  is_completed: boolean;
}

export interface AnalyticsSummary {
  productivity_trend: number[];
  time_allocation: Record<string, number>;
  momentum_score: number;
  habit_count: number;
  mood_productivity_correlation?: { mood: number; avg_completions: number }[];
  energy_heatmap?: { day: string; hour: string; value: number }[];
}

// ─── Onboarding & Vision ─────────────────────────────────────────────────────

export function completeOnboarding(payload: {
  name: string;
  focus_areas: string[];
  primary_goal: string;
}): Promise<any> {
  return request(`${API}/onboarding/complete`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchVision(): Promise<Vision> {
  return request(`${API}/vision`);
}

export function updateVision(data: Partial<Vision>): Promise<Vision> {
  return request(`${API}/vision`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ─── Focus Areas ─────────────────────────────────────────────────────────────

export function fetchFocusAreas(): Promise<FocusArea[]> {
  return request(`${API}/vision/focus-areas`);
}

export function updateFocusArea(
  id: string | number,
  data: { current_score?: number; target_score?: number },
): Promise<FocusArea> {
  return request(`${API}/vision/focus-areas/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ─── Bucket List ─────────────────────────────────────────────────────────────

export function fetchBucketList(): Promise<BucketListItem[]> {
  return request(`${API}/vision/bucket-list`);
}

export function createBucketListItem(title: string, category: string): Promise<BucketListItem> {
  return request(`${API}/vision/bucket-list`, {
    method: 'POST',
    body: JSON.stringify({ title, category }),
  });
}

export function toggleBucketListItem(id: string | number): Promise<BucketListItem> {
  return request(`${API}/vision/bucket-list/${id}/toggle`, { method: 'PATCH' });
}

export function deleteBucketListItem(id: string | number): Promise<{ success: boolean }> {
  return request(`${API}/vision/bucket-list/${id}`, { method: 'DELETE' });
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export function fetchAnalytics(range?: string): Promise<AnalyticsSummary> {
  const q = range ? `?range=${range}` : '';
  return request(`${API}/analytics${q}`);
}
