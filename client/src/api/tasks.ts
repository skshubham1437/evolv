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
): Promise<Task> {
  return request(`${API}/tasks`, {
    method: 'POST',
    body: JSON.stringify({ title, priority, project_id, parent_task_id, tags, dependencies }),
  });
}

export function updateTask(id: number, updates: Partial<Task>): Promise<Task> {
  return request(`${API}/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
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
