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
| **Exa** | `"casino gem crystal reveal animation glow shimmer CSS javascript"` |
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

## Objectifs de la session

Le propriétaire veut un jeu qui soit :
1. **Plus fluide** — les animations doivent être douces, naturelles, pas mécaniques
2. **Plus lumineux** — les gems doivent vraiment briller, les explosions doivent flasher fort
3. **Sons satisfaisants** — le son cristal quand on trouve un gem, le son bombe quand on explose

---

## Code actuel du jeu Mines

### Constantes
```typescript
const GRID_SIZE = 25;  // grille 5×5
const GRID_COLS = 5;
```

### Sons actuels (déjà améliorés — vérifie et améliore si possible)

```typescript
// Son cristal — accord Do6/Sol6/Do7 + shimmer aigu
reveal() {
  const ctx = _ac(); if (!ctx) return;
  const t = ctx.currentTime;
  ([1047, 1568, 2093] as number[]).forEach((f, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine'; o.frequency.value = f;
    const vol = [0.16, 0.09, 0.05][i];
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    o.start(t); o.stop(t + 0.45);
  });
  // Glassy shimmer — transitoire aigu
  const sh = ctx.createOscillator(), sg = ctx.createGain();
  sh.connect(sg); sg.connect(ctx.destination); sh.type = 'sine';
  sh.frequency.setValueAtTime(4200, t); sh.frequency.exponentialRampToValueAtTime(2100, t + 0.07);
  sg.gain.setValueAtTime(0.07, t); sg.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
  sh.start(t); sh.stop(t + 0.1);
},

// Son explosion — grave + crack + rumble filtré
boom() {
  const ctx = _ac(); if (!ctx) return;
  const t = ctx.currentTime;
  // Sub-bass thump
  const kick = ctx.createOscillator(), kg = ctx.createGain();
  kick.connect(kg); kg.connect(ctx.destination); kick.type = 'sine';
  kick.frequency.setValueAtTime(200, t); kick.frequency.exponentialRampToValueAtTime(28, t + 0.2);
  kg.gain.setValueAtTime(0.75, t); kg.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
  kick.start(t); kick.stop(t + 0.3);
  // High crack
  const crack = ctx.createOscillator(), cg = ctx.createGain();
  crack.connect(cg); cg.connect(ctx.destination); crack.type = 'sawtooth';
  crack.frequency.setValueAtTime(900, t); crack.frequency.exponentialRampToValueAtTime(150, t + 0.06);
  cg.gain.setValueAtTime(0.35, t); cg.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
  crack.start(t); crack.stop(t + 0.08);
  // Noise body
  const sr = ctx.sampleRate, len = Math.floor(sr * 0.6);
  const buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sr * 0.14));
  const ns = ctx.createBufferSource(), filt = ctx.createBiquadFilter(), ng = ctx.createGain();
  filt.type = 'lowpass'; filt.frequency.value = 900;
  ns.buffer = buf; ns.connect(filt); filt.connect(ng); ng.connect(ctx.destination);
  ng.gain.value = 0.6; ns.start(t); ns.stop(t + 0.65);
},
```

> **Question pour toi :** Est-ce que ces sons peuvent être encore améliorés ? Est-ce que l'accord Do/Sol/Do est vraiment le meilleur pour un gem de casino ? Y a-t-il une meilleure approche pour le son d'explosion ?

### Keyframes CSS actuelles dans `<style>`

```css
@keyframes mineReveal {
  0%   { transform: scale(0.5) rotate(-8deg); opacity: 0 }
  55%  { transform: scale(1.18) rotate(3deg) }
  80%  { transform: scale(0.95) }
  100% { transform: scale(1) rotate(0deg); opacity: 1 }
}
@keyframes gemShine {
  0%, 100% { filter: brightness(1.1) drop-shadow(0 0 4px rgba(74,222,128,0.4)) }
  50%       { filter: brightness(1.7) drop-shadow(0 0 10px rgba(74,222,128,0.85)) }
}
@keyframes mineGridShake {
  0%,100% { transform: translate(0,0) }
  15%     { transform: translate(-6px, 4px) }
  30%     { transform: translate( 6px,-4px) }
  45%     { transform: translate(-5px,-3px) }
  60%     { transform: translate( 5px, 3px) }
  80%     { transform: translate(-2px, 1px) }
}
@keyframes boomFlash {
  0%  { box-shadow: 0 0 0 rgba(239,68,68,0); transform: scale(1) }
  15% { box-shadow: 0 0 32px 4px rgba(239,68,68,1), 0 0 8px rgba(255,100,0,0.9) inset; transform: scale(1.12) }
  40% { box-shadow: 0 0 24px rgba(239,68,68,0.8); transform: scale(1.04) }
  100%{ box-shadow: 0 0 12px rgba(239,68,68,0.35); transform: scale(1) }
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
        background: showBoom ? 'radial-gradient(circle at 50% 35%, rgba(239,68,68,0.6), rgba(127,29,29,0.5))' :
                     showGem  ? 'radial-gradient(circle at 45% 35%, rgba(74,222,128,0.55), rgba(20,83,45,0.45))' :
                     showGhost ? 'rgba(239,68,68,0.08)' :
                     phase === 'playing' ? 'linear-gradient(160deg,#1e2a52,#161d3a)' : '#111830',
        border: showBoom ? '2px solid rgba(239,68,68,0.85)' :
                showGem  ? '2px solid rgba(74,222,128,0.75)' :
                showGhost ? '1px solid rgba(239,68,68,0.2)' :
                phase === 'playing' ? '1px solid #2a3a6e' : '1px solid #1e2847',
        borderRadius: 12,
        fontSize: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.18s, border-color 0.18s, transform 0.12s',
        animation: showBoom ? 'mineReveal 0.25s ease-out, boomFlash 0.6s ease-out forwards' :
                   showGem  ? 'mineReveal 0.25s ease-out, gemShine 2.2s ease-in-out 0.3s infinite' : undefined,
        boxShadow: showGem  ? '0 0 18px rgba(74,222,128,0.55), 0 0 6px rgba(74,222,128,0.3) inset' :
                   showBoom ? '0 0 22px rgba(239,68,68,0.7)' : undefined,
        filter: showGem ? 'brightness(1.15)' : undefined,
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
```

### Logique `revealTile` (résumé — NE PAS MODIFIER)
```typescript
// Mine touchée → snd.boom() + haptic.impact('heavy') + setPhase('lost')
// Gem révélé  → snd.reveal() + haptic.impact('light') + setSafeCount(ns)
```

---

## Ce que tu dois améliorer et produire

### A. Sons — vérifie et améliore si nécessaire

Évalue les sons actuels et propose une version améliorée si tu trouves mieux via tes recherches Exa. Questions clés :
- L'accord Do/Sol/Do est-il le bon pour un gem de casino ? Faut-il ajouter de la réverbération ?
- L'explosion peut-elle être plus impactante (stereo, distortion, low-frequency oscillator) ?

### B. BLOC M1 — Nouvelles keyframes CSS

Remplace/complète les keyframes actuelles. Ajoute obligatoirement :
- `tileFlipFront` : rotation 0° → 90° en 0.18s (face cachée qui disparaît)
- `tileFlipBack`  : rotation -90° → 0° en 0.18s avec délai 0.18s (face révélée qui arrive)
- `tileIdle`      : légère animation "invitante" sur les cases non révélées (shimmer diagonal ou pulse subtil)
- Conserve : `gemShine`, `mineGridShake`, `boomFlash` (améliore si tu as mieux)

### C. BLOC M2 — Rendu case avec flip 3D complet

Structure attendue :
```
wrapper div (perspective: 600px, position: relative)
  → face avant (backface-visibility: hidden, fond bleu, animation tileIdle si jouable)
  → face arrière (backface-visibility: hidden, rotateY(180deg) par défaut, fond gem/bombe après flip)
  → au clic : classe CSS "flipped" qui déclenche rotateY(180deg) sur la face avant + rotateY(0) sur la face arrière
```

**Contraintes TypeScript :**
- Zéro `any`
- Le flip fonctionne via un `Set<number>` de cases "en cours de flip" (state React ou ref)
- `onClick` → revealTile(idx)
- `pointerEvents: 'none'` si `phase !== 'playing' || isRev`
- `key={idx}` sur le wrapper

---

## Format de réponse exigé

```
### SONS — Évaluation + version améliorée (si nécessaire)
[code snd.reveal() et snd.boom() — ou "sons actuels corrects, pas de changement"]

### BLOC M1 — Keyframes CSS complètes
[code CSS — prêt à coller dans le <style>]

### BLOC M2 — Rendu case TSX avec flip 3D
[code TSX complet — prêt à remplacer le Array.from(...) actuel]
```

**TypeScript strict, zéro `any`, zéro nouvelle dépendance.**

---

*Brief généré par Claude Code — TonCipher Mines V1*
