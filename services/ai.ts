// services/ai.ts
import { Task } from '../types/task';

// NOTA: Para pruebas locales rápidas entre ustedes pueden colocar su API key aquí.
// Al pasar a producción se recomienda manejarla vía variables de entorno o un backend proxy.
const OPENAI_API_KEY = 'TU_API_KEY_AQUI';

export const parseDumpWithAI = async (rawText: string): Promise<Task[]> => {
  const prompt = `
Eres un asistente de productividad minimalista. El usuario te dará un texto desordenado con pendientes ("brain dump").
Tu objetivo es seleccionar únicamente las 3 tareas prioritarias y más accionables.
Devuelve EXCLUSIVAMENTE un arreglo JSON válido (sin formato Markdown adicional, sin backticks de bloque) con objetos que tengan esta estructura:
[
  {
    "title": "Descripción concreta de la tarea",
    "priority": "high" | "medium" | "low"
  }
]

Texto del usuario:
"${rawText}"
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      }),
    });

    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    
    // Limpieza básica por si el modelo incluye bloques de código
    const cleanJson = content.replace(/^```json/, '').replace(/```$/, '').trim();
    const parsed: { title: string; priority: 'high' | 'medium' | 'low' }[] = JSON.parse(cleanJson);

    return parsed.map((item, index) => ({
      id: Date.now().toString() + index,
      title: item.title,
      completed: false,
      priority: item.priority,
      createdAt: Date.now(),
    }));
  } catch (error) {
    console.error('Error al consultar la IA:', error);
    throw error;
  }
};
