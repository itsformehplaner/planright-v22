// Cloud API client for PlanRight V21
// Syncs localStorage with Cloudflare D1 backend

const API_BASE = ''; // Same origin
const SESSION_KEY = 'pr_session';

interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date;
  startTime?: string;
  endTime?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'active' | 'in-progress' | 'completed' | 'canceled' | 'on-hold';
  category: 'Work' | 'Personal' | 'Chore' | 'Learning';
  parentId?: string;
  completionDate?: Date;
  cancellationNote?: string;
  createdAt: Date;
  updatedAt?: Date;
  dependsOn?: string[];
  trackDailyProgress?: boolean;
  progress?: { date: string; note?: string }[];
  isPinned?: boolean;
  recurrence?: any;
  originalRecurringTaskId?: string;
  projectId: string;
  taskLogs?: { id: string; content: string; createdAt: Date }[];
  outcomeNote?: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  createdAt: Date;
  archived?: boolean;
}

interface Note {
  id: string;
  title: string;
  content: string;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TaskTemplate {
  id: string;
  name: string;
  description?: string;
  tasks: any[];
  createdAt: Date;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  
  return res.json();
}

export function getSession(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function setSession(token: string): void {
  try {
    localStorage.setItem(SESSION_KEY, token);
  } catch {}
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
}

export const cloudApi = {
  async setup(password: string): Promise<{ token: string }> {
    const res = await request('/setup', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    setSession((res as any).token);
    return res as any;
  },
  
  async login(password: string): Promise<{ token: string }> {
    const res = await request('/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    setSession((res as any).token);
    return res as any;
  },
  
  async logout(): Promise<void> {
    const token = getSession();
    if (token) {
      await request('/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    clearSession();
  },
  
  async verify(): Promise<boolean> {
    const token = getSession();
    if (!token) return false;
    try {
      const res = await request('/verify', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return (res as any).valid === true;
    } catch {
      clearSession();
      return false;
    }
  },
  
  async getStatus(): Promise<{ setupRequired: boolean }> {
    try {
      return await request('/status');
    } catch {
      return { setupRequired: true };
    }
  },
  
  async getTasks(projectId?: string, status?: string): Promise<Task[]> {
    const token = getSession();
    if (!token) return JSON.parse(localStorage.getItem('tasks') || '[]');
    
    let path = '/tasks';
    if (projectId || status) {
      const params = new URLSearchParams();
      if (projectId) params.set('project', projectId);
      if (status) params.set('status', status);
      path += '?' + params.toString();
    }
    
    const res = await request<Task[]>(path, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    localStorage.setItem('tasks', JSON.stringify(res));
    return res;
  },
  
  async saveTask(task: Task): Promise<Task> {
    const token = getSession();
    if (!token) {
      const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
      const idx = tasks.findIndex((t: any) => t.id === task.id);
      if (idx >= 0) tasks[idx] = task;
      else tasks.push(task);
      localStorage.setItem('tasks', JSON.stringify(tasks));
      return task;
    }
    
    const res = await request<Task>(`/tasks/${task.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(task),
    });
    
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const idx = tasks.findIndex((t: any) => t.id === task.id);
    if (idx >= 0) tasks[idx] = res;
    else tasks.push(res);
    localStorage.setItem('tasks', JSON.stringify(tasks));
    return res;
  },
  
  async addTask(task: Omit<Task, 'id' | 'createdAt'> & { id?: string }): Promise<Task> {
    const token = getSession();
    if (!token) {
      const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
      const newTask = {
        ...task,
        id: task.id || crypto.randomUUID(),
        createdAt: new Date(),
      };
      tasks.unshift(newTask);
      localStorage.setItem('tasks', JSON.stringify(tasks));
      return newTask as Task;
    }
    
    const res = await request<Task>('/tasks', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(task),
    });
    
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    tasks.unshift(res);
    localStorage.setItem('tasks', JSON.stringify(tasks));
    return res;
  },
  
  async deleteTask(id: string): Promise<void> {
    const token = getSession();
    if (!token) {
      const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
      const filtered = tasks.filter((t: any) => t.id !== id && t.parentId !== id);
      localStorage.setItem('tasks', JSON.stringify(filtered));
      return;
    }
    
    await request(`/tasks/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const filtered = tasks.filter((t: any) => t.id !== id && t.parentId !== id);
    localStorage.setItem('tasks', JSON.stringify(filtered));
  },
  
  async saveAllTasks(tasks: Task[]): Promise<void> {
    const token = getSession();
    if (!token) {
      localStorage.setItem('tasks', JSON.stringify(tasks));
      return;
    }
    
    await request('/tasks', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(tasks),
    });
    
    localStorage.setItem('tasks', JSON.stringify(tasks));
  },
  
  async getProjects(): Promise<Project[]> {
    const token = getSession();
    if (!token) return JSON.parse(localStorage.getItem('projects') || '[]');
    
    const res = await request<Project[]>('/projects', {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    localStorage.setItem('projects', JSON.stringify(res));
    return res;
  },
  
  async saveProject(project: Project): Promise<Project> {
    const token = getSession();
    if (!token) {
      const projects = JSON.parse(localStorage.getItem('projects') || '[]');
      const idx = projects.findIndex((p: any) => p.id === project.id);
      if (idx >= 0) projects[idx] = project;
      else projects.push(project);
      localStorage.setItem('projects', JSON.stringify(projects));
      return project;
    }
    
    const res = await request<Project>(`/projects/${project.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(project),
    });
    
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    const idx = projects.findIndex((p: any) => p.id === project.id);
    if (idx >= 0) projects[idx] = res;
    else projects.push(res);
    localStorage.setItem('projects', JSON.stringify(projects));
    return res;
  },
  
  async addProject(project: Omit<Project, 'id' | 'createdAt'> & { id?: string }): Promise<Project> {
    const token = getSession();
    if (!token) {
      const projects = JSON.parse(localStorage.getItem('projects') || '[]');
      const newProject = {
        ...project,
        id: project.id || crypto.randomUUID(),
        createdAt: new Date(),
      };
      projects.push(newProject);
      localStorage.setItem('projects', JSON.stringify(projects));
      return newProject as Project;
    }
    
    const res = await request<Project>('/projects', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(project),
    });
    
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    projects.push(res);
    localStorage.setItem('projects', JSON.stringify(projects));
    return res;
  },
  
  async deleteProject(id: string): Promise<void> {
    const token = getSession();
    if (!token) {
      const projects = JSON.parse(localStorage.getItem('projects') || '[]');
      const filtered = projects.filter((p: any) => p.id !== id);
      localStorage.setItem('projects', JSON.stringify(filtered));
      return;
    }
    
    await request(`/projects/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    const filtered = projects.filter((p: any) => p.id !== id);
    localStorage.setItem('projects', JSON.stringify(filtered));
  },
  
  async archiveProject(id: string): Promise<Project> {
    const token = getSession();
    if (!token) {
      const projects = JSON.parse(localStorage.getItem('projects') || '[]');
      const idx = projects.findIndex((p: any) => p.id === id);
      if (idx >= 0) {
        projects[idx].archived = true;
        localStorage.setItem('projects', JSON.stringify(projects));
      }
      return projects[idx];
    }
    
    const res = await request<Project>(`/projects/${id}/archive`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    const idx = projects.findIndex((p: any) => p.id === id);
    if (idx >= 0) projects[idx] = res;
    localStorage.setItem('projects', JSON.stringify(projects));
    return res;
  },
  
  async getNotes(projectId?: string): Promise<Note[]> {
    const token = getSession();
    if (!token) return JSON.parse(localStorage.getItem('notes') || '[]');
    
    let path = '/notes';
    if (projectId) path += `?project=${projectId}`;
    
    const res = await request<Note[]>(path, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    localStorage.setItem('notes', JSON.stringify(res));
    return res;
  },
  
  async saveNote(note: Note): Promise<Note> {
    const token = getSession();
    if (!token) {
      const notes = JSON.parse(localStorage.getItem('notes') || '[]');
      const idx = notes.findIndex((n: any) => n.id === note.id);
      if (idx >= 0) notes[idx] = note;
      else notes.push(note);
      localStorage.setItem('notes', JSON.stringify(notes));
      return note;
    }
    
    const res = await request<Note>(`/notes/${note.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(note),
    });
    
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    const idx = notes.findIndex((n: any) => n.id === note.id);
    if (idx >= 0) notes[idx] = res;
    else notes.push(res);
    localStorage.setItem('notes', JSON.stringify(notes));
    return res;
  },
  
  async addNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Note> {
    const token = getSession();
    if (!token) {
      const notes = JSON.parse(localStorage.getItem('notes') || '[]');
      const newNote = {
        ...note,
        id: note.id || crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      notes.unshift(newNote);
      localStorage.setItem('notes', JSON.stringify(notes));
      return newNote as Note;
    }
    
    const res = await request<Note>('/notes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(note),
    });
    
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    notes.unshift(res);
    localStorage.setItem('notes', JSON.stringify(notes));
    return res;
  },
  
  async deleteNote(id: string): Promise<void> {
    const token = getSession();
    if (!token) {
      const notes = JSON.parse(localStorage.getItem('notes') || '[]');
      const filtered = notes.filter((n: any) => n.id !== id);
      localStorage.setItem('notes', JSON.stringify(filtered));
      return;
    }
    
    await request(`/notes/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    const filtered = notes.filter((n: any) => n.id !== id);
    localStorage.setItem('notes', JSON.stringify(filtered));
  },
  
  async getTemplates(): Promise<TaskTemplate[]> {
    const token = getSession();
    if (!token) return JSON.parse(localStorage.getItem('templates') || '[]');
    
    const res = await request<TaskTemplate[]>('/templates', {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    localStorage.setItem('templates', JSON.stringify(res));
    return res;
  },
  
  async addTemplate(template: Omit<TaskTemplate, 'id' | 'createdAt'> & { id?: string }): Promise<TaskTemplate> {
    const token = getSession();
    if (!token) {
      const templates = JSON.parse(localStorage.getItem('templates') || '[]');
      const newTpl = {
        ...template,
        id: template.id || crypto.randomUUID(),
        createdAt: new Date(),
      };
      templates.unshift(newTpl);
      localStorage.setItem('templates', JSON.stringify(templates));
      return newTpl as TaskTemplate;
    }
    
    const res = await request<TaskTemplate>('/templates', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(template),
    });
    
    const templates = JSON.parse(localStorage.getItem('templates') || '[]');
    templates.unshift(res);
    localStorage.setItem('templates', JSON.stringify(templates));
    return res;
  },
  
  async useTemplate(id: string): Promise<{ createdTasks: string[] }> {
    const token = getSession();
    return await request(`/templates/${id}/use`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  
  async deleteTemplate(id: string): Promise<void> {
    const token = getSession();
    if (!token) {
      const templates = JSON.parse(localStorage.getItem('templates') || '[]');
      const filtered = templates.filter((t: any) => t.id !== id);
      localStorage.setItem('templates', JSON.stringify(filtered));
      return;
    }
    
    await request(`/templates/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    
    const templates = JSON.parse(localStorage.getItem('templates') || '[]');
    const filtered = templates.filter((t: any) => t.id !== id);
    localStorage.setItem('templates', JSON.stringify(templates));
  },
  
  async getNotifications(): Promise<any[]> {
    const token = getSession();
    if (!token) return [];
    
    return await request('/notifications', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  
  async getUnreadCount(): Promise<number> {
    const token = getSession();
    if (!token) return 0;
    
    const res = await request<{ count: number }>('/notifications/unread-count', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.count;
  },
  
  async markAsRead(id: string): Promise<void> {
    const token = getSession();
    if (!token) return;
    
    await request(`/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  
  async markAllAsRead(): Promise<void> {
    const token = getSession();
    if (!token) return;
    
    await request('/notifications/mark-all-read', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  
  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/health`);
      return res.ok;
    } catch {
      return false;
    }
  },
};
