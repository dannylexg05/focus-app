# Focus — guía de lanzamiento

## Ya está listo (verificado en este entorno)

- **Funciones**: tareas con prioridad y enfoque automático, listas/categorías, editar/eliminar tareas, recordatorios locales (notificaciones), asistente conversacional con IA que puede agregar/completar/reprorizar tareas por chat, ajustes con tema claro/oscuro/sistema y borrado de datos.
- **Seguridad**: la API key de Gemini (`GEMINI_API_KEY`) vive únicamente en el servidor (rutas API de Expo Router, `app/api/*+api.ts`). Nunca se empaqueta en el cliente — verificado revisando el bundle exportado.
- **Backend propio**: `web.output` está en `"server"` (no `"static"`) para que `/api/parse-dump` y `/api/chat` se incluyan de verdad en cualquier exportación/despliegue. Confirmado con `npx expo export --platform web`: ambas rutas aparecen bajo "API routes".
- **Pruebas reales hechas en este entorno**:
  - `npx tsc --noEmit` → sin errores.
  - `npx expo-doctor` → 21/21 checks pasados.
  - Servidor de desarrollo levantado y probado con `curl` real contra Gemini: `/api/parse-dump` y `/api/chat` responden 200 con el JSON esperado (hubo algún 503 aislado de Gemini por alta demanda del modelo — es un problema transitorio de Google, no del código).
  - Las 3 pantallas (Inicio, Asistente, Ajustes) renderizan su contenido sin errores.
- **Corrección importante**: en una revisión anterior sospeché que el modelo `gemini-3.8-flash` no existía. Quedó demostrado que sí existe — Google lo reconoce y respondió correctamente una vez que no estaba sobrecargado. Sin embargo, su cuota gratuita resultó ser de solo **20 solicitudes por día** (`RESOURCE_EXHAUSTED`, error 429), algo que se agota con pruebas normales.
- **Modelo cambiado a `gemini-3.5-flash-lite`** (en [services/gemini.ts](services/gemini.ts)) para tener más cuota gratuita disponible — probado end-to-end con `curl` real y funciona (200, JSON válido, en ambas rutas). Google ya no publica una tabla pública con el RPD exacto por modelo (lo movieron a un panel personal en aistudio.google.com/rate-limit), así que si vuelves a toparte con un 429, revisa tu cuota ahí — la app ahora te lo dirá con un mensaje claro en vez de un error genérico.
- **Reintento automático** ante sobrecarga transitoria del modelo (503) antes de mostrar error al usuario.

## Lo que solo tú puedes hacer (requiere tus cuentas, pagos y aprobación)

Nada de esto lo puedo ejecutar yo: necesita tus credenciales, tu tarjeta y tu aprobación manual en cada paso.

### 1. Desplegar el backend (para que la IA funcione en producción)
La app en tu teléfono necesita un servidor real al que llamar — en desarrollo usa tu Metro local, pero eso no existe en un build de producción.

1. `npx eas-cli@latest login`
2. `npx eas-cli@latest deploy` (sube `dist/` a un dominio `*.expo.app`, incluyendo las rutas API)
3. En el panel de EAS (Project → Environment variables), agrega `GEMINI_API_KEY` con tu key real — el `.env` local nunca se sube.
4. Copia la URL pública que te dé el deploy y agrégala en `app.json`:
   ```json
   ["expo-router", { "origin": "https://TU-URL.expo.app" }]
   ```
   Sin este paso, la app nativa no sabrá a dónde llamar y el asistente de IA no funcionará fuera de desarrollo.

### 2. Cuentas de desarrollador (pago obligatorio)
- **Apple Developer Program**: 99 USD/año — developer.apple.com
- **Google Play Console**: 25 USD pago único — play.google.com/console

### 3. Revisar el identificador de la app
En `app.json` dejé `com.dannylexg05.focusapp` como placeholder (`ios.bundleIdentifier` / `android.package`). Es único en el mundo y **prácticamente no se puede cambiar después del primer envío** — confírmalo o cámbialo antes de compilar para producción.

### 4. Compilar
```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform all --profile production
```

### 5. Enviar a las tiendas
```bash
npx eas-cli@latest submit --platform ios      # pide Apple ID / App Store Connect API key
npx eas-cli@latest submit --platform android  # pide un service account JSON de Google Play
```

### 6. Ficha de la tienda (contenido que debes crear tú)
- Capturas de pantalla reales del dispositivo/simulador.
- Descripción, categoría, palabras clave.
- **URL pública de política de privacidad** (obligatoria: la app usa IA externa y notificaciones). No puedo alojarla por ti — puede ser una página simple en cualquier hosting gratuito.
- Reemplazar el ícono/splash genérico de la plantilla de Expo (`assets/images/`) por el arte final de tu marca antes de publicar.

## Limitaciones conocidas (a propósito, por alcance)
- Los recordatorios son **notificaciones locales**, no push remoto — no requieren servidor de push ni funcionan si la app fue desinstalada. Suficiente para recordatorios personales; si más adelante quieres notificaciones enviadas desde un servidor (no solo programadas en el dispositivo), es una función aparte.
- No hay autenticación ni sincronización en la nube entre dispositivos — los datos viven en `AsyncStorage`, local a cada instalación.
