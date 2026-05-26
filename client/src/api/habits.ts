import { request, API_BASE as API } from './core';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Habit {
  id: number;
  title: string;
  streak: number;
  frequency: string;
  completed_today: boolean;
  category: string;
  routine_type: 'morning' | 'night' | 'none';
  position: number;
  stack_after_id?: number | null;
  streak_shield_active?: boolean;
  streak_shields_remaining?: number;
}

export interface HabitStats {
  consistency_pct: number;
  logs: { id: number; habit_id: number; completed_at: string }[];
}

// ─── Habits ───────────────────────────────────────────────────────────────────

export function fetchHabits(): Promise<Habit[]> {
  return request(`${API}/habits`);
}

export function fetchHabitStats(id: number): Promise<HabitStats> {
  return request(`${API}/habits/${id}/stats`);
}

export function fetchRoutines(type: 'morning' | 'night'): Promise<Habit[]> {
  return request(`${API}/routines/${type}`);
}

export function createHabit(
  title: string,
  category = 'Health',
  routine_type = 'none',
  streak_shield_active = false,
): Promise<Habit> {
  return request(`${API}/habits`, {
    method: 'POST',
    body: JSON.stringify({ title, category, routine_type, frequency: 'daily', streak_shield_active }),
  });
}

export function updateHabit(id: number, updates: Partial<Habit>): Promise<Habit> {
  return request(`${API}/habits/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export function logHabit(id: number): Promise<Habit> {
  return request(`${API}/habits/${id}/log`, { method: 'POST' });
}

export function deleteHabit(id: number): Promise<void> {
  return request(`${API}/habits/${id}`, { method: 'DELETE' });
}
