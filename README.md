# Quiniela Mundial 2026

Aplicación web de quiniela para el Mundial FIFA 2026. Sincronización en tiempo real via Firebase.

---

## Setup en 5 pasos

### 1. Crear proyecto Firebase

1. Ve a [console.firebase.google.com](https://console.firebase.google.com)
2. Clic en **"Agregar proyecto"** → nombre: `quiniela-mundial-2026`
3. Desactiva Google Analytics (no es necesario) → **Crear proyecto**

### 2. Habilitar Realtime Database

1. En el menú lateral → **Build → Realtime Database**
2. Clic **"Crear base de datos"**
3. Elige región: `us-central1`
4. Selecciona **"Iniciar en modo de prueba"** → Habilitar
5. Ve a la pestaña **"Reglas"** y pega esto:

```json
{
  "rules": {
    "predictions": { ".read": true, ".write": true },
    "results": { ".read": true, ".write": true },
    "players": { ".read": true, ".write": true },
    "knockoutTeams": { ".read": true, ".write": true }
  }
}
```

6. Clic **Publicar**

### 3. Obtener credenciales

1. Clic en el ⚙️ (Configuración del proyecto)
2. Scroll hacia abajo → **"Tus apps"** → clic en `</>` (Web)
3. Registra la app con el nombre `quiniela-web` → **Registrar app**
4. Copia el objeto `firebaseConfig` que aparece

### 4. Configurar `.env.local`

Abre `.env.local` en la raíz del proyecto y reemplaza los valores con los de tu Firebase:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://tu-proyecto-default-rtdb.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

NEXT_PUBLIC_ADMIN_PASSWORD=tu_password_secreto
```

### 5. Correr localmente

```bash
npm install
npm run dev
# Abre http://localhost:3000
```

---

## Deploy en Vercel (link público para amigos)

```bash
# 1. Inicializa git y sube a GitHub
git add .
git commit -m "quiniela mundial 2026"
# Crea un repo en github.com y haz push

# 2. Ve a vercel.com
# - New Project → importa tu repo de GitHub
# - En "Environment Variables" agrega todas las variables de .env.local
# - Deploy → obtienes un link tipo quiniela-mundial-2026.vercel.app
```

---

## Cómo usar

### Jugadores
- Abre el link → ingresa tu nombre → listo
- Navega por grupos (A–L) y eliminatorias (R32, R16, QF, SF, Final)
- Para cada partido presiona **1** (local), **X** (empate) o **2** (visitante)
- Las predicciones se sincronizan automáticamente

### Admin
- Ve a `/admin` → ingresa la contraseña de `.env.local`
- Selecciona partido → goles → **Guardar resultado**
- El ranking se actualiza en tiempo real para todos

### Fase eliminatoria
- En Admin → **"Asignar equipos a eliminatorias"**
- Cuando sepas quién avanzó, asigna los equipos a R32, R16, etc.

---

## Puntos

| Resultado | Puntos |
|-----------|--------|
| Acertar ganador / empate | **3 pts** |
| Marcador exacto | **+2 pts** (total 5) |
| Fallo | 0 pts |

---

## Getting Started (original)

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
