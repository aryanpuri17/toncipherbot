# BRIEF PLINKO PHYSIQUE V2 — Pour claude.ai

> Tu es l'expert physique/design de TonCipher (mini-app Telegram casino TON).
> Lis ce fichier entièrement, utilise tes connecteurs, puis produis le code exact à implémenter.

---

## 🔌 CONNECTEURS — utilise-les avant de répondre

| Connecteur | Recherche exacte |
|---|---|
| **Exa** | `"plinko ball physics canvas javascript realistic bounce pegs"` |
| **Exa** | `"stake.com plinko how ball physics works casino"` |
| **Context7** | MDN Canvas 2D : `ctx.save / ctx.restore / ctx.rotate / ctx.scale` pour le squish + rotation |

**Ne réponds pas sans avoir utilisé Exa au moins 2 fois.**

---

## Contexte projet

- Stack : React 19 + TypeScript + Vite + Tailwind v4
- Le Plinko est rendu sur un `<canvas>` overlay à 60fps via `requestAnimationFrame`
- La destination finale (slot) est **prédéterminée** par `rollPlinko()` — la physique ne peut PAS changer le slot, elle sert uniquement à l'animation visuelle
- Zéro nouvelle dépendance npm autorisée
- TypeScript strict — zéro `any`

---

## Code actuel complet du moteur physique

### Types et constantes (niveau module, hors composant)

```typescript
type PhysBall = {
  id:   number;
  pts:  { x: number; y: number }[];  // waypoints : départ → top de chaque peg → slot
  seg:  number;                       // index du segment en cours
  segT: number;                       // temps écoulé dans ce segment (secondes)
  T:    number;                       // durée totale de ce segment (secondes)
  sx:   number; sy: number;           // position de départ du segment
  vx:   number; vy0: number;          // vitesse de lancement (vx horizontal, vy0 vertical initial)
  x:    number; y: number;            // position live de la bille
  bet:  number; win: number; mult: number; slot: number;
  trail: { x: number; y: number }[];
};
type Flash = { x: number; y: number; t: number };

const PLINKO_GRAV       = 5200;   // px/s² — gravité
const PLINKO_SEG_T      = 0.135;  // durée fixe par arc peg→peg (PROBLÈME : trop uniforme)
const PLINKO_SEG_T_LAST = 0.22;   // durée du dernier arc → slot
const PLINKO_BALL_R     = 3 * 1.55;  // rayon ≈ 4.65px
const PLINKO_DPR        = Math.min(window.devicePixelRatio || 1, 2);

// Calcule vx / vy0 pour que la bille atteigne le waypoint suivant en T secondes sous PLINKO_GRAV
function plinkoInitSeg(b: PhysBall) {
  const a = b.pts[b.seg];
  const c = b.pts[b.seg + 1];
  const T = b.seg === b.pts.length - 2 ? PLINKO_SEG_T_LAST : PLINKO_SEG_T;
  b.T = T; b.segT = 0; b.sx = a.x; b.sy = a.y;
  b.vx  = (c.x - a.x) / T;
  b.vy0 = (c.y - a.y - 0.5 * PLINKO_GRAV * T * T) / T;
}
```

### Géométrie du plateau (dans le composant, rows = 8 | 12 | 16)

```typescript
const BOARD_W     = 300;
const PEG_SPACING = Math.min(22, BOARD_W / (rows + 2));
const PEG_R       = 3;
const ROW_H       = PEG_SPACING * 0.95;
const BOARD_H     = rows * ROW_H + 60;
const pegX = (r: number, c: number) => BOARD_W / 2 - (r * PEG_SPACING) / 2 + c * PEG_SPACING;
const pegY = (r: number) => 24 + r * ROW_H;
```

### buildPts — calcule les waypoints selon le chemin prédéterminé

```typescript
const buildPts = (path: boolean[], slot: number) => {
  const pts: { x: number; y: number }[] = [{ x: BOARD_W / 2, y: 8 }];
  let c = 0;
  for (let r = 0; r < rows; r++) {
    pts.push({ x: pegX(r, c), y: pegY(r) - (PEG_R + PLINKO_BALL_R) });
    if (path[r]) c++;
  }
  pts.push({ x: pegX(rows, slot), y: BOARD_H + 6 });
  return pts;
};
```

### Boucle rAF complète (créée une seule fois)

```typescript
loopRef.current = (ts: number) => {
  const last = lastTsRef.current || ts;
  let dt = (ts - last) / 1000;
  lastTsRef.current = ts;
  if (dt > 0.05) dt = 0.05; // clamp sauts importants (changement d'onglet)

  const balls = physBalls.current;
  const finished: PhysBall[] = [];

  for (const b of balls) {
    // traînée
    b.trail.unshift({ x: b.x, y: b.y });
    if (b.trail.length > 7) b.trail.pop();

    b.segT += dt;

    if (b.segT >= b.T) {
      // Bille arrivée au waypoint suivant
      const arrived = b.seg + 1;
      b.x = b.pts[arrived].x;
      b.y = b.pts[arrived].y;
      if (arrived >= b.pts.length - 1) {
        finished.push(b); // bille dans le slot → fin
      } else {
        apiRef.current.contact(b.pts[arrived]); // son + flash
        b.seg = arrived;
        plinkoInitSeg(b); // calcule le prochain arc
      }
    } else {
      // Position parabolique pendant l'arc
      const t = b.segT;
      b.x = b.sx + b.vx * t;
      b.y = b.sy + b.vy0 * t + 0.5 * PLINKO_GRAV * t * t;
    }
  }

  if (finished.length) physBalls.current = balls.filter(b => !finished.includes(b));

  // Flashes (anneaux d'impact peg)
  for (const f of flashes.current) f.t += dt;
  if (flashes.current.length) flashes.current = flashes.current.filter(f => f.t < 0.4);

  // ── DESSIN CANVAS ──
  const canvas = canvasRef.current;
  if (canvas) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(PLINKO_DPR, PLINKO_DPR);

      // Anneaux d'impact
      for (const f of flashes.current) {
        const p = f.t / 0.4;
        ctx.beginPath();
        ctx.arc(f.x, f.y, PLINKO_BALL_R + p * 8, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(251,191,36,${0.5 * (1 - p)})`;
        ctx.lineWidth = 1.6 * (1 - p);
        ctx.stroke();
      }

      // Billes
      for (const b of physBalls.current) {
        // traînée
        for (let i = b.trail.length - 1; i >= 0; i--) {
          const tp = b.trail[i];
          const f  = 1 - i / b.trail.length;
          ctx.beginPath();
          ctx.arc(tp.x, tp.y, PLINKO_BALL_R * (0.35 + f * 0.4), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(251,191,36,${f * 0.22})`;
          ctx.fill();
        }
        // corps avec gradient + glow
        const g = ctx.createRadialGradient(
          b.x - PLINKO_BALL_R * 0.3, b.y - PLINKO_BALL_R * 0.3, PLINKO_BALL_R * 0.2,
          b.x, b.y, PLINKO_BALL_R,
        );
        g.addColorStop(0, '#fef9c3');
        g.addColorStop(0.5, '#fbbf24');
        g.addColorStop(1, '#d97706');
        ctx.shadowColor = 'rgba(251,191,36,0.85)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(b.x, b.y, PLINKO_BALL_R, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.shadowBlur = 0;
        // reflet
        ctx.beginPath();
        ctx.arc(b.x - PLINKO_BALL_R * 0.35, b.y - PLINKO_BALL_R * 0.35, PLINKO_BALL_R * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fill();
      }

      ctx.restore();
    }
  }

  for (const b of finished) apiRef.current.finish(b);

  if (physBalls.current.length > 0 || flashes.current.length > 0) {
    rafRef.current = requestAnimationFrame(loopRef.current!);
  } else {
    rafRef.current = null;
    lastTsRef.current = 0;
  }
};
```

---

## Problèmes à résoudre

### Problème 1 — Vitesse uniforme (pas d'accélération)
`PLINKO_SEG_T = 0.135s` est **constant** pour tous les pegs.  
Dans la réalité, la bille **accélère** en tombant : premiers pegs = lents, derniers = rapides.  
→ Remplacer par une fonction `segDuration(segIndex, totalSegs, rows): number` qui va de ~0.22s à ~0.065s.

### Problème 2 — Arcs mécaniques et identiques
Tous les arcs ont exactement la même forme. C'est trop régulier.  
→ Ajouter une variation aléatoire de ±15% sur la hauteur de `vy0` dans `plinkoInitSeg()`.  
⚠️ Ne pas modifier `pts` (les waypoints déterminent le slot).

### Problème 3 — Pas de squish au contact du peg
Dans un vrai Plinko (Stake, etc.), la bille s'écrase légèrement quand elle frappe un peg.  
→ Sur `contact()` : squish `scaleX = 1.3 / scaleY = 0.7` pendant 60ms, puis retour à `1/1` en 60ms.  
→ Stocker l'état du squish dans `PhysBall` (nouveaux champs) + l'appliquer dans le dessin canvas avec `ctx.save/restore/scale`.

### Problème 4 — Pas de rotation de la bille
La bille ne tourne pas sur elle-même, ce qui la fait paraître "flottante".  
→ Calculer l'angle de rotation cumulatif selon `vx` à chaque frame.  
→ Dessiner le reflet avec `ctx.rotate(angle)` pour donner l'impression de rotation.

---

## Ce que tu dois produire

Le code TypeScript **complet et prêt à copier-coller**, dans ce format exact :

```
## CHANGEMENTS À APPLIQUER

### BLOC 1 — Remplacer les constantes PLINKO_SEG_T et plinkoInitSeg
// (remplace les lignes existantes)
[code complet]

### BLOC 2 — Nouveaux champs dans type PhysBall
// (ajouter ces champs au type existant)
[code complet]

### BLOC 3 — Boucle rAF : section mise à jour du segment (if b.segT >= b.T)
// (remplace le bloc existant)
[code complet]

### BLOC 4 — Boucle rAF : section dessin de la bille
// (remplace le bloc "corps avec gradient + glow")
[code complet]
```

---

## Contraintes absolues

1. Ne pas modifier `rollPlinko()`, `PLINKO_MULTS`, `placeGameBet()`, `recordGameResult()`
2. Le slot d'arrivée reste celui calculé par `rollPlinko()` — la physique ne l'influence pas
3. TypeScript strict — zéro `any`
4. Zéro nouvelle dépendance npm
5. La boucle rAF reste une seule instance (`if (!loopRef.current)`)
6. Compatible multi-boules (`physBalls.current` = tableau de `PhysBall`)

---

*Brief généré par Claude Code — TonCipher*
