export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: 'Falta la variable GEMINI_API_KEY en el archivo .env del servidor' },
      { status: 500 },
    );
  }

  const { rawText } = await request.json();

  if (!rawText || typeof rawText !== 'string') {
    return Response.json({ error: 'rawText es requerido' }, { status: 400 });
  }

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

  const geminiResponse = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!geminiResponse.ok) {
    const errorText = await geminiResponse.text();
    console.error('Detalle error Gemini:', errorText);
    return Response.json(
      { error: `Error en API Gemini: ${geminiResponse.status}` },
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
