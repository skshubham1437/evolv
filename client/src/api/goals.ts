import { request, API_BASE as API } from './core';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface KeyResult {
  id: string | number;
  text: string;
  is_done: boolean;
}

export interface Goal {
  id: string | number;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  due_date: string;
  progress: number;
  status: string;
  key_results: KeyResult[];
}

export interface Milestone {
  id: string | number;
  goal_id?: string | number;
  quarter: string;
  date: string;
  title: string;
  description: string;
  status: 'done' | 'active' | 'upcoming';
  created_at?: string;
}

// ─── Goals ────────────────────────────────────────────────────────────────────

export function fetchGoals(): Promise<Goal[]> {
  return request(`${API}/goals`);
}

export function createGoal(payload: {
  title: string;
  description: string;
  priority: string;
  due_date: string;
  key_results: string[];
}): Promise<Goal> {
  return request(`${API}/goals`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateGoal(id: string | number, updates: Partial<Goal>): Promise<Goal> {
  return request(`${API}/goals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export function deleteGoal(id: string | number): Promise<void> {
  return request(`${API}/goals/${id}`, { method: 'DELETE' });
}

// ─── Key Results ──────────────────────────────────────────────────────────────

export function toggleKeyResult(goalId: string | number, krId: string | number): Promise<Goal> {
  return request(`${API}/goals/${goalId}/key-results/${krId}/toggle`, { method: 'PATCH' });
}

export function createKeyResult(goalId: string | number, text: string): Promise<KeyResult> {
  return request(`${API}/goals/${goalId}/key-results`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

// ─── Milestones ───────────────────────────────────────────────────────────────

export function fetchMilestones(goalId: string | number): Promise<Milestone[]> {
  return request(`${API}/goals/${goalId}/milestones`);
}

export function createMilestone(
  goalId: string | number,
  payload: { title: string; description?: string; quarter?: string; date?: string; status?: string },
): Promise<Milestone> {
  return request(`${API}/goals/${goalId}/milestones`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateMilestone(
  goalId: string | number,
  milestoneId: string | number,
  updates: Partial<Milestone>,
): Promise<Milestone> {
  return request(`${API}/goals/${goalId}/milestones/${milestoneId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export function deleteMilestone(goalId: string | number, milestoneId: string | number): Promise<void> {
  return request(`${API}/goals/${goalId}/milestones/${milestoneId}`, { method: 'DELETE' });
}
