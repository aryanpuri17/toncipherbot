# BRIEF CRASH V1 — Pour claude.ai

> Tu es l'expert design/animation de TonCipher (mini-app Telegram casino TON).
> Lis ce fichier entièrement, utilise tes connecteurs, puis produis le code exact.
> Tout est dans **un seul fichier** : `src/components/miniapp/MiniAppGames.tsx`

---

## 🔌 CONNECTEURS — utilise-les avant de répondre

| Connecteur | Recherche exacte |
|---|---|
| **Exa** | `"crash game explosion screen shake CSS animation canvas particles casino"` |
| **Exa** | `"rocket wobble CSS animation thruster flame SVG javascript casino game"` |
| **Exa** | `"cashout win effect green flash CSS animation satisfying casino"` |
| **Context7** | MDN : `animation-timing-function`, `cubic-bezier`, `steps()` — pour les effets d'explosion et de tremblement |

**Ne réponds pas sans avoir utilisé Exa au moins 2 fois et Context7 au moins 1 fois.**

---

## Contexte projet

- Stack : React 19 + TypeScript + Vite + Tailwind v4
- Zéro nouvelle dépendance npm
- TypeScript strict — zéro `any`
- **Ne jamais modifier** : `rollCrashPoint`, `placeGameBet`, `recordGameResult`, `doCashout`, `placeBet`, `queueBet`
- Les keyframes CSS sont dans le `<style>` de CrashGame

---

## Objectifs de la session

Le propriétaire veut :
1. **Plus fluide** — animations douces, pas mécaniques
2. **Plus lumineux** — les effets doivent vraiment se voir (explosion, encaissement)
3. **Sons satisfaisants** — le son de crash et le son d'encaissement doivent être meilleurs

---

## Code actuel complet du jeu Crash

### Types et constantes
```typescript
type CrashPhase = 'betting' | 'flying' | 'crashed';
const BET_MS   = 9000;   // durée phase de mise (ms)
const PAUSE_MS = 3000;   // pause après crash (ms)
const TICK_MS  = 50;     // fréquence de mise à jour
const GROWTH   = 0.08;   // mult = exp(GROWTH * t)
```

### État pertinent
```typescript
const [phase, setPhase]         = useState<CrashPhase>('betting');
const [mult, setMult]           = useState(1.0);
const [lastCrash, setLastCrash] = useState<number | null>(null);
const [myBet, setMyBet]         = useState<number | null>(null);
const [cashedOut, setCashedOut] = useState<number | null>(null);
const [cashFlash, setCashFlash] = useState(false);
const [bigWin, setBigWin]       = useState(false);
const [toast, setToast]         = useState<{ id: number; text: string; win: boolean } | null>(null);

const multRef    = useRef(1.0);
const phaseRef   = useRef<CrashPhase>('betting');
const myCashRef  = useRef<{ t: number; m: number } | null>(null);
```

### Sons actuels (à évaluer)
```typescript
snd.crash() {
  // Oscillateur sawtooth 320→35Hz + bruit blanc — son de crash existant
}
snd.cashout() {
  // Arpège [523,659,784,1047] sine — son d'encaissement existant
}
```

### Keyframes CSS actuelles dans `<style>`
```css
@keyframes crashShake {
  0%,100%{transform:translate(0,0)}
  15%    {transform:translate(-4px,3px)}
  30%    {transform:translate(4px,-3px)}
  45%    {transform:translate(-3px,-2px)}
  60%    {transform:translate(3px,2px)}
  80%    {transform:translate(-2px,1px)}
}
@keyframes crashFloatUp { 0%{opacity:0;transform:translate(-50%,10px)} 15%{opacity:1} 75%{opacity:1} 100%{opacity:0;transform:translate(-50%,-34px)} }
@keyframes crashPulse   { 0%,100%{box-shadow:0 4px 18px rgba(34,197,94,0.35)} 50%{box-shadow:0 6px 36px rgba(34,197,94,0.72)} }
@keyframes crashBlink   { 0%,100%{opacity:1} 50%{opacity:0.25} }
@keyframes starDrift    { from{transform:translateX(0)} to{transform:translateX(-320px)} }
@keyframes chipIn       { from{opacity:0;transform:scale(0.5)} to{opacity:1;transform:scale(1)} }
@keyframes multGlow     { 0%,100%{text-shadow:0 0 20px rgba(34,197,94,0.4)} 50%{text-shadow:0 0 40px rgba(34,197,94,0.9)} }
@keyframes rocketThrust { 0%,100%{opacity:0.82} 50%{opacity:0.45} }
@keyframes rocketWobble { 0%{transform:rotate(-3deg) scale(1)} 100%{transform:rotate(3deg) scale(1.04)} }
@keyframes cashoutFlash { 0%{opacity:1} 100%{opacity:0} }
```

### Conteneur graphique — crash shake actuel
```tsx
<div className="mx-4 mt-1 relative" style={{
  borderRadius: 16,
  border: isCrashed ? '1px solid rgba(239,68,68,0.4)' : ...,
  background: 'radial-gradient(120% 120% at 20% 100%, #0c1230 0%, #060a18 60%)',
  overflow: 'hidden',
  // PROBLÈME : le shake n'est déclenché que quand le joueur a misé et perdu
  animation: (isCrashed && myBet !== null && cashedOut === null) ? 'crashShake 0.45s ease' : undefined,
  transition: 'border-color 0.2s',
}}>
```

### Fusée SVG actuelle (pendant phase flying)
```tsx
{phase === 'flying' && (
  <g transform={`translate(${tipX},${tipY}) rotate(${planeAngle})`}>
    {/* Inner g avec wobble — amplitude augmente avec le mult */}
    <g style={{
      animation:
        mult > 10 ? 'rocketWobble 0.18s ease-in-out infinite alternate' :
        mult > 3  ? 'rocketWobble 0.30s ease-in-out infinite alternate' :
        mult > 1.5? 'rocketWobble 0.50s ease-in-out infinite alternate' :
        undefined,
      transformOrigin: 'center'
    }}>
      {/* Flammes du réacteur */}
      <ellipse cx="-16" cy="0" rx="11" ry="5.5" fill="#f97316" opacity="0.22" />
      <ellipse cx="-13" cy="0" rx="8"  ry="3.8" fill="#fb923c" opacity="0.50" />
      <ellipse cx="-11" cy="0" rx="5"  ry="2.2" fill="#fde68a" opacity="0.82" />
      {/* Corps principal */}
      <path d="M18,0 L12,-2 L-9,-4 L-14,-2 L-14,2 L-9,4 L12,2 Z" fill="#f43f5e" />
      <path d="M12,-2 L18,0 L12,2 Z" fill="#fda4af" />  {/* Nez */}
      <path d="M-1,-4 L-8,-13 L-12,-4 Z" fill="#fb7185" opacity="0.9" />  {/* Aile haute */}
      <path d="M-1,4 L-8,13 L-12,4 Z"  fill="#fb7185" opacity="0.9" />   {/* Aile basse */}
      <path d="M-10,-4 L-14,-9 L-14,-4 Z" fill="#be123c" />  {/* Aileron haut */}
      <path d="M-10,4 L-14,9 L-14,4 Z"   fill="#be123c" />   {/* Aileron bas */}
      <circle cx="5" cy="0" r="3.2" fill="#bfdbfe" opacity="0.95" />
      <circle cx="5" cy="0" r="1.9" fill="#60a5fa" />
      <circle cx="4.2" cy="-0.8" r="0.7" fill="#fff" opacity="0.6" />
      <circle r="10" fill="#f43f5e" opacity="0.06" />
    </g>
  </g>
)}
```

### Explosion SVG actuelle (phase crashed)
```tsx
{isCrashed && (
  <g>
    {Array.from({length: 10}, (_, i) => {
      const a = (i * 36) * Math.PI / 180;
      const r = 10 + (i % 3) * 5;
      return <circle key={i}
        cx={+(tipX + Math.cos(a) * r).toFixed(1)}
        cy={+(tipY + Math.sin(a) * r).toFixed(1)}
        r={2 + (i % 3)}
        fill={['#ef4444','#f97316','#fbbf24'][i % 3]} opacity="0.75" />;
    })}
    <circle cx={tipX} cy={tipY} r="14" fill="#f97316" opacity="0.15" />
    <text x={tipX} y={tipY + 7} textAnchor="middle" fontSize="22">💥</text>
  </g>
)}
```

### Flash vert au cashout actuel
```tsx
{cashFlash && (
  <div className="absolute inset-0 pointer-events-none rounded-2xl"
    style={{ background: 'rgba(34,197,94,0.18)', animation: 'cashoutFlash 0.45s ease-out forwards' }} />
)}
```

### `doCashout` (ne pas modifier la logique — seulement les effets)
```typescript
const doCashout = (m: number) => {
  // ... logique métier intouchable ...
  snd.cashout();
  haptic.success();
  setCashFlash(true);
  setTimeout(() => setCashFlash(false), 450);
  setCashedOut(m);
  setToast({ id: Date.now(), text: `+${win.toFixed(4)} TON`, win: true });
};
```

---

## Problèmes à résoudre

### Problème 1 — Screen shake trop discret
Le shake (`crashShake`) n'a que 4px de déplacement et ne s'applique que sur le conteneur graphique. Il n'y a pas de flash rouge, pas d'effet "bordure explose". Les vrais jeux de crash ont un écran qui **tremble violemment + fond qui flashe rouge**.

### Problème 2 — Flammes de la fusée trop statiques
Les ellipses `cx="-16"` à `cx="-11"` ont une opacité fixe. Les vraies flammes de fusée casino **pulsent, grandissent et rétrécissent** pour simuler la poussée.

### Problème 3 — Explosion SVG trop simple
10 cercles statiques + 💥 emoji. Devrait avoir des éclats qui **partent vers l'extérieur** avec une animation CSS sur chaque `<circle>`.

### Problème 4 — Cashout flash trop subtil
`rgba(34,197,94,0.18)` = quasi invisible. Devrait être un flash vert lumineux qui s'évanouit rapidement — plus satisfaisant visuellement.

---

## Ce que tu dois produire

### SONS — Évaluation + version améliorée si nécessaire
Évalue `snd.crash()` et `snd.cashout()` :
- Le crash : est-ce que le sawtooth 320→35Hz suffit ? Faut-il plus d'impact ?
- Le cashout : l'arpège [523,659,784,1047] est correct mais peut-on le rendre plus "victorieux" ?

**Note** : les sons actuels sont définis dans l'objet `snd` au niveau module du fichier, avant les composants.

### BLOC C1 — Keyframes CSS à ajouter/remplacer dans `<style>` de CrashGame

Keyframes à produire :
- `crashShake` amélioré : tremblement plus violent (7-8px) avec légère rotation
- `crashRedFlash` : fond rouge `0 → 0.25 → 0` en 0.35s — appliqué sur l'overlay du conteneur
- `thrustPulse` : animation des flammes de la fusée (scale + opacité pulsante)
- `shardFly` : éclats de l'explosion qui partent vers l'extérieur en opacity 1→0
- `cashGreenFlash` : flash vert plus lumineux `rgba(34,197,94,0.45)` → 0 en 0.3s
- Conserver les keyframes utiles existantes

### BLOC C2 — Conteneur graphique avec crash shake + flash rouge

Modifier le `<div className="mx-4 mt-1 relative"...>` pour :
- Le crash shake doit toujours se déclencher (pas seulement quand le joueur a perdu)
- Ajouter un overlay `<div>` rouge absolu (inset 0) avec `crashRedFlash` quand `isCrashed`
- Ajouter un `[crashRedState, setCrashRedState]` state si nécessaire, ou utiliser `isCrashed` directement

### BLOC C3 — Flammes de la fusée améliorées

Modifier les 3 ellipses de flammes pour qu'elles pulsent :
```tsx
// Les ellipses doivent avoir animation="thrustPulse Xs ease-in-out infinite alternate"
// avec des durées décalées (0.12s, 0.18s, 0.22s) pour un effet organique
// L'amplitude des flammes augmente avec mult (comme le wobble existant)
```

### BLOC C4 — Explosion SVG animée

Remplacer les 10 cercles statiques par des éclats qui partent vers l'extérieur :
```tsx
// Chaque éclat = <circle> avec transform: translate() depuis le centre
// Animation : opacity 1→0 + scale vers l'extérieur en 0.5s
// Utiliser animationDelay différent par éclat pour effet naturel
// Garder le 💥 emoji centré
```

### BLOC C5 — Flash cashout amélioré

Remplacer le `{cashFlash && <div...>}` existant par un overlay plus lumineux :
```tsx
// background: rgba(34,197,94,0.45) — plus visible qu'avant (était 0.18)
// Peut-être ajouter un text overlay "WIN ✓" qui monte brièvement
// Animation cashGreenFlash : opacity 1→0 en 0.3s (plus rapide = plus satisfaisant)
```

---

## Format de réponse exigé

```
### SONS — Évaluation + version améliorée (si nécessaire)
[code snd.crash() et snd.cashout() — ou "sons actuels corrects"]

### BLOC C1 — Keyframes CSS complètes
[code CSS — prêt à coller dans le <style> de CrashGame]

### BLOC C2 — Conteneur graphique (screen shake + flash rouge)
[code TSX — le div principal avec les overlays]

### BLOC C3 — Flammes fusée animées
[code TSX — les 3 ellipses avec thrustPulse]

### BLOC C4 — Explosion SVG animée
[code TSX — les éclats avec animation]

### BLOC C5 — Flash cashout amélioré
[code TSX — l'overlay vert plus lumineux]
```

**TypeScript strict, zéro `any`, zéro nouvelle dépendance npm.**

---

*Brief généré par Claude Code — TonCipher Crash V1*
