// types/task.ts
export interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  createdAt: number;
}
