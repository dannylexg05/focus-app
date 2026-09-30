// services/ai.ts
import { ChatAction, ChatMessage } from '../types/chat';
import { Task } from '../types/task';

export const parseDumpWithAI = async (
  rawText: string,
  listId: string,
): Promise<Task[]> => {
  const response = await fetch('/api/parse-dump', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawText }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    console.error('Detalle error IA:', errorBody);
    throw new Error(errorBody?.error ?? `Error al procesar con IA: ${response.status}`);
  }

  const parsed: { title: string; priority: Task['priority'] }[] = await response.json();
  const now = Date.now();

  return parsed.map((item, index) => ({
    id: `${now}-${index}`,
    title: item.title,
    completed: false,
    priority: item.priority,
    listId,
    createdAt: now,
    updatedAt: now,
  }));
};

interface ChatResult {
  reply: string;
  actions: ChatAction[];
}

export const sendChatMessage = async (
  history: ChatMessage[],
  tasks: Task[],
): Promise<ChatResult> => {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      history: history.map((m) => ({ role: m.role, text: m.text })),
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        completed: t.completed,
      })),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    console.error('Detalle error chat IA:', errorBody);
    throw new Error(errorBody?.error ?? `Error al hablar con la IA: ${response.status}`);
  }

  const data: ChatResult = await response.json();
  return {
    reply: typeof data.reply === 'string' ? data.reply : '',
    actions: Array.isArray(data.actions) ? data.actions : [],
  };
};
