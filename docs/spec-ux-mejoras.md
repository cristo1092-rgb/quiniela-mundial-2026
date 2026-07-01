# Spec: Mejoras UX/Performance — Quiniela Mundial 2026

## Objetivo

Reducir la fricción para los usuarios en móvil en tres frentes:
1. **Tablas pegadas en móvil** — En ocasiones los grupos o tablas quedan con `position: fixed` o scroll bloqueado, impidiendo el scroll normal.
2. **Acceso rápido a partidos de hoy** — Para poner una predicción o ver un resultado, el usuario tiene que entrar a "Partidos", identificar en qué jornada cae hoy, navegar al tab correcto y hacer scroll hasta el partido. Debe haber un atajo.
3. **Orientación clara** — La navegación actual tiene "Partidos" y "Predicciones" con propósitos distintos pero no es intuitivo cuál es para capturar tu quiniela.

Usuario objetivo: jugadores de la quiniela desde el celular.

---

## Tech Stack

- Next.js 16.2.7 App Router, React 19, TypeScript
- Tailwind CSS v4
- Firebase Realtime Database
- `vitest` para tests unitarios

## Commands

```bash
npm run dev       # servidor de desarrollo
npm run build     # build de producción (valida TypeScript)
npm test          # vitest run — 29 tests
npm run lint      # eslint
```

## Estructura relevante

```
app/
  quiniela/page.tsx     → captura de predicciones (MatchCard con steppers)
  predicciones/page.tsx → vista de predicciones de todos
  ranking/page.tsx      → tabla de posiciones
  page.tsx              → redirige a /entrar
components/
  NavLinks.tsx          → TopNav (desktop) + BottomNav (móvil, 5 tabs)
  TodayMatches.tsx      → widget de partidos de hoy (solo informativo, en /quiniela)
  MatchCard.tsx         → tarjeta individual de partido con steppers
  GroupStandings.tsx    → tabla de posiciones por grupo
  RankingTable.tsx      → tabla general de ranking
```

## Mejoras a implementar

### M1 — Tab "Hoy" en /quiniela para saltar directo a partidos del día

**Problema**: el usuario tiene que saber en qué jornada está hoy, cambiar al tab correcto y hacer scroll para llegar a los partidos de hoy.

**Solución**: Agregar un tab "Hoy" que aparezca solo cuando hay partidos con fecha = hoy. Al seleccionarlo, filtra y muestra únicamente los partidos del día (de cualquier jornada/etapa). El tab desaparece en días sin partidos.

- El tab "Hoy" se inserta a la izquierda (primer tab) cuando existen partidos hoy.
- Si el tab activo es "Hoy" y no hay partidos ese día, regresa automáticamente al tab de jornada actual.
- `getCurrentJornada()` ya existe en `lib/matches.ts` — usarlo para el fallback.

**Aceptación**:
- [ ] Cuando hay partidos hoy, aparece el tab "Hoy" como primera opción y está seleccionado por defecto si la jornada actual ya pasó o no tiene partidos en otra fecha.
- [ ] Los MatchCards mostrados permiten capturar predicciones normalmente.
- [ ] En días sin partidos, el tab "Hoy" no aparece.

### M2 — Acceso rápido a resultados del día desde /predicciones

**Problema**: para ver quién acertó en los partidos de hoy, el usuario entra a "Predicciones" y tiene que navegar por el tab de jornada correcto y hacer scroll.

**Solución**: El componente `TodayMatches` (actualmente solo en /quiniela) debe mostrarse también al inicio de `/predicciones`. Cuando se hace clic en un partido en ese widget, hace scroll hasta la fila correspondiente en la tabla de predicciones.

Alternativa más simple (no requiere scroll programático): agregar un tab "Hoy" equivalente en `/predicciones` (mismo patrón que M1) que filtra la tabla para mostrar solo los partidos del día.

**Aceptación**:
- [ ] En `/predicciones`, existe un camino de ≤ 2 taps para ver las predicciones de los partidos de hoy.
- [ ] La UI es coherente con la del tab "Hoy" de /quiniela.

### M3 — Fix: tablas pegadas en móvil

**Problema**: en ciertos estados, las tablas (GroupStandings o RankingTable) quedan con posición fija o scroll bloqueado y el usuario no puede hacer scroll en la página.

**Diagnóstico necesario**: identificar si el problema viene de:
- `overflow-hidden` en un contenedor padre que rompe el scroll.
- El componente `PullToRefresh` que bloquea touch events.
- Algún `position: sticky` que interactúa mal con `overflow`.

**Aceptación**:
- [ ] Scroll normal en todas las páginas con tablas (GroupStandings, RankingTable) desde iOS Safari y Chrome Android.
- [ ] Pull-to-refresh sigue funcionando.

### M4 — Renombrar "Partidos" → "Mi Quiniela" en BottomNav

**Problema**: "Partidos" y "Predicciones" en el nav inferior suenan similares; el usuario no sabe cuál es para capturar.

**Solución**: Cambiar label e icono en `BottomNav`:
- `/quiniela`: label "Mi quiniela", icono "📝" (o "✏️")
- `/predicciones`: label "Ver todos", icono "👁"

Solo afecta `components/NavLinks.tsx`.

**Aceptación**:
- [ ] El nav inferior en móvil muestra "Mi quiniela" y "Ver todos".
- [ ] La ruta activa sigue resaltándose correctamente.
- [ ] No regresión en el TopNav de escritorio (usa links separados, no bottomLinks).

---

## Orden de implementación

```
M4 (5 min, 1 archivo, bajo riesgo)
  ↓
M3 (diagnóstico + fix, múltiples archivos posibles)
  ↓
M1 (nuevo tab "Hoy" en /quiniela)
  ↓
M2 (tab/widget equivalente en /predicciones)
```

## Boundaries

- **Siempre**: correr `npm run build` antes de considerar completa una mejora.
- **Preguntar primero**: cambiar rutas URL, renombrar páginas, agregar dependencias nuevas.
- **Nunca**: modificar lógica de scoring, standings, o Firebase writes.

## Criterios de éxito

- Desde móvil, llegar a los partidos de hoy para predecir: ≤ 2 taps desde cualquier pantalla.
- Desde móvil, ver las predicciones de hoy: ≤ 2 taps.
- Scroll funcionando sin bloqueos en todas las páginas con tablas.
- `npm run build` sin errores.
- `npm test` 29/29 tests passing.

## Preguntas abiertas

1. ¿Quieres que "Hoy" sea también el tab default al abrir la app en días con partidos, o solo un shortcut manual?
2. Para M3: ¿puedes describir en qué pantalla y con qué acción se reproduce el bug de la tabla pegada?
