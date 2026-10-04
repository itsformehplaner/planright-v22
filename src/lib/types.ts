export type Priority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = 'active' | 'in-progress' | 'completed' | 'canceled' | 'on-hold';
export type TaskCategory = 'Work' | 'Personal' | 'Chore' | 'Learning';

export type ProgressEntry = {
  date: string; // ISO date string
  note?: string;
};

export type Note = {
  id: string;
  title: string;
  content: string;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Recurrence = {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: Date;
  daysOfWeek?: number[]; // 0 for Sunday, 6 for Saturday
};

export type VaultItem = {
  id: string;
  label: string;
  value: string;
};

export type Project = {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  userId?: string;
  vault?: VaultItem[]; // For storing quick reference info like Wi-Fi, codes, etc.
};

export type TaskNote = {
  id: string;
  content: string;
  createdAt: Date;
};

export type Task = {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date;
  startTime?: string;
  endTime?: string;
  priority: Priority;
  status: TaskStatus;
  category: TaskCategory;
  parentId?: string;
  completionDate?: Date;
  cancellationNote?: string;
  createdAt: Date;
  updatedAt?: Date;
  dependsOn?: string[];
  trackDailyProgress?: boolean;
  progress?: ProgressEntry[];
  isPinned?: boolean;
  recurrence?: Recurrence;
  originalRecurringTaskId?: string;
  projectId: string;
  userId?: string;
  taskLogs?: TaskNote[]; // For general record keeping on tasks
  outcomeNote?: string; // For recording the final result when a task is completed
};

export type TaskTemplateSubTask = {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  category: TaskCategory;
  dueDayOffset?: number;
}

export type TaskTemplate = {
  id: string;
  name: string;
  subTasks: TaskTemplateSubTask[];
  userId?: string;
};
