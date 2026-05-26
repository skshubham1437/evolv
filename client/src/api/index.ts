/**
 * api/index.ts — Barrel export for all resource API modules.
 *
 * Import from here for clean, tree-shakeable access:
 *   import { fetchGoals, type Goal } from '../api';
 *
 * Or import directly from resource modules for maximum clarity:
 *   import { fetchGoals, type Goal } from '../api/goals';
 */

export * from './core';
export * from './tasks';
export * from './habits';
export * from './journal';
export * from './goals';
export * from './planning';
export * from './vision';
export * from './ai';
