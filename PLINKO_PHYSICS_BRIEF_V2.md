# BRIEF PLINKO PHYSICS V2 — Pour claude.ai

> **Ce fichier est destiné à claude.ai.**
> Le moteur physique Plinko existe déjà (`PLINKO_GRAV`, `PhysBall`, canvas rAF).
> L'objectif : le rendre **visuellement réaliste** comme sur Stake.com ou les vidéos TikTok.

---

## 🔌 CONNECTEURS À UTILISER OBLIGATOIREMENT

| Connecteur | Recherche demandée |
|---|---|
| **Exa** | `"plinko physics simulation canvas javascript collision pegs"` → trouver des CodePen / repos GitHub qui font une vraie physique de bille sur des pegs ronds. Citer les meilleures sources. |
| **Exa** | `"stake plinko ball physics how it works"` → analyser comment les casinos (Stake, Roobet, BC.Game) font rebondir leur bille |
| **Exa** | `"circle circle elastic collision 2d canvas"` → trouver la formule exacte de rebond bille↔peg pour le canvas |
| **Context7** | Cherche la doc MDN Canvas 2D : `requestAnimationFrame`, `ctx.arc`, transformations (`save/restore/rotate`) → pour valider mon approche rAF |

**Ne produis pas de réponse sans avoir utilisé Exa au moins 2 fois.**

---

## Contexte : ce qui existe déjà dans le code

```tsx
// src/components/miniapp/MiniAppGames.tsx

const PLINKO_GRAV       = 5200;  // px/s² — gravité
const PLINKO_SEG_T      = 0.135; // durée fixe de chaque arc peg→peg
const PLINKO_SEG_T_LAST = 0.22;  // durée du dernier arc → slot
const PLINKO_BALL_R     = 3 * 1.55; // rayon ≈ 4.65px

type PhysBall = {
  id:   number;
  pts:  { x: number; y: number }[];  // waypoints pré-calculés
  seg:  number;       // segment en cours
  segT: number;       // temps écoulé dans ce segment
  T:    number;       // durée de ce segment
  sx:   number; sy: number;   // position de départ segment
  vx:   number; vy0: number;  // vitesse de lancement
  x: number; y: number;       // position live
  trail: { x: number; y: number }[];
};

// Fonction qui calcule vx/vy0 pour atteindre le prochain waypoint en T secondes
function plinkoInitSeg(b: PhysBall) {
  const a = b.pts[b.seg];
  const c = b.pts[b.seg + 1];
  const T = b.seg === b.pts.length - 2 ? PLINKO_SEG_T_LAST : PLINKO_SEG_T;
  b.T = T; b.segT = 0; b.sx = a.x; b.sy = a.y;
  b.vx  = (c.x - a.x) / T;
  b.vy0 = (c.y - a.y - 0.5 * PLINKO_GRAV * T * T) / T;
}
```

**⚠️ Contrainte absolue** : La destination finale (slot) est décidée par `rollPlinko()` AVANT l'animation.  
La physique ne peut PAS changer le slot. Elle doit faire paraître le chemin réaliste sans modifier l'issue.

---

## Problèmes actuels à résoudre

### 1. La balle va à la même vitesse du début à la fin
Dans un vrai Plinko, la balle **accélère** en tombant. Les premiers pegs = lent. Les derniers = rapide.  
Actuellement `PLINKO_SEG_T = 0.135s` est constant pour tous les pegs.

**Ce que je veux :**  
```
Rang 0 → durée 0.22s (lent, on voit bien la bille partir)
Rang 4 → durée 0.14s
Rang 8 → durée 0.10s
Rang 12 → durée 0.08s
Rang 16 → durée 0.065s (rapide, momentum accumulé)
```
→ Formule mathématique pour calculer `segT(row, totalRows)` ?

### 2. Les arcs sont trop réguliers / mécaniques
Tous les arcs sont identiques. Dans la réalité, selon l'angle d'impact sur le peg, la bille rebondit plus ou moins haut, avec une légère variation.

**Ce que je veux :** ajouter un facteur de variation aléatoire `±15%` sur la hauteur de chaque arc (sans changer la destination x/y).

### 3. La bille ne réagit pas visuellement au contact du peg
Dans la réalité, quand une bille touche un peg, elle :
- **S'écrase** légèrement (squish : scaleX 1.3, scaleY 0.7 pendant ~60ms)
- **Revient** à sa forme normale (bounce back)

### 4. Pas de rotation de la bille
Une vraie bille **tourne sur elle-même** selon sa direction. Si elle va à droite, elle tourne dans le sens des aiguilles.

---

## Ce que tu dois produire

### A. Formule d'accélération
```
segDuration(seg: number, totalSegs: number): number
```
Donne une formule qui commence à ~0.22s et diminue jusqu'à ~0.065s selon le rang du segment. 
Cite la source (si tu trouves une implémentation réelle sur Exa).

### B. Variation d'arc
Comment modifier `plinkoInitSeg()` pour ajouter une variation aléatoire de hauteur d'arc `±15%` sans changer les waypoints `pts` (qui déterminent le slot) ?

### C. Squish on impact
Comment détecter le moment du contact (quand `b.segT >= b.T`) dans la boucle rAF, et appliquer un squish canvas :
```tsx
// squish : scaleX 1.3, scaleY 0.7 pendant 60ms
// ensuite revenir à 1, 1 pendant 60ms
```
Comment stocker l'état du squish par bille (sans casser le type `PhysBall`) ?

### D. Rotation de bille
Comment calculer l'angle de rotation d'une bille selon sa `vx` courante ?
```tsx
// angle = cumul de la rotation, mis à jour chaque frame
// dessinée avec ctx.rotate(angle) dans le rendu canvas
```

### E. Code complet des changements
Produis le code TypeScript/React exact pour chaque amélioration, prêt à copier-coller dans le code existant. Format :

```
## CHANGEMENTS À APPLIQUER DANS MiniAppGames.tsx

### 1. Constante PLINKO_SEG_T → remplacer par fonction
[code]

### 2. plinkoInitSeg — variation d'arc
[code]

### 3. Type PhysBall — champs squish
[code]

### 4. Boucle rAF — squish + rotation
[code]
```

---

## Contraintes

1. **Zéro nouvelle dépendance npm**
2. **TypeScript strict** — pas de `any`
3. **Ne pas modifier** `rollPlinko()`, `PLINKO_MULTS`, `placeGameBet()`
4. Le canvas overlay reste (`<canvas ref={canvasRef} ...>`)
5. Le système multi-boules (`physBalls.current`) reste intact
6. Compatibilité avec le mode Demo

---

*Brief généré par Claude Code — TonCipher Plinko V2*
