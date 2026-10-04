// Cloud Sync Hook - Manages data sync between D1 and localStorage
// Usage: useCloudSync() returns { isSynced, syncing, error, refresh }

import * as React from 'react';
import { cloudApi } from '@/lib/cloud-api';

export function useCloudSync() {
  const [isSynced, setIsSynced] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastSync, setLastSync] = React.useState<Date | null>(null);

  const syncFromCloud = React.useCallback(async () => {
    setSyncing(true);
    setError(null);

    try {
      const token = localStorage.getItem('pr_session');
      if (!token) {
        setIsSynced(true);
        setSyncing(false);
        return;
      }

      const [tasks, projects, notes, templates] = await Promise.all([
        cloudApi.getTasks(),
        cloudApi.getProjects(),
        cloudApi.getNotes(),
        cloudApi.getTemplates(),
      ]);

      localStorage.setItem('tasks', JSON.stringify(tasks));
      localStorage.setItem('projects', JSON.stringify(projects));
      localStorage.setItem('notes', JSON.stringify(notes));
      localStorage.setItem('taskTemplates', JSON.stringify(templates));

      setIsSynced(true);
      setLastSync(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
      setIsSynced(true);
    } finally {
      setSyncing(false);
    }
  }, []);

  const syncTask = React.useCallback(async (taskId: string, update: any) => {
    const token = localStorage.getItem('pr_session');
    if (!token) {
      const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
      const idx = tasks.findIndex((t: any) => t.id === taskId);
      if (idx >= 0) {
        tasks[idx] = { ...tasks[idx], ...update, updatedAt: new Date() };
        localStorage.setItem('tasks', JSON.stringify(tasks));
      }
      return;
    }
    const res = await cloudApi.saveTask({ ...update, id: taskId });
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const idx = tasks.findIndex((t: any) => t.id === taskId);
    if (idx >= 0) tasks[idx] = res;
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, []);

  const addTask = React.useCallback(async (task: any) => {
    const token = localStorage.getItem('pr_session');
    if (!token) {
      const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
      const newTask = { ...task, id: task.id || crypto.randomUUID(), createdAt: new Date() };
      tasks.unshift(newTask);
      localStorage.setItem('tasks', JSON.stringify(tasks));
      return newTask;
    }
    const res = await cloudApi.addTask(task);
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    tasks.unshift(res);
    localStorage.setItem('tasks', JSON.stringify(tasks));
    return res;
  }, []);

  const deleteTask = React.useCallback(async (taskId: string) => {
    const token = localStorage.getItem('pr_session');
    if (!token) {
      const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
      const filtered = tasks.filter((t: any) => t.id !== taskId && t.parentId !== taskId);
      localStorage.setItem('tasks', JSON.stringify(filtered));
      return;
    }
    await cloudApi.deleteTask(taskId);
    const tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const filtered = tasks.filter((t: any) => t.id !== taskId && t.parentId !== taskId);
    localStorage.setItem('tasks', JSON.stringify(filtered));
  }, []);

  const saveProject = React.useCallback(async (project: any) => {
    const token = localStorage.getItem('pr_session');
    if (!token) {
      const projects = JSON.parse(localStorage.getItem('projects') || '[]');
      const idx = projects.findIndex((p: any) => p.id === project.id);
      if (idx >= 0) projects[idx] = project;
      else projects.push(project);
      localStorage.setItem('projects', JSON.stringify(projects));
      return project;
    }
    const res = await cloudApi.saveProject(project);
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    const idx = projects.findIndex((p: any) => p.id === project.id);
    if (idx >= 0) projects[idx] = res;
    else projects.push(res);
    localStorage.setItem('projects', JSON.stringify(projects));
    return res;
  }, []);

  const deleteProject = React.useCallback(async (projectId: string) => {
    const token = localStorage.getItem('pr_session');
    if (!token) {
      const projects = JSON.parse(localStorage.getItem('projects') || '[]');
      const filtered = projects.filter((p: any) => p.id !== projectId);
      localStorage.setItem('projects', JSON.stringify(filtered));
      return;
    }
    await cloudApi.deleteProject(projectId);
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    const filtered = projects.filter((p: any) => p.id !== projectId);
    localStorage.setItem('projects', JSON.stringify(filtered));
  }, []);

  const saveNote = React.useCallback(async (note: any) => {
    const token = localStorage.getItem('pr_session');
    if (!token) {
      const notes = JSON.parse(localStorage.getItem('notes') || '[]');
      const idx = notes.findIndex((n: any) => n.id === note.id);
      if (idx >= 0) notes[idx] = note;
      else notes.push(note);
      localStorage.setItem('notes', JSON.stringify(notes));
      return note;
    }
    const res = await cloudApi.saveNote(note);
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    const idx = notes.findIndex((n: any) => n.id === note.id);
    if (idx >= 0) notes[idx] = res;
    else notes.push(res);
    localStorage.setItem('notes', JSON.stringify(notes));
    return res;
  }, []);

  const deleteNote = React.useCallback(async (noteId: string) => {
    const token = localStorage.getItem('pr_session');
    if (!token) {
      const notes = JSON.parse(localStorage.getItem('notes') || '[]');
      const filtered = notes.filter((n: any) => n.id !== noteId);
      localStorage.setItem('notes', JSON.stringify(filtered));
      return;
    }
    await cloudApi.deleteNote(noteId);
    const notes = JSON.parse(localStorage.getItem('notes') || '[]');
    const filtered = notes.filter((n: any) => n.id !== noteId);
    localStorage.setItem('notes', JSON.stringify(notes));
  }, []);

  const saveTemplate = React.useCallback(async (template: any) => {
    const token = localStorage.getItem('pr_session');
    if (!token) {
      const templates = JSON.parse(localStorage.getItem('taskTemplates') || '[]');
      templates.unshift(template);
      localStorage.setItem('taskTemplates', JSON.stringify(templates));
      return template;
    }
    const res = await cloudApi.addTemplate(template);
    const templates = JSON.parse(localStorage.getItem('taskTemplates') || '[]');
    templates.unshift(res);
    localStorage.setItem('taskTemplates', JSON.stringify(templates));
    return res;
  }, []);

  const deleteTemplate = React.useCallback(async (templateId: string) => {
    const token = localStorage.getItem('pr_session');
    if (!token) {
      const templates = JSON.parse(localStorage.getItem('taskTemplates') || '[]');
      const filtered = templates.filter((t: any) => t.id !== templateId);
      localStorage.setItem('taskTemplates', JSON.stringify(templates));
      return;
    }
    await cloudApi.deleteTemplate(templateId);
    const templates = JSON.parse(localStorage.getItem('taskTemplates') || '[]');
    const filtered = templates.filter((t: any) => t.id !== templateId);
    localStorage.setItem('taskTemplates', JSON.stringify(templates));
  }, []);

  const refresh = React.useCallback(async () => {
    await syncFromCloud();
  }, [syncFromCloud]);

  return {
    isSynced,
    syncing,
    error,
    lastSync,
    refresh,
    syncTask,
    addTask,
    deleteTask,
    saveProject,
    deleteProject,
    saveNote,
    deleteNote,
    saveTemplate,
    deleteTemplate,
  };
}
