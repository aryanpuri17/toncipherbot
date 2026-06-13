# BRIEF AMÉLIORATIONS JEUX V1 — Pour claude.ai

> Tu es l'expert design/animation de TonCipher (mini-app Telegram casino TON).
> Lis ce fichier entièrement, utilise tes connecteurs, puis produis le code exact.
> Tout est dans **un seul fichier** : `src/components/miniapp/MiniAppGames.tsx`

---

## 🔌 CONNECTEURS — utilise-les avant de répondre

| Connecteur | Recherche exacte |
|---|---|
| **Exa** | `"wheel of fortune spin tick sound javascript css animation segments"` |
| **Exa** | `"mines game card flip 3D CSS reveal animation casino"` |
| **Exa** | `"roulette ball bouncing pocket CSS animation realistic"` |
| **Exa** | `"crash game explosion screen shake canvas CSS particles"` |
| **Context7** | MDN CSS : `transform-style: preserve-3d`, `perspective`, `backface-visibility` pour le flip des cases Mines |

**Ne réponds pas sans avoir utilisé Exa au moins 3 fois.**

---

## Contexte

- Stack : React 19 + TypeScript + Vite + Tailwind v4
- Zéro nouvelle dépendance npm
- TypeScript strict — zéro `any`
- Ne jamais modifier : `rollWheel`, `rollCrashPoint`, `rollRoulette`, `minesMult`, `placeGameBet`, `recordGameResult`
- Les keyframes CSS peuvent être ajoutées dans les blocs `<style>` existants dans chaque composant

---

## ── JEU 1 : ROUE DE LA FORTUNE (WheelGame) ──

### Code actuel clé

```typescript
// Spin déclenché par :
const newRot = rotRef.current + 5 * 360 + delta;
rotRef.current = newRot;
setRot(newRot);  // → <WheelSVG rotation={rotation} />

// WheelSVG applique :
// style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 4.3s cubic-bezier(0.17,0.67,0.12,0.99)' }}

// Résultat après 4300ms :
spinTimerRef.current = setTimeout(() => {
  setSpin(false);
  placeGameBet(used, win);
  // ...
}, 4300);

// Il y a 12 segments (SEG_DEG = 30°)
const SEG_DEG = 360 / 12; // = 30°
```

### Problèmes à résoudre

1. **Aucun son ni effet pendant la rotation** — `snd.tick()` n'est appelé qu'au départ. Dans une vraie roue, on entend un "clic" à chaque segment dépassé.
2. **Pas de décélération visible** — la roue s'arrête sans feedback visuel de ralentissement.
3. **Résultat trop discret** — l'affichage du résultat est un simple div qui apparaît.

### Ce que tu dois produire

**A. Tick par segment**
Pendant les 4300ms de rotation, déclencher `snd.tick()` à chaque fois que la roue passe un segment (toutes les X ms, de plus en plus espacés au fur et à mesure du ralentissement).

```typescript
// Timing à calculer : la roue fait 5 tours + delta
// tours total ≈ 5.8 tours en 4.3s → décelération progressive
// Ticks : commencer toutes les ~60ms, finir toutes les ~300ms
// Stocker les timers dans un ref, les nettoyer au unmount
```

Format de réponse :
```
### BLOC W1 — Tick sons pendant la rotation (dans WheelGame, fonction spin())
[code]

### BLOC W2 — Effet flash/pulse sur le pointeur (flèche jaune en haut) à chaque segment
[code — modifier le style du pointeur pendant les ticks]
```

---

## ── JEU 2 : MINES (MinesGame) ──

### Code actuel clé

```typescript
// Chaque case du grid :
<button key={idx} onClick={() => revealTile(idx)}
  style={{
    aspectRatio: '1',
    background: showBoom ? 'radial-gradient(...)' : showGem ? 'radial-gradient(...)' : '#1e2a52',
    animation: showBoom ? 'mineReveal 0.25s ease-out, boomFlash 0.6s ease-out forwards' :
               showGem  ? 'mineReveal 0.25s ease-out, gemShine 2.2s ease-in-out 0.3s infinite' : undefined,
  }}>
  {showBoom ? '💣' : showGem ? '💎' : showGhost ? '💣' : null}
</button>

// Keyframes existantes dans <style> :
// @keyframes mineReveal { 0%{transform:scale(0.6);opacity:0} 60%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
// @keyframes gemShine { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.55)} }
// @keyframes mineGridShake { ... }
// @keyframes boomFlash { ... }

// Dimensions : GRID_SIZE = 25, GRID_COLS = 5 (grille 5×5)
```

### Problèmes à résoudre

1. **Pas de flip 3D** — quand on clique une case, elle *apparaît* directement avec son contenu. Il devrait y avoir un retournement de carte (face cachée → face visible) comme dans les vrais jeux de mines (BC.Game, Stake).
2. **L'explosion de mine est trop timide** — juste un fond rouge qui clignote. Devrait avoir un effet "boom" plus spectaculaire.
3. **Les cases non révélées ne donnent pas envie de cliquer** — elles sont statiques, sans aucun effet d'invitation.

### Ce que tu dois produire

**A. Flip 3D CSS sur révélation**
```css
/* Face avant (cachée) : fond bleu */
/* Face arrière (révélée) : gem ou bombe */
/* Flip : rotateY(0) → rotateY(180deg) en 0.35s */
/* Utiliser transform-style: preserve-3d + backface-visibility: hidden */
```

**B. Shimmer sur cases non révélées**
Légère animation de reflet diagonal qui passe sur les cases non révélées (comme un effet de "brillance" qui donne envie de cliquer).

**C. Explosion mine améliorée**
Quand `showBoom` est true : ajouter une animation qui pulse le fond rouge + envoie des "éclats" CSS (pseudo-éléments ou box-shadow multiple animé).

Format de réponse :
```
### BLOC M1 — Keyframes à ajouter dans le <style> de MinesGame
[code CSS]

### BLOC M2 — Rendu de chaque case (remplace le <button> actuel)
[code TSX complet du bouton avec flip 3D]
```

---

## ── JEU 3 : ROULETTE (RouletteGame) ──

### Code actuel clé

```typescript
// La bille est positionnée via :
const [ballAngle, setBallAngle] = useState(110);
const ballRef = useRef(110);

// Dans spin() :
const newBall = ballRef.current - 14 * 360 - curBall + (Math.random() * DEG_PER_SLOT * 0.5 - DEG_PER_SLOT * 0.25);
ballRef.current = newBall;
setBallAngle(newBall); // → style={{ transform: `rotate(${ballAngle}deg)` }}

// La bille est un cercle SVG en position absolue sur la roue
// Elle tourne avec une transition CSS lisse (4.5s)
// Aucun son pendant la rotation

// NUM_SLOTS = 37, DEG_PER_SLOT = 360/37 ≈ 9.73°
```

### Problèmes à résoudre

1. **La bille tourne trop doucement** — transition CSS linéaire, elle s'arrête sans rebond. Dans une vraie roulette, la bille ralentit, "hésite", saute entre 2-3 cases avant de se stabiliser.
2. **Aucun son de cliquetis** — la bille devrait faire "clic-clic-clic" à chaque numéro dépassé, de plus en plus lentement.
3. **Pas de feedback visuel sur le numéro en cours** — impossible de savoir où va la bille pendant qu'elle ralentit.

### Ce que tu dois produire

**A. Cliquetis de la bille (sons)**
Pendant les ~4500ms de rotation, déclencher `snd.tick()` à chaque fois que la bille passe un numéro. La fréquence diminue progressivement (commence rapide, finit lente avec 3-4 "rebonds" avant l'arrêt).

```typescript
// La bille fait 14 tours + correction ≈ 14.x tours en ~4.5s
// Ticks : commencer toutes les ~30ms, finir toutes les ~350ms (simulation de décélération)
// Les 3 derniers ticks plus espacés = effet "rebond dans la case"
```

**B. Rebonds finaux**
Simuler que la bille "saute" entre 2 cases avant de se stabiliser :
- À ~4200ms : bille se déplace de +1 slot
- À ~4350ms : bille revient -1 slot  
- À ~4500ms : position finale

```typescript
// Utiliser 3 setTimeout supplémentaires après la transition principale
// Chaque "rebond" : ballRef.current ± DEG_PER_SLOT, setBallAngle(...)
// transition plus courte pour ces micro-mouvements (0.1s)
```

Format de réponse :
```
### BLOC R1 — Sons cliquetis pendant la rotation (dans RouletteGame, fonction spin())
[code]

### BLOC R2 — Rebonds finaux de la bille
[code — 3 setTimeout après la transition principale]
```

---

## ── JEU 4 : CRASH (CrashGame) ──

### Code actuel clé

```typescript
// Quand le crash arrive :
// phaseRef.current = 'crashed'
// setPhase('crashed')
// setLastCrash(crashAtRef.current)
// snd.boom()
// haptic.impact('heavy')

// Le rendu du crash :
// Un texte "CRASHED @×X.XX" en rouge qui apparaît
// La courbe canvas s'arrête

// Pendant le vol (flying) :
// La fusée 🚀 est affichée avec le multiplicateur en temps réel
// style={{ fontSize: 42, filter: `drop-shadow(...)` }}

// Il y a un canvas pour la courbe :
// <canvas ref={chartRef} ... />
```

### Problèmes à résoudre

1. **Le crash est trop discret** — juste un texte rouge. Devrait avoir un tremblement d'écran + flash rouge + explosion visuelle.
2. **La fusée ne donne pas l'impression de monter** — elle est statique. Elle devrait légèrement osciller/tremble quand elle monte.
3. **L'encaissement est peu satisfaisant** — juste un toast texte. Devrait avoir un effet de "rain d'argent" ou flash vert.

### Ce que tu dois produire

**A. Screen shake + flash rouge au crash**
```css
/* @keyframes crashShake : tremblement violent 0.4s */
/* @keyframes crashFlash : fond rouge 0 → 0.3 → 0 opacity en 0.3s */
```
Appliqué sur le conteneur principal du jeu quand `phase === 'crashed'`.

**B. Oscillation de la fusée pendant le vol**
```css
/* @keyframes rocketWobble : légère rotation -2° → +2° en boucle, 0.3s */
/* Amplitude augmente quand le mult dépasse ×5 */
```

**C. Flash vert sur cashout**
Quand `doCashout()` est appelé : afficher brièvement un overlay vert semi-transparent sur le canvas (0.2s), puis disparaît.

Format de réponse :
```
### BLOC C1 — Keyframes CSS à ajouter dans le <style> de CrashGame
[code CSS]

### BLOC C2 — Screen shake + flash au crash (modifier le conteneur principal)
[code TSX — modifier le style/className du div principal selon phase]

### BLOC C3 — Oscillation fusée pendant le vol
[code TSX — modifier le style de l'emoji 🚀]

### BLOC C4 — Flash vert sur cashout (modifier doCashout())
[code — ajouter un state + overlay]
```

---

## Récapitulatif des blocs attendus

| Jeu | Blocs |
|-----|-------|
| Roue | W1 (tick sons), W2 (pulse pointeur) |
| Mines | M1 (keyframes), M2 (case flip 3D complet) |
| Roulette | R1 (cliquetis bille), R2 (rebonds finaux) |
| Crash | C1 (keyframes), C2 (screen shake), C3 (fusée wobble), C4 (flash cashout) |

**Format exigé** : code TypeScript/TSX prêt à copier-coller, zéro `any`, zéro nouvelle dépendance.

---

*Brief généré par Claude Code — TonCipher Games V1*
