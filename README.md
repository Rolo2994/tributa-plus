# Tributa+ — App móvil para contadores independientes

App PWA (React + Vite + Tailwind) inspirada en la identidad visual de SUNAT. Gestiona RUCs, notas
tributarias por cliente, alertas de vencimiento y accesos rápidos a los módulos de escritorio
(Trámites y Consultas, Declaración y Pago, Declaración Anual, AFPnet, Buzón PDF, Validez CP,
Detracciones, SIRE).

Este proyecto viene con **datos simulados (mock)** para que puedas probar cada pantalla e
interacción sin conectar nada todavía. Cuando estés listo, sigue la sección "Conectar Google
Sheets" para que lea/escriba tu Excel real.

---

## 1. Requisitos previos

Necesitas tener instalado **Node.js** (versión 18 o superior) en tu computadora.

1. Ve a [nodejs.org](https://nodejs.org) y descarga la versión "LTS" (recomendada).
2. Instálalo como cualquier programa (Siguiente, Siguiente, Finalizar).
3. Para confirmar que quedó instalado, abre una terminal (en Windows: busca "PowerShell" o
   "Símbolo del sistema" en el menú de inicio; en Mac: busca "Terminal") y escribe:
   ```
   node -v
   ```
   Debería mostrarte algo como `v20.x.x`. Si sale un error, reinicia la computadora e intenta de
   nuevo.

## 2. Instalar y correr el proyecto en tu computadora

1. Descomprime la carpeta `tributa-plus` en algún lugar fácil de encontrar (ej. Escritorio).
2. Abre una terminal **dentro de esa carpeta**. Formas fáciles de hacerlo:
   - Windows: abre la carpeta en el Explorador de Archivos, haz clic en la barra de direcciones
     arriba, escribe `cmd` y presiona Enter.
   - Mac: clic derecho sobre la carpeta → "Nueva Terminal en la carpeta" (si no aparece esa
     opción, abre Terminal y escribe `cd ` seguido de arrastrar la carpeta a la ventana, luego
     Enter).
3. Instala las dependencias (solo la primera vez, tarda 1-2 minutos):
   ```
   npm install
   ```
4. Levanta el servidor de desarrollo:
   ```
   npm run dev
   ```
5. La terminal te va a mostrar una dirección tipo `http://localhost:5173`. Ábrela en tu navegador
   (Chrome recomendado) y ahí verás la app funcionando con los datos de ejemplo.
6. Para ver cómo se vería en un celular, en Chrome presiona F12 (herramientas de desarrollador),
   luego el ícono de celular/tablet arriba a la izquierda de ese panel.

Para detener el servidor, vuelve a la terminal y presiona `Ctrl + C`.

## 3. Subirlo a GitHub

1. Crea una cuenta en [github.com](https://github.com) si no tienes.
2. Crea un repositorio nuevo (botón "+" arriba a la derecha → "New repository"), márcalo como
   "Public", dale un nombre como `tributa-plus`.
3. En tu terminal, dentro de la carpeta del proyecto, ejecuta (reemplaza la URL por la de tu
   repositorio, que GitHub te muestra después de crearlo):
   ```
   git init
   git add .
   git commit -m "Primera versión de Tributa+"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/tributa-plus.git
   git push -u origin main
   ```
   Si `git` no está instalado, descárgalo de [git-scm.com](https://git-scm.com) primero.

## 4. Publicarlo con HTTPS para poder instalarlo como app

Un requisito no negociable de las PWA: el navegador solo permite "Instalar app" si el sitio usa
**HTTPS**. La forma más simple y gratuita es **Vercel**:

1. Ve a [vercel.com](https://vercel.com) y crea una cuenta (puedes usar tu cuenta de GitHub para
   entrar directo, sin crear otra contraseña).
2. Clic en "Add New" → "Project" → elige el repositorio `tributa-plus` que subiste en el paso
   anterior.
3. Vercel detecta automáticamente que es un proyecto Vite — no cambies nada, solo dale "Deploy".
4. En 1-2 minutos te da una URL tipo `https://tributa-plus-tuusuario.vercel.app`. Esa es tu app
   ya publicada y con HTTPS.
5. Ábrela desde el navegador de tu celular:
   - **Android/Chrome**: te aparece un aviso "Instalar app" abajo, o desde el menú (⋮) →
     "Instalar aplicación".
   - **iPhone/Safari**: toca el ícono de compartir (cuadrito con flecha) → "Agregar a pantalla de
     inicio".

Cada vez que hagas `git push` con cambios nuevos, Vercel actualiza la app sola — no hace falta
reinstalarla en el celular.

## 5. Conectar Google Sheets (reemplazar los datos simulados por tu Excel real)

**Paso A — Prepara el Google Sheet:**

1. Abre tu archivo `ruc_lista.xlsx` en Excel.
2. Ve a [sheets.google.com](https://sheets.google.com) → "Archivo" → "Importar" → sube el
   `ruc_lista.xlsx`. Elige "Reemplazar hoja de cálculo" para que quede como Google Sheet nativo
   (con todas sus hojas: la principal + "sire" + "dj mensual" + "dj anual").
3. Verifica que la hoja principal se llame exactamente **"RUCs"** (si se llama distinto, cámbiale
   el nombre haciendo doble clic en la pestaña de abajo, o edita `HOJA_RUCS` en
   `apps-script/Code.gs` para que coincida).

**Paso B — Despliega el Apps Script (tu "backend" gratuito):**

1. En el Google Sheet, ve a "Extensiones" → "Apps Script". Se abre un editor de código en una
   pestaña nueva.
2. Borra todo el contenido de `Code.gs` que aparece por defecto.
3. Abre el archivo `apps-script/Code.gs` de este proyecto, copia todo su contenido, y pégalo ahí.
4. Guarda (ícono de disquete o `Ctrl+S`).
5. Clic en "Implementar" (botón azul arriba a la derecha) → "Nueva implementación".
6. En "Tipo", elige el ícono de engranaje → "Aplicación web".
7. Configura: "Ejecutar como" → **Yo (tu correo)**. "Quién tiene acceso" → **Cualquier usuario**.
8. Clic en "Implementar". Te va a pedir autorizar permisos la primera vez — es tu propio script
   pidiendo acceso a tu propio Sheet, es seguro.
9. Copia la URL que te muestra (termina en `/exec`).

**Paso C — Conecta la app:**

1. En la carpeta del proyecto, abre el archivo `.env` con cualquier editor de texto (o crea uno
   nuevo copiando `.env.example`).
2. Pega la URL en la línea:
   ```
   VITE_SHEETS_API_URL=https://script.google.com/macros/s/AKfycb.../exec
   ```
3. Guarda, y reinicia `npm run dev` (Ctrl+C y vuelve a correr `npm run dev`).
4. En Ajustes → Base de datos, deberías ver el estado "Conectado".

**Paso D — Usar los datos reales en vez del mock:**

Por ahora el archivo `src/context/AppContext.jsx` sigue usando `RUCS` desde
`src/data/mockData.js`. El paso final para consumir datos reales es reemplazar esa línea por una
llamada a `getRucs()` de `src/services/googleSheetsApi.js` dentro de un `useEffect`. Esto lo dejé
como último paso a propósito, para que puedas revisar primero que el Apps Script responde bien
(puedes probarlo pegando la URL + `?action=listRucs` directo en el navegador) antes de que la app
dependa de él.

## 6. Sobre la huella / Face ID (WebAuthn)

El bloqueo por huella o Face ID en `src/hooks/useWebAuthn.js` usa la API real del navegador
(WebAuthn) — no es una simulación visual. Funciona en Chrome/Safari/Edge modernos sobre HTTPS (o
`localhost` durante desarrollo). La primera vez que la actives, el navegador te pide registrar tu
huella/Face ID; las siguientes veces solo la verifica. Es un patrón pensado para "desbloqueo de
conveniencia" de esta app en tu propio celular — la seguridad de los datos en sí depende de la
sesión de Google (OAuth) que usa Google Sheets, no de esto.

## 7. Estructura del proyecto

```
tributa-plus/
├── apps-script/Code.gs        # Backend gratuito en Google (pegar en Apps Script)
├── public/icon.svg            # Ícono de la app (reemplázalo por tu logo si quieres)
├── src/
│   ├── components/            # Piezas reutilizables (RucCard, ConsoleLog, PdfViewer, etc.)
│   ├── screens/                # Una pantalla por módulo (Home, Buzón, SIRE, Ajustes, etc.)
│   ├── context/AppContext.jsx # Estado global compartido (RUC activo, filtros, logs)
│   ├── hooks/                  # useLocalStorage, useWebAuthn
│   ├── data/mockData.js       # Datos de ejemplo — bórralos cuando conectes Sheets
│   └── services/googleSheetsApi.js  # Cliente que habla con Code.gs
└── .env                       # Tu URL del Apps Script (no la subas a un repo público)
```

## 8. Notas de diseño y comportamiento (para que no se pierdan al iterar)

- **Ninguna acción descarga archivos automáticamente.** Buzón PDF, SIRE y Detracciones muestran
  todo en pantalla (`PdfViewer.jsx`, `ReportTable.jsx`); solo el botón explícito "Descargar"
  genera un archivo real en el dispositivo.
- **El scraping pesado sigue viviendo en la app de escritorio** (`sunat_launcher.py`). El celular
  solo visualiza lo que la PC ya descargó y sincronizó.
- Paleta, tipografías y componentes replican el prototipo HTML aprobado — si agregas pantallas
  nuevas, reutiliza los mismos tokens de `tailwind.config.js` en vez de definir colores sueltos.
