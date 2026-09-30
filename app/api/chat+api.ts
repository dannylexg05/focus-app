import { callGeminiWithRetry, describeGeminiError } from '../../services/gemini';

type IncomingMessage = { role: 'user' | 'model'; text: string };
type IncomingTask = {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
};

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: 'Falta la variable GEMINI_API_KEY en el archivo .env del servidor' },
      { status: 500 },
    );
  }

  const { history, tasks } = (await request.json()) as {
    history: IncomingMessage[];
    tasks: IncomingTask[];
  };

  if (!Array.isArray(history) || history.length === 0) {
    return Response.json({ error: 'history es requerido' }, { status: 400 });
  }

  const systemInstruction = `
Eres el asistente conversacional de Focus, una app de productividad. Ayudas al usuario a organizar sus tareas charlando de forma natural y breve, en español.

Estas son las tareas actuales del usuario (formato JSON):
${JSON.stringify(tasks ?? [])}

Responde SIEMPRE con un único objeto JSON, sin texto fuera del JSON, con esta forma exacta:
{
  "reply": "mensaje breve y natural para mostrarle al usuario",
  "actions": []
}

"actions" es un arreglo que puede ir vacío, o contener objetos con una de estas formas:
- { "type": "add_task", "title": "...", "priority": "high" | "medium" | "low" }
- { "type": "complete_task", "id": "<id de una tarea existente>" }
- { "type": "delete_task", "id": "<id de una tarea existente>" }
- { "type": "update_priority", "id": "<id de una tarea existente>", "priority": "high" | "medium" | "low" }

Usa "id" únicamente con valores que ya existan en la lista de tareas actuales. Si el usuario pide algo que no corresponde a ninguna acción (solo quiere hablar o pedir consejo), deja "actions" vacío y responde solo en "reply".
`;

  const geminiResponse = await callGeminiWithRetry(apiKey, {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: history.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    })),
    generationConfig: {
      temperature: 0.4,
      responseMimeType: 'application/json',
    },
  });

  if (!geminiResponse.ok) {
    const errorText = await geminiResponse.text();
    console.error('Detalle error Gemini (chat):', errorText);
    return Response.json(
      { error: describeGeminiError(geminiResponse.status, errorText) },
      { status: 502 },
    );
  }

  const data = await geminiResponse.json();
  const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawContent) {
    return Response.json({ error: 'La respuesta de Gemini vino vacía' }, { status: 502 });
  }

  return new Response(rawContent, {
    headers: { 'Content-Type': 'application/json' },
  });
}
