# Spec: Mejoras Página Mi Perfil

## Objetivo

Tres mejoras para la página `/perfil`:

1. **Insignias permanentes** — Una insignia ganada debe quedarse para siempre.
   Actualmente se recalculan en cliente a cada carga: si el ranking cambia, "El GOAT"
   desaparece; si el admin re-sube resultados, "Impecable" puede parpadear. La insignia
   debe guardarse en Firebase la primera vez que se obtiene y nunca borrarse.

2. **Diseño más limpio** — El grid de 6 tarjetas stat (con bordes de color diferentes),
   las secciones apiladas y los badges con opacity-40 se ven sobrecargados. Objetivo:
   cada bloque tiene un propósito claro y se ve moderno en móvil.

3. **Detalles de layout** — Nada nuevo estructuralmente; solo reorganizar para que lo más
   útil (posición en ranking, mis puntos, progreso por jornada) llegue antes que lo
   decorativo (predicción loca, rivales, insignias).

---

## Tech Stack

- Next.js 16.2.7 App Router, React 19, TypeScript
- Firebase Realtime Database: nuevo nodo `badges/{playerName}/{badgeId}: true`
- Tailwind CSS v4

## Commands

```bash
npm run build   # TypeScript check
npm test        # 29 tests
npm run dev     # servidor de desarrollo
```

## Archivos afectados

```
app/perfil/page.tsx    → única página a modificar
```

---

## Cambios a implementar

### P1 — Persistencia de insignias en Firebase

**Problema:** todas las insignias se calculan al momento de cada render. "El GOAT"
desaparece en cuanto alguien sube al primer lugar. "Impecable" puede desaparecer si los
resultados se actualizan.

**Solución:** nodo Firebase `badges/{playerName}` que guarda `{ [badgeId]: true }` la primera
vez que se cumple el criterio. La UI muestra la insignia como ganada si:
- `earned` (criterio actual) ES true, O
- `savedBadges[badge.id]` ES true (ya se guardó antes)

Al detectar que `earned === true && !savedBadges[badge.id]`, se escribe a Firebase
automáticamente (sin acción del usuario).

**Badges que aplica:**
- `sniper` (5 exactas) — puede crecer, nunca decrecer → persistencia como respaldo
- `goleador` — puede cambiar si admin corrige resultados → persistencia necesaria
- `impecable` — puede desaparecer si jornada queda incompleta → persistencia necesaria
- `goat` (posición 1) — **cambia constantemente** → persistencia crítica
- `champ` — se activa manualmente (admin), fuera de scope por ahora

**Implementación:**
```ts
// Estado nuevo
const [savedBadges, setSavedBadges] = useState<Record<string, true>>({});

// useEffect — cargar desde Firebase
useEffect(() => {
  if (!playerName || !isFirebaseConfigured()) return;
  return onValue(ref(db, `badges/${playerName}`), (snap) => {
    setSavedBadges(snap.val() ?? {});
  });
}, [playerName]);

// Al calcular earned, comparar y guardar si es nuevo
useEffect(() => {
  if (!playerName || !isFirebaseConfigured()) return;
  for (const badge of badges) {
    if (badge.earned && !savedBadges[badge.id]) {
      set(ref(db, `badges/${playerName}/${badge.id}`), true);
    }
  }
}, [badges, savedBadges, playerName]);

// En el render, mostrar como ganada si earned || savedBadges
const isEarned = badge.earned || !!savedBadges[badge.id];
```

**Regla de seguridad Firebase (NO en scope ahora):** idealmente solo el servidor puede
escribir, pero es una quiniela privada de amigos — client write es aceptable.

**Aceptación:**
- [ ] Al ganar "El GOAT", se guarda en Firebase y permanece aunque otro tome el 1er lugar
- [ ] Al ganar "Impecable", permanece aunque el admin re-suba resultados
- [ ] La primera carga después de reiniciar muestra las insignias guardadas
- [ ] No se duplican escrituras (solo escribe si `earned && !savedBadges[id]`)

---

### P2 — Rediseño visual del bloque de stats

**Problema:** 6 tarjetas con 6 bordes de colores distintos (azul, amarillo, verde, rojo,
morado, gris) en dos filas se ven ruidosas y no hay jerarquía visual.

**Solución:** reemplazar las `<StatCard>` por una sola tarjeta con stats en fila o grid
compacto, sin múltiples colores de borde. Un solo color de acento por número importante.

**Propuesta de diseño (una tarjeta blanca):**

```
┌─────────────────────────────────────────────────┐
│  42 pts          #2 de 8                        │
│  ────────────────────────────────────────────── │
│  5 ⭐ exactas    14 ✓ correctas    6 ✗ falladas  │
│  32 predichos   Favorita: 1-0                   │
└─────────────────────────────────────────────────┘
```

- Los puntos y la posición en una línea grande (jerarquía 1)
- Exactas / Correctas / Falladas en una sola fila compacta (jerarquía 2)
- Predichos + marcador favorito en texto pequeño (jerarquía 3)

**Aceptación:**
- [ ] Un solo bloque de stats (no 6 tarjetas separadas)
- [ ] Puntos y posición son los números más grandes
- [ ] No hay más de 2 colores de borde en toda la sección

---

### P3 — Rediseño visual de las insignias

**Problema:** los badges bloqueados tienen `opacity-40` y aparecen en la misma lista que los
desbloqueados. Visualmente ruidoso — son 5 filas opacas cuando aún no has ganado nada.

**Solución:**
- Insignias ganadas: primero, estilo visual destacado (fondo amarillo suave o verde)
- Insignias bloqueadas: debajo, más compactas (solo emoji + nombre + "🔒"), sin
  descripción completa hasta que se ganen

Si no hay ninguna ganada, mostrar solo la lista bloqueada compacta (sin sección vacía).

**Aceptación:**
- [ ] Insignias ganadas aparecen antes que las bloqueadas
- [ ] Las bloqueadas son visualmente más compactas que las ganadas
- [ ] Si no hay ninguna ganada, no hay sección vacía ni header huérfano

---

### P4 — Reordenar secciones por relevancia

**Orden actual:** Stats → Puntos por jornada → Predicción loca → Rivales → Insignias → Acciones

**Orden propuesto:**
1. Header (avatar + nombre + posición) — sin cambio
2. Stats (bloque compacto P2)
3. Puntos por jornada — útil para saber cómo vas en cada fase
4. Insignias — motivacionales, cerca del top
5. Rivales directos — info táctica interesante
6. Predicción más loca — decorativa, al fondo
7. Acciones (Ir a mis partidos / Cerrar sesión)

**Aceptación:**
- [ ] Las insignias aparecen antes que "Predicción más loca"
- [ ] Las acciones siguen al fondo

---

## Orden de implementación

```
P1 (lógica de persistencia — no afecta UI hasta P3)
  ↓
P4 (reordenar secciones — 5 min, bajo riesgo)
  ↓
P2 (rediseño bloque stats)
  ↓
P3 (rediseño badges)
```

## Boundaries

- **Siempre**: `npm run build` sin errores TypeScript antes de commit.
- **Siempre**: `npm test` 29/29.
- **Nunca**: modificar `calcRanking`, `calcMatchPoints`, ni ninguna función de `lib/`.
- **No agregar dependencias** nuevas.

## Criterios de éxito

- [ ] Ganar "El GOAT" y luego ser superado → insignia sigue visible
- [ ] Recargar la página → insignias guardadas siguen visibles
- [ ] La sección de stats es un solo bloque (no 6 tarjetas)
- [ ] Las insignias ganadas aparecen antes que las bloqueadas
- [ ] `npm run build` pasa
- [ ] `npm test` 29/29
