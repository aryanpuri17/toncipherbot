# BRIEF IA 3D — CrashLineGame · TonCipher

**De : Claude Code (développeur)**
**Pour : IA 3D / Designer (nouveau contexte)**
**Projet : TonCipher — Mini-app Telegram**

---

## CONTEXTE DU PROJET

TonCipher est une mini-app Telegram qui permet aux utilisateurs de gagner de vrais TON (cryptomonnaie).
- Stack : React 19 + TypeScript + Vite + Tailwind v4
- Build = un seul fichier `dist/index.html` (via `vite-plugin-singlefile`)
- Déployé dans Telegram WebApp (mobile Android/iOS)
- Branche de travail : `claude/bot-mini-app-redesign-TMm7a`

**Palette couleurs du projet :**
- Fond : `#0f0c29` → `#1a1a2e` → `#16213e`
- Accent : `#3b82f6` (blue-500)
- Succès : `#10b981` (emerald)
- Texte : white / slate-400

---

## CE QUI EXISTE DÉJÀ (NE PAS CASSER)

Le fichier principal est `src/components/miniapp/MiniAppGames.tsx`.

Le composant `CrashLineGame` (ligne ~620) est **entièrement fonctionnel** :
- Logique countdown 5s → vol (courbe SVG) → crash aléatoire → reset
- Distribution crash réaliste (RTP ~95%, 52% crashent sous 2×)
- Mise en attente (`queuedBet`) pour parier au prochain tour
- Auto-cashout (seuil configurable)
- Live feed de faux joueurs (28 entrées pré-peuplées, s'actualise à chaque tour)
- Vérification de solde au démarrage du tour
- Cleanup RAF + setTimeout sur démontage

**Layout actuel (ne pas changer la structure) :**
```
┌─────────────────────────┐
│  ←  CRASH  #N           │  header fixe
├─────────────────────────┤
│                         │
│     1.36×               │  graphe SVG 44dvh (fixe)
│   ~~~courbe~~~          │
│                         │
├─────────────────────────┤
│ scrollable vers le bas  │
│  [0.1 TON]  [AUTO×]     │  bet panel (sticky top dans le scroll)
│  [.10][.50][1.00][5.00] │
│  [MISER 0.10 TON]       │
│  ─────────────────────  │
│  🟢 En direct · 22 j.   │  live feed (scroll pour voir)
│  AlexK  ◆0.44  ×1.23  ◆0.54  │
│  Maria  ◆1.00  CRASH   —     │
│  ...                    │
│  ─────────────────────  │
│  Historique des crashs  │
│  1.42× 2.31× 0.98× ...  │  chips colorés
└─────────────────────────┘
```

---

## CE QUI NE VA PAS — À AMÉLIORER

### 1. Logo TON — CRITIQUE

Actuellement on utilise `◆` (diamant unicode) en bleu `#3b82f6` comme substitut du logo TON.
C'est approximatif. Il faut le remplacer par le **vrai logo TON inline SVG** partout où on affiche les montants.

**Le vrai logo TON (SVG) :**
```svg
<svg width="14" height="14" viewBox="0 0 56 56" fill="none" style="display:inline-block;vertical-align:middle;margin-right:2px">
  <circle cx="28" cy="28" r="28" fill="#0098EA"/>
  <path d="M37.5603 15.6277H18.4386C14.9228 15.6277 12.7243 19.3821 14.4815 22.4018L26.2229 42.9881C27.0137 44.3909 29.0049 44.3909 29.7956 42.9881L41.5289 22.4018C43.2779 19.3739 41.0715 15.6277 37.5603 15.6277Z" fill="white"/>
</svg>
```

Créer un composant React réutilisable `TonLogo` :
```tsx
const TonLogo = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 56 56" fill="none"
    style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 2, flexShrink: 0 }}>
    <circle cx="28" cy="28" r="28" fill="#0098EA"/>
    <path d="M37.5603 15.6277H18.4386C14.9228 15.6277 12.7243 19.3821 14.4815 22.4018L26.2229 42.9881C27.0137 44.3909 29.0049 44.3909 29.7956 42.9881L41.5289 22.4018C43.2779 19.3739 41.0715 15.6277 37.5603 15.6277Z" fill="white"/>
  </svg>
);
```

Remplacer tous les `◆` par `<TonLogo />` dans le live feed ET dans l'input de mise.

### 2. Design global du CrashLineGame — PROFESSIONNEL

Actuellement c'est fonctionnel mais trop basique. Inspiration : **FaucetPay Crash**, **Aviator BC.Game**, **1Win Crash**.

Ce qu'il faut améliorer visuellement :

#### A. Header
- Ajouter un badge "LIVE" rouge pulsant à droite du titre
- Fond du header légèrement différencié (glassmorphism ou border plus marquée)

#### B. Panel de mise (bet panel)
- L'input de mise doit avoir un border qui s'illumine en vert quand le joueur peut encaisser (`isActiveCashout`)
- Le bouton "MISER" : gradient bleu-indigo, border-radius 14px, hauteur 48px
- Le bouton "ENCAISSER ×X.XX" : gradient vert-émeraude, pulsant (animation `cashoutPulse` déjà dans index.css), hauteur 52px, font plus grande
- Le bouton "Prochain tour…" : gris désactivé mais visible
- Labels des quick-bets plus petits et stylisés

#### C. Graphe SVG
- La courbe doit avoir un effet de lueur (glow) plus fort : `filter: drop-shadow(0 0 6px rgba(129,140,248,.7))`
- Le point actuel (dot blanc sur la courbe) : augmenter à r=5, ajouter un halo animé
- Fond du graphe : ajouter un très léger gradient (plus sombre en bas)
- Les labels d'axe : couleur `#475569` au lieu de `#334155` (plus lisibles)
- La ligne de l'auto-cashout : plus visible, ajouter un label "AUTO ×X.XX" à droite

#### D. Multiplicateur central
- Pendant le vol : font 56px, glow plus fort, légère animation de scale (pulse lent)
- Au crash : animation `crashShake` (déjà dans index.css) + texte "CRASH !" plus grand
- Pendant l'attente : countdown avec cercle de progression autour du chiffre

#### E. Live feed
- Ajouter des badges colorés sur les multipliers élevés (×5+ = badge vert glow, ×2+ = badge bleu)
- Alterner légèrement les couleurs de fond des lignes (zebrastripe très subtil)
- Le titre "En direct" avec le point vert pulsant doit être plus visible

#### F. Historique des crashs (chips)
- Les chips `×1.5` en rouge, `×2-5` en bleu, `×5+` en vert avec un petit glow correspondant
- Taille 13px au lieu de 12px

### 3. Animations manquantes

- **Dot sur la courbe** : ajouter un halo animé (cercle qui pulse autour du point actuel)
- **Entrée dans le live feed** : quand une nouvelle ligne s'ajoute, fade-in + slide depuis le haut
- **Bouton cashout** : scale(1.02) au hover, scale(0.97) au tap

---

## FORMAT DES MONTANTS À UTILISER PARTOUT

```tsx
// À la place de ◆ 0.44 :
<TonLogo size={11} /> 0.44

// Exemple ligne live feed :
// AlexK   [TONlogo] 0.44   ×1.23   [TONlogo] 0.54
// Maria   [TONlogo] 1.00   CRASH   —
```

---

## FICHIERS CONCERNÉS

1. `src/components/miniapp/MiniAppGames.tsx` — composant principal (4000+ lignes)
   - Le `CrashLineGame` est vers la ligne 620
   - Ne toucher QUE le bloc CrashLineGame (lignes ~604 à ~1010)
   - **NE PAS modifier** les autres jeux (DiceGame, MinesGame, TowerGame, PlinkoGame, AviatorGame)

2. `src/index.css` — keyframes et utilitaires
   - Les keyframes `cashoutPulse`, `crashShake`, `crashFlash` sont déjà là
   - Ajouter les nouvelles animations si besoin

---

## RÉSULTAT ATTENDU

Le jeu doit ressembler à un vrai jeu de casino professionnel comme sur FaucetPay :
- Logo TON bleu officiel partout (pas ◆)
- Courbe qui monte avec glow violet/bleu
- Multiplicateur lisible et impressionnant
- Live feed avec vrais montants en TON
- Bouton encaisser très visible et pulsant quand actionnable
- Tout en dark mode, cohérent avec le reste de l'app

**À ne surtout pas faire :**
- Changer la logique métier (RAF loop, countdown, crash distribution)
- Modifier les autres composants de jeu
- Utiliser Three.js ou canvas (tout doit rester en React/SVG/CSS)
- Ajouter des dépendances npm supplémentaires

---

*Brief rédigé par Claude Code — développeur TonCipher*
