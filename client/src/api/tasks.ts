import { request, API_BASE as API } from './core';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Task {
  id: number;
  title: string;
  is_completed: boolean;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  notes?: string;
  position: number;
  project_id?: number | null;
  parent_task_id?: number | null;
  goal_id?: number | null;
  objective_id?: number | null;
  is_urgent?: boolean;
  is_important?: boolean;
  tags?: string;
  dependencies?: string;
}

export interface Project {
  id: number;
  title: string;
  description?: string;
  color: string;
  status: 'active' | 'archived' | 'completed';
  deadline?: string;
}

export interface DashboardData {
  tasks: Task[];
  habits: any[]; // Habit type — see api/habits.ts
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function fetchDashboard(): Promise<DashboardData> {
  return request(`${API}/daily`);
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export function fetchTasks(): Promise<Task[]> {
  return request(`${API}/tasks`);
}

export function createTask(
  title: string,
  priority = 'medium',
  project_id?: number | null,
  parent_task_id?: number | null,
  tags = '',
  dependencies = '',
  due_date?: string,
  goal_id?: number | null,
  objective_id?: number | null,
  is_urgent?: boolean,
  is_important?: boolean,
): Promise<Task> {
  let formattedDueDate = due_date;
  if (due_date && /^\d{4}-\d{2}-\d{2}$/.test(due_date)) {
    formattedDueDate = `${due_date}T00:00:00Z`;
  }
  return request(`${API}/tasks`, {
    method: 'POST',
    body: JSON.stringify({ title, priority, project_id, parent_task_id, tags, dependencies, due_date: formattedDueDate, goal_id, objective_id, is_urgent, is_important }),
  });
}

export function updateTask(id: number, updates: Partial<Task>): Promise<Task> {
  const formattedUpdates = { ...updates };
  if (updates.due_date && /^\d{4}-\d{2}-\d{2}$/.test(updates.due_date)) {
    formattedUpdates.due_date = `${updates.due_date}T00:00:00Z`;
  }
  return request(`${API}/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(formattedUpdates),
  });
}

export function completeTask(id: number): Promise<Task> {
  return request(`${API}/tasks/${id}/complete`, { method: 'PUT' });
}

export function deleteTask(id: number): Promise<void> {
  return request(`${API}/tasks/${id}`, { method: 'DELETE' });
}

/** Fire-and-forget. Moves all overdue incomplete tasks to today. Called automatically on login. */
export function rescheduleOverdueTasks(): Promise<{ status: string }> {
  return request(`${API}/tasks/reschedule`, { method: 'POST' });
}

export function updateTaskPositions(positions: { id: number; position: number }[]): Promise<{ status: string }> {
  return request(`${API}/tasks/positions`, {
    method: 'PUT',
    body: JSON.stringify({ positions }),
  });
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export function fetchProjects(): Promise<Project[]> {
  return request(`${API}/projects`);
}

export function createProject(title: string, color = '#D2BBFF'): Promise<Project> {
  return request(`${API}/projects`, {
    method: 'POST',
    body: JSON.stringify({ title, color }),
  });
}

export function updateProject(id: number, updates: Partial<Project>): Promise<Project> {
  return request(`${API}/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export function deleteProject(id: number): Promise<void> {
  return request(`${API}/projects/${id}`, { method: 'DELETE' });
}
