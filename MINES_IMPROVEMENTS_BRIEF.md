# BRIEF MINES V1 — Pour claude.ai

> Tu es l'expert design/animation de TonCipher (mini-app Telegram casino TON).
> Lis ce fichier entièrement, utilise tes connecteurs, puis produis le code exact.
> Tout est dans **un seul fichier** : `src/components/miniapp/MiniAppGames.tsx`

---

## 🔌 CONNECTEURS — utilise-les avant de répondre

| Connecteur | Recherche exacte |
|---|---|
| **Exa** | `"mines game card flip 3D CSS reveal animation casino BC.Game Stake"` |
| **Exa** | `"CSS transform-style preserve-3d backface-visibility card flip animation tutorial"` |
| **Exa** | `"mine explosion CSS animation canvas particles box-shadow game effect"` |
| **Context7** | MDN CSS : `transform-style: preserve-3d`, `perspective`, `backface-visibility` — pour le flip 3D des cases |

**Ne réponds pas sans avoir utilisé Exa au moins 2 fois et Context7 au moins 1 fois.**

---

## Contexte projet

- Stack : React 19 + TypeScript + Vite + Tailwind v4
- Zéro nouvelle dépendance npm
- TypeScript strict — zéro `any`
- Ne jamais modifier : `minesMult`, `placeGameBet`, `recordGameResult`, `startGame`, `revealTile`, `cashout`
- Les keyframes CSS peuvent être ajoutées dans le `<style>` existant dans MinesGame

---

## Code actuel complet du jeu Mines

### Constantes
```typescript
const GRID_SIZE = 25;  // grille 5×5
const GRID_COLS = 5;
```

### Keyframes actuelles dans `<style>`
```css
@keyframes mineReveal {
  0%   { transform: scale(0.6); opacity: 0 }
  60%  { transform: scale(1.12) }
  100% { transform: scale(1);   opacity: 1 }
}
@keyframes gemShine {
  0%, 100% { filter: brightness(1) }
  50%       { filter: brightness(1.55) }
}
@keyframes mineGridShake {
  0%,100% { transform: translate(0,0) }
  15%     { transform: translate(-5px, 3px) }
  30%     { transform: translate( 5px,-3px) }
  45%     { transform: translate(-4px,-2px) }
  60%     { transform: translate( 4px, 2px) }
  80%     { transform: translate(-2px, 1px) }
}
@keyframes boomFlash {
  0%   { box-shadow: 0 0  0 rgba(239,68,68,0)    }
  30%  { box-shadow: 0 0 28px rgba(239,68,68,0.85) }
  100% { box-shadow: 0 0 10px rgba(239,68,68,0.4)  }
}
```

### Rendu de chaque case (bouton actuel)
```tsx
{Array.from({ length: GRID_SIZE }, (_, idx) => {
  const isMine = minePos.has(idx);
  const isRev  = revealed.has(idx);
  const showBoom  = isRev && isMine;
  const showGem   = isRev && !isMine;
  const showGhost = (phase === 'lost' || phase === 'won') && isMine && !isRev;
  return (
    <button key={idx} onClick={() => revealTile(idx)}
      disabled={phase !== 'playing' || isRev}
      style={{
        aspectRatio: '1',
        background: showBoom ? 'radial-gradient(circle at 50% 40%, rgba(239,68,68,0.45), rgba(127,29,29,0.35))' :
                     showGem  ? 'radial-gradient(circle at 50% 40%, rgba(34,197,94,0.35), rgba(20,83,45,0.3))' :
                     showGhost ? 'rgba(239,68,68,0.08)' :
                     phase === 'playing' ? 'linear-gradient(160deg,#1e2a52,#161d3a)' : '#111830',
        border: showBoom ? '2px solid rgba(239,68,68,0.6)' :
                showGem  ? '2px solid rgba(34,197,94,0.45)' :
                showGhost ? '1px solid rgba(239,68,68,0.2)' :
                phase === 'playing' ? '1px solid #2a3a6e' : '1px solid #1e2847',
        borderRadius: 12,
        fontSize: 18,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.18s, border-color 0.18s, transform 0.12s',
        animation: showBoom ? 'mineReveal 0.25s ease-out, boomFlash 0.6s ease-out forwards' :
                   showGem  ? 'mineReveal 0.25s ease-out, gemShine 2.2s ease-in-out 0.3s infinite' : undefined,
        boxShadow: showGem ? '0 0 12px rgba(34,197,94,0.25)' : undefined,
        cursor: phase === 'playing' && !isRev ? 'pointer' : 'default',
        opacity: showGhost ? 0.5 : 1,
      }}
      onMouseEnter={e => { if (phase === 'playing' && !isRev) (e.currentTarget as HTMLButtonElement).style.background = '#243059'; }}
      onMouseLeave={e => { if (phase === 'playing' && !isRev) (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(160deg,#1e2a52,#161d3a)'; }}
    >
      {showBoom ? '💣' : showGem ? '💎' : showGhost ? '💣' : null}
    </button>
  );
})}
```

### Conteneur grille
```tsx
<div className="grid gap-2"
  style={{
    gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
    animation: phase === 'lost' ? 'mineGridShake 0.45s ease' : undefined,
  }}>
  {/* cases ici */}
</div>
```

### Logique `revealTile` (résumé — NE PAS MODIFIER)
```typescript
// Quand une mine est touchée :
snd.boom();
haptic.impact('heavy');
setPhase('lost');
// → showBoom = true pour la case touchée

// Quand un gem est révélé :
snd.reveal();
haptic.impact('light');
setSafeCount(ns);
// → showGem = true pour la case révélée
```

---

## Problèmes à résoudre

### Problème 1 — Pas de flip 3D
Quand on clique une case, le contenu (💎 ou 💣) **apparaît directement** via mineReveal (scale 0.6 → 1).  
Dans les vrais jeux de mines (BC.Game, Stake), la carte **se retourne** en 3D : face bleue → face révélée.

### Problème 2 — Explosion de mine trop timide
Quand `showBoom` est true, juste un fond rouge + `boomFlash`. Pas d'effet "wow".

### Problème 3 — Cases non révélées statiques
Les cases en attente de clic n'ont aucune animation d'invitation. Sur Stake par exemple, elles ont un léger shimmer qui donne envie de cliquer.

---

## Ce que tu dois produire

### BLOC M1 — Keyframes CSS à ajouter dans le `<style>` de MinesGame

```css
/* Remplace les 4 keyframes existantes (mineReveal, gemShine, mineGridShake, boomFlash)
   + ajoute les nouvelles */
```

Keyframes à produire :
- `tileFlipIn` : la face cachée tourne de 0° à 90° en 0.18s (disparaît de côté)
- `tileFlipOut` : la face révélée part de -90° à 0° en 0.18s (arrive de l'autre côté)
- `gemShine` : conserve l'existant (brightness pulse)
- `mineGridShake` : conserve l'existant
- `boomPulse` : fond rouge pulse + box-shadow explosif (remplace boomFlash, plus spectaculaire)
- `tileShimmer` : reflet diagonal qui traverse les cases non révélées (fond bleu → léger reflet blanc en diagonale → fond bleu)

### BLOC M2 — Rendu complet de chaque case (remplace le `<button>` actuel)

Le flip 3D doit utiliser :
```css
perspective: 600px
transform-style: preserve-3d
backface-visibility: hidden
```

Structure attendue (pseudo-code) :
```tsx
// Wrapper div avec perspective
// → face avant (cachée) : fond bleu, animation tileShimmer si phase=playing && !isRev
// → face arrière (révélée) : gem/bombe, animation tileFlipOut au moment de la révélation
// Le flip est déclenché via une classe CSS ajoutée quand isRev devient true
// Le onClick reste sur le wrapper → appelle revealTile(idx)
```

**Contraintes TypeScript :**
- Zéro `any`
- Le flip doit fonctionner avec React (pas de manipulation DOM directe)
- Utiliser `key={idx}` sur le wrapper
- Le `disabled` (empêche clic) doit être géré : si `phase !== 'playing' || isRev` → `pointerEvents: 'none'`

**Format de réponse exigé :**
```
### BLOC M1 — Keyframes CSS
[code CSS complet — prêt à coller dans le <style>]

### BLOC M2 — Rendu case TSX
[code TSX complet — prêt à remplacer le Array.from(...) actuel]
```

**TypeScript strict, zéro `any`, zéro nouvelle dépendance.**

---

*Brief généré par Claude Code — TonCipher Mines V1*
