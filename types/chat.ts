// types/chat.ts
import { Priority } from './task';

export type ChatRole = 'user' | 'model';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: number;
}

export type ChatAction =
  | { type: 'add_task'; title: string; priority: Priority }
  | { type: 'complete_task'; id: string }
  | { type: 'delete_task'; id: string }
  | { type: 'update_priority'; id: string; priority: Priority };
