// services/ai.ts
import { Task } from '../types/task';

// Lee la clave definida en tu archivo .env
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

export const parseDumpWithAI = async (rawText: string): Promise<Task[]> => {
  if (!GEMINI_API_KEY) {
    throw new Error('No se encontró la variable EXPO_PUBLIC_GEMINI_API_KEY en el entorno.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

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
      const errorData = await response.text();
      console.error('Error de respuesta Gemini:', errorData);
      throw new Error(`Error en API Gemini: ${response.status}`);
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