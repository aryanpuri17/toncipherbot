# BRIEF PLINKO — Pour claude.ai

> **Ce fichier est destiné à claude.ai.** Analyse le code actuel, identifie les problèmes,
> et propose un design + une logique améliorée pour le composant Plinko.

---

## Contexte projet

TonCipher est une mini-app Telegram qui permet de gagner de vrais TON (cryptomonnaie).
- Stack : React 19 + TypeScript + Vite + Tailwind v4 + Zustand v5
- Couleur principale : `#0098EA` (bleu TON officiel)
- Fond d'écran des jeux : `#060a18`
- Tout le jeu est dans `src/components/miniapp/MiniAppGames.tsx`

---

## État actuel du Plinko (ce qui existe déjà)

### Ce qui fonctionne bien
- Logique de simulation de chute physique (function `rollPlinko`) — **NE PAS TOUCHER**
- Multiplicateurs par risk × rows (`PLINKO_MULTS`) — **NE PAS TOUCHER**
- Calcul des gains, débit/crédit du solde — **NE PAS TOUCHER**
- Audio (sons de tick à chaque peg) — **NE PAS TOUCHER**
- Sélecteur de rows (8/12/16) et risk (low/medium/high)

### Problèmes à résoudre

#### 1. La boule est trop petite et peu visible
```tsx
// Boule actuelle : r = PEG_R + 1.2 = ~4.2px — quasi invisible !
<circle cx={ballSvgX} cy={ballSvgY} r={PEG_R + 1.2} fill="#fbbf24" ... />
```
La boule doit être **2× plus grande**, avec un effet de lumière/glow plus marqué.

#### 2. Une seule boule à la fois (trop lent)
```tsx
const [dropping, setDropping] = useState(false);
// Si dropping === true, on ne peut pas lancer une autre boule
if (dropping || effBet < 0.01 || bal < 0.01) return;
```
Il faut permettre **plusieurs boules simultanées** (choix du nombre : 1, 3, 5, 10).

#### 3. Pas d'auto-play
Il n'existe aucun mode "lancer automatiquement X boules ou jusqu'à épuisement du budget".

#### 4. Pas de compteur de boules en vol
Quand plusieurs boules tombent, l'utilisateur ne sait pas combien sont en cours.

---

## Fonctionnalités demandées

### A. Multi-boules
- Sélecteur du nombre de boules : **1 / 3 / 5 / 10**
- Chaque boule est lancée avec un délai de **300ms entre elles**
- Chaque boule a sa propre animation indépendante
- Le solde est débité pour chaque boule au moment du lancer
- Counter visuel : "3 boules en vol"

### B. Auto-play
- Toggle "Auto-play" (activable/désactivable à tout moment)
- Quand actif : relance automatiquement après chaque drop complet
- S'arrête automatiquement si `balanceMain < bet`
- Bouton "Stop" rouge visible pendant l'auto-play
- Vitesse : pas de délai supplémentaire entre les cycles

### C. Boule plus grande et plus interactive
- Rayon visible : `PEG_R * 2.5` (environ 7-8px)
- Glow amber plus prononcé : `filter: drop-shadow(0 0 4px #fbbf24)`
- Animation de rebond au contact des pegs (léger scale pulse)
- Traînée légère derrière la boule (trail effect — 2-3 cercles qui s'estompent)

### D. UI améliorée
- Le plateau est un peu plus large (300px au lieu de 280px)
- Les slots en bas sont légèrement plus hauts (height: 30px) pour être plus lisibles
- Affichage du multiplicateur attendu à côté du slot actif

---

## Architecture technique recommandée

### Gestion de plusieurs boules simultanées

```tsx
type ActiveBall = {
  id: number;
  path: boolean[];
  row: number;
  col: number;
  bet: number;
  win: number;
  mult: number;
  slot: number;
};

const [activeBalls, setActiveBalls] = useState<ActiveBall[]>([]);
```

Chaque boule a son propre état de position. Les mises sont débitées à l'initiation.
Les gains sont crédités à la fin de l'animation de chaque boule.

### Fonction drop multi-boules

```tsx
const dropMulti = (count: number) => {
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      if (bal < bet * (count - i)) return; // stop si plus de budget
      dropOneBall();
    }, i * 300);
  }
};
```

### Auto-play

```tsx
const [autoPlay, setAutoPlay] = useState(false);
const autoPlayRef = useRef(false);

// Après chaque fin de boule :
useEffect(() => {
  if (autoPlayRef.current && bal >= bet) {
    setTimeout(() => dropOneBall(), 200);
  }
}, [activeBalls.length]); // se déclenche quand une boule se termine
```

---

## Ce que tu dois produire

Un BRIEF de redesign structuré ainsi :

```
## BRIEF DESIGN — PlinkoGame (redesign)
**Composant cible :** src/components/miniapp/MiniAppGames.tsx (PlinkoGame component, ~lines 2018-2300)
**Objectif :** Multi-boules + auto-play + boule plus visible

**Section : Board SVG**
- Largeur : ...
- Boule : ...
- Pegs : ...
- Slots : ...

**Section : Contrôles**
- Sélecteur nombre de boules : ...
- Toggle auto-play : ...
- Bouton drop : ...

**Section : État en vol**
- Counter boules actives : ...
- Affichage gain temps réel : ...

**Logique :**
- drop() refactorisé : ...
- autoPlay loop : ...
- Multi-ball state : ...
```

---

## Contraintes importantes

1. **NE PAS modifier** `rollPlinko()`, `PLINKO_MULTS`, `PLINKO_ROWS`, `PLINKO_RISK`
2. **NE PAS modifier** la logique de `placeGameBet()` ou `recordGameResult()`
3. La boule utilise des `cx/cy` SVG avec transition CSS — garder cette approche
4. L'audio (`snd.tick()`) doit continuer à se déclencher à chaque peg
5. `haptic.impact('light')` à chaque drop, `haptic.success()` / `haptic.error()` à la fin
6. Le mode Démo doit continuer à fonctionner
7. Pas de nouvelles dépendances npm
8. TypeScript strict — pas de `any`

---

## Fichiers utiles à demander à Claude Code

- Le composant `PlinkoGame` complet (lines 2018-2310 de MiniAppGames.tsx)
- Les types `PlinkoRows`, `PlinkoRisk`, `PLINKO_MULTS`
- La fonction `rollPlinko`

---

*Généré par Claude Code — TonCipher mini-app*
