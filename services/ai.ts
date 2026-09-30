// services/ai.ts
import { Task } from '../types/task';

export const parseDumpWithAI = async (rawText: string): Promise<Task[]> => {
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

  const parsed: { title: string; priority: 'high' | 'medium' | 'low' }[] = await response.json();

  return parsed.map((item, index) => ({
    id: `${Date.now()}-${index}`,
    title: item.title,
    completed: false,
    priority: item.priority,
    createdAt: Date.now(),
  }));
};
