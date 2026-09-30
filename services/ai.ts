// services/ai.ts
import { Task } from '../types/task';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

export const parseDumpWithAI = async (rawText: string): Promise<Task[]> => {
  if (!GEMINI_API_KEY) {
    throw new Error('Falta la variable EXPO_PUBLIC_GEMINI_API_KEY en el archivo .env');
  }

  // Modelo actualizado según el requerimiento de la API
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent';

  const prompt = `
Eres un asistente de productividad minimalista. El usuario te dará un texto desordenado con pendientes ("brain dump").
Tu objetivo es seleccionar únicamente las 3 tareas prioritarias y más accionables.
Devuelve un arreglo JSON con objetos que tengan exactamente esta estructura:
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
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Detalle error Gemini:', errorText);
      throw new Error(`Error en API Gemini: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawContent) {
      throw new Error('La respuesta de Gemini vino vacía');
    }

    const parsed: { title: string; priority: 'high' | 'medium' | 'low' }[] = JSON.parse(rawContent);

    return parsed.map((item, index) => ({
      id: Date.now().toString() + index,
      title: item.title,
      completed: false,
      priority: item.priority,
      createdAt: Date.now(),
    }));
  } catch (error) {
    console.error('Error al consultar Gemini:', error);
    throw error;
  }
};