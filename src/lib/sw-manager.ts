
'use client';
import type { Task } from './types';

// A helper to promisify IndexedDB requests
function promisifyRequest<T = undefined>(request: IDBRequest<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        request.oncomplete = request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

const swManager = {
  async sendMessage(message: any): Promise<any> {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      return new Promise((resolve, reject) => {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          if (event.data && event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data);
          }
        };
        if (registration.active) {
          registration.active.postMessage(message, [messageChannel.port2]);
        } else {
          reject(new Error('Service worker is not active.'));
        }
      });
    }
    return Promise.reject(new Error('Service worker not supported.'));
  },

  async getPermissionState(): Promise<boolean> {
     if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      return false;
    }
    try {
        const response = await this.sendMessage({ type: 'GET_NOTIFICATION_STATE' });
        return response?.enabled ?? false;
    } catch (error) {
        console.error("Error getting permission state:", error);
        return false;
    }
  },

  async getBrowserPermissionState(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return 'default';
    }
    return Notification.permission;
  },

  async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Notifications not supported.');
      return false;
    }
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  },

  updateTasks(tasks: Task[], leadTime: number): void {
    const tasksWithISOStrings = tasks.map(task => ({
        ...task,
        dueDate: task.dueDate?.toISOString(),
        createdAt: task.createdAt?.toISOString() ?? new Date().toISOString(),
        completionDate: task.completionDate?.toISOString(),
        recurrence: task.recurrence ? {
          ...task.recurrence,
          endDate: task.recurrence.endDate?.toISOString(),
        } : undefined,
    }));

    this.sendMessage({
      type: 'UPDATE_TASKS',
      payload: { tasks: tasksWithISOStrings, leadTime },
    }).catch(err => console.error("Failed to update tasks in SW:", err));
  },

  async setNotificationsEnabled(enabled: boolean): Promise<void> {
    try {
      await this.sendMessage({
        type: 'SET_NOTIFICATIONS_ENABLED',
        payload: enabled,
      });
    } catch(err) {
      console.error("Failed to set notifications enabled in SW:", err)
    }
  },

  clearTasks(): void {
    this.sendMessage({ type: 'CLEAR_TASKS' }).catch(err => console.error("Failed to clear tasks in SW:", err));
  }
};

export { swManager };

  
