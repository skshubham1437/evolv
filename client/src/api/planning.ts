import { request, API_BASE as API } from './core';
import type { Task } from './tasks';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WeeklyPlan {
  id: number;
  year: number;
  week_number: number;
  theme: string;
  notes: string;
  review_summary?: string;
}

export interface TimeBlock {
  id: number;
  date: string;
  start_time: string; // HH:MM
  end_time: string;   // HH:MM
  title: string;
  notes: string;
  block_type: 'deep_work' | 'meeting' | 'break' | 'personal' | 'admin';
}

export interface WeeklyOverview {
  date: string;
  year: number;
  week_number: number;
  week_start: string;
  week_end: string;
  plan: WeeklyPlan;
  time_blocks: TimeBlock[];
  mits: Task[];
  week_score: number;
}

export interface MonthlyPlan {
  id: number;
  user_id: number;
  year: number;
  month: number;
  theme: string;
  goals: string;         // stringified JSON array
  life_scores: string;   // stringified JSON object
  review_summary?: string;
  created_at?: string;
  updated_at?: string;
}

export interface QuarterlyObjective {
  id: number;
  user_id: number;
  goal_id: number | null;
  year: number;
  quarter: number;
  title: string;
  outcome: string;
  status: 'not_started' | 'on_track' | 'at_risk' | 'completed';
  created_at?: string;
  updated_at?: string;
}

// ─── Weekly ───────────────────────────────────────────────────────────────────

export function fetchWeeklyOverview(date?: string): Promise<WeeklyOverview> {
  const q = date ? `?date=${date}` : '';
  return request(`${API}/weekly/overview${q}`);
}

export function upsertWeeklyPlan(data: {
  date?: string;
  theme: string;
  notes?: string;
  review_summary?: string;
}): Promise<WeeklyPlan> {
  return request(`${API}/weekly/plan`, { method: 'PUT', body: JSON.stringify(data) });
}

export function fetchTimeBlocks(date: string): Promise<TimeBlock[]> {
  return request(`${API}/weekly/time-blocks?date=${date}`);
}

export function createTimeBlock(data: Omit<TimeBlock, 'id'>): Promise<TimeBlock> {
  return request(`${API}/weekly/time-blocks`, { method: 'POST', body: JSON.stringify(data) });
}

export function updateTimeBlock(id: number, data: Partial<TimeBlock>): Promise<TimeBlock> {
  return request(`${API}/weekly/time-blocks/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteTimeBlock(id: number): Promise<void> {
  return request(`${API}/weekly/time-blocks/${id}`, { method: 'DELETE' });
}

// ─── Monthly ─────────────────────────────────────────────────────────────────

export function fetchMonthlyPlan(year: number, month: number): Promise<MonthlyPlan> {
  return request(`${API}/monthly/${year}/${month}`);
}

export function upsertMonthlyPlan(data: {
  year: number;
  month: number;
  theme: string;
  goals: string;
  life_scores: string;
  review_summary?: string;
}): Promise<MonthlyPlan> {
  return request(`${API}/monthly`, { method: 'PUT', body: JSON.stringify(data) });
}

// ─── Quarterly ────────────────────────────────────────────────────────────────

export function fetchQuarterlyScorecard(year: number, quarter: number): Promise<QuarterlyObjective[]> {
  return request(`${API}/quarterly/${year}/${quarter}/scorecard`);
}

export function createQuarterlyObjective(data: {
  goal_id: number | null;
  year: number;
  quarter: number;
  title: string;
  outcome: string;
}): Promise<QuarterlyObjective> {
  return request(`${API}/quarterly`, { method: 'POST', body: JSON.stringify(data) });
}

export function updateQuarterlyObjective(id: number, data: Partial<QuarterlyObjective>): Promise<QuarterlyObjective> {
  return request(`${API}/quarterly/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deleteQuarterlyObjective(id: number): Promise<void> {
  return request(`${API}/quarterly/${id}`, { method: 'DELETE' });
}
