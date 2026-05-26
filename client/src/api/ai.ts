import { request, API_BASE as API } from './core';
import type { WeeklyPlan, MonthlyPlan } from './planning';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SubtaskBreakdown {
  title: string;
  description: string;
}

export interface AIInsight {
  title: string;
  category: string;
  recommendation: string;
}

export interface BurnoutRisk {
  risk: 'low' | 'medium' | 'high';
  details: string;
}

// ─── AI Operations ────────────────────────────────────────────────────────────

export function aiChat(message: string, context?: string): Promise<{ reply: string }> {
  return request(`${API}/ai/chat`, {
    method: 'POST',
    body: JSON.stringify({ message, context }),
  });
}

export function aiBreakDownGoal(goal_id: number): Promise<SubtaskBreakdown[]> {
  return request(`${API}/ai/break-down-goal`, {
    method: 'POST',
    body: JSON.stringify({ goal_id }),
  });
}

export function fetchMorningBrief(): Promise<{ brief: string }> {
  return request(`${API}/ai/morning-brief`);
}

export function fetchAIInsights(): Promise<AIInsight[]> {
  return request(`${API}/ai/insights`);
}

export function fetchBurnoutRisk(): Promise<BurnoutRisk> {
  return request(`${API}/ai/burnout-risk`);
}

export function generateWeeklyReview(date: string): Promise<WeeklyPlan> {
  return request(`${API}/ai/weekly-review`, {
    method: 'POST',
    body: JSON.stringify({ date }),
  });
}

export function generateMonthlyReview(year: number, month: number): Promise<MonthlyPlan> {
  return request(`${API}/ai/monthly-review`, {
    method: 'POST',
    body: JSON.stringify({ year, month }),
  });
}
