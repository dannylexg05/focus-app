// types/task.ts
export type Priority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: Priority;
  listId: string;
  reminderAt?: number;
  notificationId?: string;
  createdAt: number;
  updatedAt: number;
}
