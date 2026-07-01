# Spec: Rediseño Página de Ranking

## Objetivo

La página de ranking actual tiene demasiado contenido antes de llegar a la lista de jugadores: MVP cards, leyenda de puntos, selector de jornada, y luego una tabla de 6 columnas. En móvil se siente pesada y hay que hacer scroll para ver quién va ganando.

El objetivo es una página limpia donde lo primero que ves es la tabla de posiciones, con la información mínima necesaria para entender dónde estás.

**Usuarios:** jugadores de la quiniela desde el celular.

**Antes:** MVP cards → Leyenda de puntos → Selector de vista → Tabla con 6 columnas  
**Después:** Selector de vista → Lista limpia (posición + nombre + puntos) → Detail expandible compacto

---

## Tech Stack

- Next.js 16.2.7 App Router, React 19, TypeScript
- Tailwind CSS v4
- Firebase Realtime Database

## Commands

```bash
npm run build   # valida TypeScript, falla si hay errores
npm test        # 29 tests en vitest
npm run dev     # servidor de desarrollo
```

## Archivos afectados

```
app/ranking/page.tsx       → página principal
components/RankingTable.tsx → componente de tabla
```

## Cambios a implementar

### R1 — Eliminar la leyenda de puntos

El recuadro blanco "⭐ 5 pts Marcador exacto / ✓ 3 pts Resultado correcto" ocupa espacio pero no aporta a usuarios que ya conocen las reglas. Eliminarlo completamente.

Las reglas están en `/reglas` si alguien las necesita.

**Aceptación:** El recuadro de leyenda no aparece en la página.

### R2 — Mover MVP cards al final de la página

Las tarjetas MVP son decorativas. Mostrarlas ANTES de la tabla hace que el usuario tenga que scrollear para ver el ranking. Moverlas al fondo, después del ranking.

Si hay 0 jornadas con resultado, no aparecen (igual que ahora).

**Aceptación:** Las MVP cards aparecen después de la tabla de ranking.

### R3 — Simplificar la tabla: solo posición, nombre y puntos

La tabla actual tiene 6 columnas: #, Jugador, Puntos, Aciertos, Jugados, %. En móvil, Aciertos/Jugados/% se ocultan con `hidden sm:table-cell`, pero la tabla sigue siendo un DOM pesado.

Cambiar a una lista de filas (no `<table>`) con solo:
- Posición (medal o número)
- Movimiento (▲▼) — mantener, es útil
- Avatar emoji (si existe)
- Nombre del jugador
- Puntos (número grande, prominente)

En el lado derecho: solo los puntos. Sin columnas de "Aciertos", "Jugados", "%".

**Aceptación:**
- [ ] Cada fila muestra solo posición + nombre + puntos
- [ ] El jugador actual sigue resaltado (borde verde izquierdo)
- [ ] Las medallas 🥇🥈🥉 siguen en los primeros 3

### R4 — Detail expandible compacto (un toque → stats, dos toques → historial)

Actualmente al tocar un jugador se expande una lista de todos sus partidos (hasta 64 filas en `max-h-64 overflow-y-auto`). Demasiado denso.

Nueva experiencia en dos pasos:

**Primer toque:** muestra un resumen de 4 stats en horizontal:
```
Pts   Exactos   Correctos   Jugados
 42      5          14         32
```

**Segundo toque (link "Ver partidos"):** expande el historial completo actual (sin cambios en esa parte).

Si no hay resultados, el primer toque sigue mostrando "Ningún partido jugado aún."

**Aceptación:**
- [ ] Un toque en cualquier fila muestra las 4 stats en una línea
- [ ] "Ver partidos" expande el historial partido-a-partido
- [ ] Tocar la misma fila colapsa todo

### R5 — Header simplificado

El header actual tiene: título, subtítulo con contador, "En tiempo real" badge, botón WhatsApp — todo en la misma línea, que en móvil se rompe.

Nuevo layout:
- Título + botón WhatsApp en la misma línea (los dos elementos más importantes)
- Subtítulo con contador e indicador live en una segunda línea más pequeña

**Aceptación:**
- [ ] El botón compartir sigue funcionando
- [ ] El badge "Live" sigue visible
- [ ] El contador de resultados sigue visible
- [ ] No hay overflow horizontal en 375px de ancho

---

## Orden de implementación

```
R1 (2 min — eliminar bloque)
  ↓
R5 (10 min — reordenar header)
  ↓
R3 (20 min — simplificar filas en RankingTable)
  ↓
R4 (20 min — detail en 2 pasos)
  ↓
R2 (5 min — mover MVP cards)
```

## Boundaries

- **Siempre**: `npm run build` debe pasar sin errores TypeScript.
- **Siempre**: `npm test` debe seguir en 29/29.
- **Preguntar primero**: si la idea implica agregar una dependencia nueva.
- **Nunca**: modificar la lógica de `calcRanking`, `calcMatchPoints`, o cualquier función en `lib/`.

## Criterios de éxito

- [ ] La tabla de ranking es lo primero que se ve al abrir la página (sin scroll en móvil 375px)
- [ ] Cada fila muestra SOLO posición, nombre y puntos
- [ ] El detail expandible tiene un paso de resumen antes del historial
- [ ] `npm run build` pasa sin errores
- [ ] `npm test` 29/29

## Supuestos

- Se mantiene el selector de vista (Total / J1 / J2 / J3 / Elim) — es útil para ver ranking por jornada
- Se mantiene el pull-to-refresh
- No se agregan datos nuevos — solo se reorganiza lo que ya existe
