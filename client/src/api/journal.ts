import { request, API_BASE as API } from './core';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface JournalEntry {
  id: number;
  date: string;
  content: string;
  mood: number;
  energy: number;
  stress?: number;
  confidence?: number;
  gratitude: string; // JSON array string
  wins: string;      // JSON array string
  lessons: string;   // JSON array string
  sentiment?: string;
  themes?: string;   // JSON array string
}

// ─── Journal ─────────────────────────────────────────────────────────────────

export function createJournalEntry(entry: Omit<JournalEntry, 'id'>): Promise<JournalEntry> {
  return request(`${API}/journal`, {
    method: 'POST',
    body: JSON.stringify(entry),
  });
}

export function fetchJournalEntries(): Promise<JournalEntry[]> {
  return request(`${API}/journal`);
}

export function fetchJournalByDate(date: string): Promise<JournalEntry> {
  return request(`${API}/journal/${date}`);
}

export function updateJournalEntry(id: number, updates: Partial<JournalEntry>): Promise<JournalEntry> {
  return request(`${API}/journal/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export function logEnergy(energy: number): Promise<{ id: number; energy: number; logged_at: string }> {
  return request(`${API}/energy`, {
    method: 'POST',
    body: JSON.stringify({ energy }),
  });
}
