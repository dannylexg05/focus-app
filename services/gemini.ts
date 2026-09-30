// services/gemini.ts
// Solo se usa desde las rutas API (server-side). No importar desde código de cliente.
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent';

export async function callGeminiWithRetry(
  apiKey: string,
  body: unknown,
  retries = 2,
): Promise<Response> {
  let lastResponse: Response;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
    });

    if (response.ok || response.status !== 503) {
      return response;
    }

    lastResponse = response;
    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 600 * 2 ** attempt));
    }
  }

  return lastResponse!;
}

export function describeGeminiError(status: number, bodyText: string): string {
  try {
    const parsed = JSON.parse(bodyText);
    const googleStatus = parsed?.error?.status;
    const message: string | undefined = parsed?.error?.message;

    if (googleStatus === 'RESOURCE_EXHAUSTED') {
      const isDailyQuota = message?.includes('PerDay');
      return isDailyQuota
        ? 'Se alcanzó el límite diario gratuito de la IA para este modelo. Intenta de nuevo mañana o activa facturación en tu proyecto de Gemini (ai.google.dev/gemini-api/docs/rate-limits).'
        : 'La IA está recibiendo demasiadas solicitudes por minuto. Espera un momento e inténtalo de nuevo.';
    }

    if (googleStatus === 'UNAVAILABLE') {
      return 'La IA está sobrecargada en este momento. Inténtalo de nuevo en unos segundos.';
    }
  } catch {
    // el cuerpo no era JSON o no tenía la forma esperada; cae al mensaje genérico
  }

  return `Error en API Gemini: ${status}`;
}
