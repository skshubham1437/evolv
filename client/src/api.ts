/**
 * api.ts — Legacy compatibility shim.
 *
 * All API logic has been migrated to `src/api/` modules:
 *   - api/core.ts     → HTTP client, authHeaders, request()
 *   - api/tasks.ts    → Tasks, Projects, Dashboard
 *   - api/habits.ts   → Habits
 *   - api/journal.ts  → Journal
 *   - api/goals.ts    → Goals, Key Results, Milestones
 *   - api/planning.ts → Weekly, Monthly, Quarterly
 *   - api/vision.ts   → Vision, Focus Areas, Bucket List, Analytics
 *   - api/ai.ts       → AI chat, insights, morning brief
 *
 * This file re-exports everything from the barrel so existing imports
 * like `import { fetchGoals } from '../api'` continue to work unchanged.
 *
 * @deprecated Prefer importing from `../api/goals` (or the relevant module)
 * for new code to get better tree-shaking and clearer dependency graphs.
 */
export * from './api/index';
