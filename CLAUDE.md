# TonCipher — Contexte partagé (Claude Code ↔ Claude.ai)

> **Ce fichier est lu automatiquement par Claude Code.**
> **Pour claude.ai : colle ce fichier au début de chaque conversation.**

---

## Qui fait quoi

| Agent | Rôle |
|---|---|
| **Claude Code** (ici) | Code, git, build, logique métier, intégration d'assets |
| **Claude.ai** | Design, UX, briefs visuels, review de code |
| **IA 3D** | Modèles 3D, animations, voxel art, Three.js/Babylon.js, sprites professionnels, effets visuels avancés, sons custom |

**Règles de collaboration :**
- Claude.ai produit des specs/briefs → les coller ici → Claude Code implémente
- Claude Code produit du code → pusher sur la branche → Claude.ai peut lire via GitHub
- **Dès qu'un besoin touche à un sprite animé, effet visuel avancé, 3D, ou son thématique custom → Claude Code s'arrête et signale : "Ce point nécessite l'IA 3D."** Ne jamais tenter de le remplacer par un SVG approximatif ou un Canvas bancal. Aryan transmet à l'IA 3D, elle produit les assets, Claude Code intègre.

---

## Le projet

**TonCipher** — Mini-app Telegram qui permet aux utilisateurs de gagner de vrais TON en :
- Accomplissant des tâches (rejoindre canaux, bots, réseaux sociaux)
- Jouant à des jeux (Roue, Crash, Mines, Jackpot)
- Parrainant des amis

**Stack technique :**
- React 19 + TypeScript + Vite + Tailwind v4
- Zustand v5 (state management)
- `vite-plugin-singlefile` → build = un seul `dist/index.html`
- Déployé dans Telegram WebApp

**Branche de travail :** `claude/bot-mini-app-redesign-TMm7a`

---

## Architecture

```
src/
  App.tsx                    — routing principal, onboarding overlay
  store/appStore.ts          — état global Zustand + localStorage
  components/
    miniapp/
      MiniAppDashboard.tsx   — solde, streak, promo
      MiniAppTasks.tsx       — liste et complétion des tâches
      MiniAppGames.tsx       — hub des 5 jeux
      MiniAppReferral.tsx    — parrainage, classement, milestones
      MiniAppWallet.tsx      — dépôt / retrait TON
      MiniAppOnboarding.tsx  — guide première ouverture (5-6 slides)
      MiniAppNav.tsx         — navigation bas de page (pill animée)
    admin/
      AdminConfig.tsx        — panneau admin (plateforme, parrainage, bonus...)
  lib/
    haptics.ts               — vibrations Telegram WebApp
    withdrawalSync.ts        — synchronisation retraits serveur
  components/ui/
    CountUp.tsx              — compteur animé rAF
index.css                    — keyframes + utilitaires CSS
```

---

## Système de design

**Palette :**
- Fond : `#0f0c29` → `#1a1a2e` → `#16213e` (dégradé vertical)
- Accent principal : `#3b82f6` (blue-500)
- Succès : `#10b981` (emerald-500)
- Warning : `#f59e0b` (amber-500)
- Texte principal : `white`, secondaire : `slate-400`

**Classes CSS clés :**
- `.gradient-text` — texte dégradé bleu→violet
- `.card-sheen` — effet brillance sur les cartes
- `.animated-gradient` — dégradé animé (cartes balance)
- `.glass-card` — carte glassmorphism
- `.animate-float` — flottement vertical
- `.animate-pop-in` — apparition avec rebond
- `.page-enter` — transition d'entrée de page
- `.tap-scale` — réduction au tap (feedback tactile)
- `.btn-primary` — bouton principal bleu

**Composants réutilisables :**
- `<CountUp value decimals duration>` — chiffre animé
- `haptic.impact/success/error/selection/tick` — retours haptiques

---

## Logique métier clé

### Parrainage
- **Parrain reçoit** : `referralBonusSignup` TON à l'inscription de l'ami + `referralBonusDepositPercent`% sur chaque tâche complétée par l'ami
- **Ami reçoit** : `welcomeBonusAmount` TON à l'inscription (si `welcomeBonusEnabled`)
- Tout est configurable depuis Admin → onglet Parrainage

### Persistance localStorage
| Clé | Contenu |
|---|---|
| `tc_balance` | Solde + earnings + streak (v:1) |
| `tc_platform_config` | Config admin complète (survit aux redéploiements) |
| `tc_completed_tasks` | IDs tâches complétées |
| `tc_onboarded` | `'1'` si onboarding terminé |
| `tc_last_wd_addr` | Dernière adresse de retrait |
| `tc_wd_processed` | IDs retraits traités (cap 500) |

### Adresse de dépôt/retrait par défaut
`UQDCLLOiZ8_KzB_lJXPaTuinjyEemjbnzS3-VAZD6fU-Rp2S`

---

## Onboarding (5-6 slides)

1. Bienvenue
2. Tableau de bord (mock balance card)
3. Tâches (3 mock task cards)
4. Jeux (grille 2×2)
5. Parrainage (+bonus inscription & % tâches)
6. Bonus de bienvenue *(si `welcomeBonusEnabled`)*

Skip disponible sur tous les slides. Bonus crédité uniquement sur "Réclamer".

---

## Comment utiliser avec Claude.ai

1. **Ouvre un chat sur claude.ai**
2. **Upload ce fichier** (`CLAUDE.md`) ou colle son contenu
3. Dis-lui : *"Tu es le designer de ce projet. Lis le contexte et aide-moi avec [tâche design]"*
4. Une fois qu'il a produit quelque chose, **copie le résultat** et viens le coller ici
5. Je l'implémente directement dans le code

### Format de brief design → code
Quand claude.ai produit un design, demande-lui de le formater ainsi :

```
## BRIEF DESIGN — [nom de la feature]
**Composant cible :** src/components/miniapp/XXX.tsx
**Objectif :** ...
**Visuels :**
- Couleurs : ...
- Layout : ...
- Textes : ...
**Comportement :** ...
```

Ce format me permet d'implémenter directement sans ambiguïté.
