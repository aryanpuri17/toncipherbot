# BRIEF DESIGN — Avion/Fusée Crash Game

## Contexte projet

TonCipher est une mini-app Telegram de casino. Le jeu **Crash** affiche un avion/fusée qui monte le long d'une courbe exponentielle. Le joueur encaisse avant que l'avion s'écrase.

**Inspiration directe :** Aviator (Spribe), JetX (SmartSoft) — ces deux jeux utilisent une silhouette d'avion ou de jet de chasse stylisé.

---

## Ce qui existe actuellement (à REMPLACER)

Le SVG actuel est un polygone basique rouge :

```tsx
{/* Corps */}
<path d="M18,0 L12,-2 L-9,-4 L-14,-2 L-14,2 L-9,4 L12,2 Z" fill="#f43f5e" />
{/* Nez */}
<path d="M12,-2 L18,0 L12,2 Z" fill="#fda4af" />
{/* Ailes */}
<path d="M-1,-4 L-9,-15 L-13,-4 Z" fill="#fb7185" opacity="0.9" />
<path d="M-1,4 L-9,15 L-13,4 Z"  fill="#fb7185" opacity="0.9" />
{/* Ailerons */}
<path d="M-10,-4 L-14,-10 L-14,-4 Z" fill="#be123c" />
<path d="M-10,4 L-14,10 L-14,4 Z"   fill="#be123c" />
{/* Hublot */}
<circle cx="5" cy="0" r="3.6" fill="#bfdbfe" opacity="0.95" />
<circle cx="5" cy="0" r="2.2" fill="#60a5fa" />
<circle cx="4.2" cy="-0.9" r="0.9" fill="#fff" opacity="0.7" />
{/* Halo de vitesse */}
<circle cx="2" cy="0" r="12" fill="#f43f5e" opacity="0.07" />
```

---

## Contraintes TECHNIQUES (non négociables)

### Structure de transform dans le code

```tsx
<g transform={`translate(${tipX},${tipY}) rotate(${planeAngle}) scale(1.5) translate(-18,0)`}>
  <g style={{ animation: wobble, transformOrigin: '2px 0px' }}>
    
    {/* === FLAMMES — NE PAS TOUCHER, gérées par le code === */}
    <ellipse cx="-17" cy="0" rx={mult>5?14:mult>2?12:10} ry={mult>5?7:6} fill="#f97316"
      style={{ '--flame-max-opacity':'0.28', transformOrigin:'-17px 0px', animation:'thrustPulse 0.22s ease-in-out infinite alternate' }} />
    <ellipse cx="-13" cy="0" rx={mult>5?10:mult>2?9:7} ry={mult>5?4.5:3.8} fill="#fb923c"
      style={{ '--flame-max-opacity':'0.60', transformOrigin:'-13px 0px', animation:'thrustPulse 0.17s ease-in-out infinite alternate', animationDelay:'0.05s' }} />
    <ellipse cx="-11" cy="0" rx={mult>5?7:mult>2?6:5} ry={mult>5?3:2.2} fill="#fde68a"
      style={{ '--flame-max-opacity':'0.92', transformOrigin:'-11px 0px', animation:'thrustPulse 0.13s ease-in-out infinite alternate', animationDelay:'0.09s' }} />
    
    {/* === ICI : REMPLACER LE CORPS DE L'AVION === */}
    {/* Corps, ailes, ailerons, hublot, décorations */}
    
  </g>
</g>
```

### Règles de coordonnées
- **Nez de l'avion : x = 18, y = 0** (ce point sera exactement sur la courbe — NE PAS DÉPLACER)
- **Queue (réacteur) : entre x = -14 et x = -18** (les flammes sortent de là)
- **Hauteur max : ±15 à ±18 en Y** (ailes incluses)
- L'avion vole vers la droite (nez à droite, queue à gauche)

### Éléments SVG autorisés
✅ `<path>`, `<ellipse>`, `<circle>`, `<polygon>`, `<rect>` avec `rx`
✅ `<linearGradient>` et `<radialGradient>` dans `<defs>` (si utilisés, mettre les defs dans le `<svg>` parent, PAS dans le group)
✅ `opacity`, `fill`, `stroke`
❌ `<image>`, `<use>`, `<symbol>`, `<text>` dans le corps de l'avion
❌ Filtres SVG complexes (`<feGaussianBlur>` etc.) — trop lourds sur mobile

### Fond du graphique
`radial-gradient(120% 120% at 20% 100%, #0c1230 0%, #060a18 60%)` — très sombre, presque noir avec teinte bleu nuit.

---

## Ce qu'on veut

### Style visuel
- **Jet de chasse stylisé** ou **avion de ligne futuriste** — pas cartoon, pas trop simple
- Look **néon/premium casino** — comme Aviator (Spribe) ou JetX
- Corps avec volume : dégradés SVG suggérant une forme 3D (ventre plus clair, dos plus sombre)
- Ailes delta ou en flèche — élégantes, pas triangles grossiers
- Couleur principale : choix libre mais doit ressortir sur fond sombre (`#060a18`)
  - Option A : rouge/rose/blanc (style Aviator — avion rouge vif)
  - Option B : bleu électrique/cyan (style futuriste)
  - Option C : doré/orange (style premium casino)
- Hublot optionnel mais sympa
- Petit trail de lumière ou halo de vitesse derrière le nez

### Ce qu'on veut éviter
- Corps monochrome plat (l'actuel)
- Formes trop basiques (triangle + rectangle)
- Trop de détails qui s'affichent mal en petit (le SVG fait ~55×40px à l'écran)

---

## Format de la réponse attendu

Retourner **uniquement le bloc JSX du corps de l'avion** (sans les flammes, sans le `<g transform>` parent) — juste les paths/circles/ellipses qui remplacent le corps actuel.

Si tu utilises des `<linearGradient>`, les livrer séparément dans un bloc `<defs>` à insérer dans le `<svg>` parent (je m'occupe de l'intégration).

```tsx
// DEFS À AJOUTER dans le <svg> parent (si gradients) :
<defs>
  <linearGradient id="rocketBody" ...>...</linearGradient>
</defs>

// CORPS DE L'AVION (remplace le contenu actuel du <g wobble>) :
<path d="..." fill="url(#rocketBody)" />
...
```

---

## Contexte du SVG parent

```tsx
// ViewBox : 0 0 320 196
// Zone de tracé : x: 34→308, y: 12→164
// Fond : #060a18 (très sombre)
// tipX, tipY : position du nez sur la courbe (varie pendant le jeu)
// planeAngle : -5° à -80° (avion qui monte de plus en plus à la verticale)
// mult : 1.0 → ∞ (multiplicateur courant — peut être utilisé pour effets visuels)

<svg width="100%" viewBox="0 0 320 196">
  <defs>
    {/* ICI si tu veux ajouter des gradients */}
  </defs>
  {/* ... étoiles, courbe, graduations ... */}
  
  <g transform={`translate(${tipX},${tipY}) rotate(${planeAngle}) scale(1.5) translate(-18,0)`}>
    <g style={{ animation: wobble, transformOrigin: '2px 0px' }}>
      {/* FLAMMES (ne pas toucher) */}
      <ellipse cx="-17" ... />
      <ellipse cx="-13" ... />
      <ellipse cx="-11" ... />
      
      {/* ← TON DESIGN ICI */}
    </g>
  </g>
</svg>
```
