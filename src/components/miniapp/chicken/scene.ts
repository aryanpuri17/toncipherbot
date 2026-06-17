// ============================================================================
// FICHIER : scene.ts — VERSION CORRIGÉE TOP-DOWN
// Validé par Claude.ai ✅
// ============================================================================
// Caméra : position(0, 0, 20), lookAt(0, 0, 0)
//   → Axe X = horizontal (gauche/droite) = colonnes de voies
//   → Axe Y = vertical (haut/bas écran) = sens de circulation des véhicules
//   → Axe Z = profondeur (vers la caméra) = "hauteur" visuelle
// Tous les éléments de décor sont des plans dans le plan X/Y.
// ============================================================================

import * as THREE from 'three';

export interface SceneElements {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  multiplierBadges: THREE.Group[];
}

function createMultiplierBadge(
  text: string,
  x: number,
  y: number
): THREE.Group {
  const group = new THREE.Group();

  const bgMat = new THREE.MeshStandardMaterial({
    color: 0x4a4a52,
    metalness: 0.3,
    roughness: 0.7,
  });
  const bg = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 0.06, 32),
    bgMat
  );
  bg.rotation.x = Math.PI / 2;
  bg.position.set(x, y, 0.08);
  group.add(bg);

  const borderMat = new THREE.MeshStandardMaterial({
    color: 0x6a6a72,
    metalness: 0.3,
    roughness: 0.6,
  });
  const border = new THREE.Mesh(
    new THREE.CylinderGeometry(0.78, 0.78, 0.04, 32),
    borderMat
  );
  border.rotation.x = Math.PI / 2;
  border.position.set(x, y, 0.06);
  group.add(border);

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 256, 256);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 64px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 128);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const labelMat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
  });
  const label = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), labelMat);
  label.position.set(x, y, 0.15);
  group.add(label);

  group.userData.canvas = canvas;
  group.userData.texture = texture;
  group.userData.label = label;

  return group;
}

export function updateBadgeText(badge: THREE.Group, text: string): void {
  const canvas = badge.userData.canvas as HTMLCanvasElement | undefined;
  const texture = badge.userData.texture as THREE.CanvasTexture | undefined;
  if (!canvas || !texture) return;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 256, 256);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 64px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 128);
    texture.needsUpdate = true;
  }
}

function createVerticalDashedLine(x: number): THREE.Group {
  const group = new THREE.Group();
  const dashMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.0,
    roughness: 0.8,
  });

  const totalDashes = 14;
  const startY = -7;
  const endY = 7;
  const step = (endY - startY) / totalDashes;

  for (let i = 0; i < totalDashes; i++) {
    const dash = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.5, 0.04),
      dashMat
    );
    dash.position.set(x, startY + i * step + step / 2, 0.03);
    group.add(dash);
  }
  return group;
}

function createCurb(
  _x: number,
  width: number,
  color: number
): THREE.Mesh {
  const curbMat = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.1,
    roughness: 0.8,
  });
  return new THREE.Mesh(new THREE.BoxGeometry(width, 16, 0.12), curbMat);
}

export function createScene(canvas: HTMLCanvasElement): SceneElements {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  const aspect = canvas.clientWidth / canvas.clientHeight;
  const frustumSize = 14;
  const camera = new THREE.OrthographicCamera(
    (-frustumSize * aspect) / 2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    -frustumSize / 2,
    0.1,
    100
  );
  camera.position.set(0, 0, 20);
  camera.lookAt(0, 0, 0);

  const ambient = new THREE.AmbientLight(0xffffff, 0.85);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, 0.7);
  keyLight.position.set(3, 5, 12);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 40;
  keyLight.shadow.camera.left = -12;
  keyLight.shadow.camera.right = 12;
  keyLight.shadow.camera.top = 10;
  keyLight.shadow.camera.bottom = -10;
  keyLight.shadow.bias = -0.001;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xaab5d6, 0.3);
  fillLight.position.set(-3, -2, 8);
  scene.add(fillLight);

  // ─── ROUTE PRINCIPALE ──────────────────────────────────
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x3a3a42,
    metalness: 0.1,
    roughness: 0.9,
  });
  const road = new THREE.Mesh(
    new THREE.BoxGeometry(10, 16, 0.1),
    roadMat
  );
  road.position.set(0, 0, -0.05);
  road.receiveShadow = true;
  scene.add(road);

  // ─── ZONE DE DÉPART (gauche, x = -6) ──────────────────
  const startMat = new THREE.MeshStandardMaterial({
    color: 0x5a5a62,
    metalness: 0.05,
    roughness: 0.95,
  });
  const startZone = new THREE.Mesh(
    new THREE.BoxGeometry(2, 16, 0.1),
    startMat
  );
  startZone.position.set(-6, 0, -0.04);
  startZone.receiveShadow = true;
  scene.add(startZone);

  const startCurb = createCurb(-5, 0.1, 0x7a7a82);
  startCurb.position.set(-5, 0, 0.0);
  scene.add(startCurb);

  // ─── ZONE D'ARRIVÉE (droite, x = +6) ──────────────────
  const finishMat = new THREE.MeshStandardMaterial({
    color: 0x5a6a52,
    metalness: 0.05,
    roughness: 0.95,
  });
  const finishZone = new THREE.Mesh(
    new THREE.BoxGeometry(2, 16, 0.1),
    finishMat
  );
  finishZone.position.set(6, 0, -0.04);
  finishZone.receiveShadow = true;
  scene.add(finishZone);

  const finishCurb = createCurb(5, 0.1, 0x7a7a82);
  finishCurb.position.set(5, 0, 0.0);
  scene.add(finishCurb);

  // ─── LIGNES POINTILLÉES VERTICALES ─────────────────────
  const dashedXPositions = [-5.0, -3.0, -1.0, 1.0, 3.0, 5.0];
  dashedXPositions.forEach((x) => {
    const dashes = createVerticalDashedLine(x);
    scene.add(dashes);
  });

  // ─── BORDURES HAUT ET BAS ──────────────────────────────
  const borderMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.1,
    roughness: 0.6,
  });

  const topBorder = new THREE.Mesh(
    new THREE.BoxGeometry(14, 0.1, 0.06),
    borderMat
  );
  topBorder.position.set(0, 7.5, 0.03);
  scene.add(topBorder);

  const bottomBorder = new THREE.Mesh(
    new THREE.BoxGeometry(14, 0.1, 0.06),
    borderMat
  );
  bottomBorder.position.set(0, -7.5, 0.03);
  scene.add(bottomBorder);

  // ─── DAMIER D'ARRIVÉE ──────────────────────────────────
  const checkerW = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.1,
    roughness: 0.6,
  });
  const checkerB = new THREE.MeshStandardMaterial({
    color: 0x222222,
    metalness: 0.1,
    roughness: 0.6,
  });
  const sqSize = 0.4;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      const isWhite = (row + col) % 2 === 0;
      const sq = new THREE.Mesh(
        new THREE.BoxGeometry(sqSize, sqSize, 0.04),
        isWhite ? checkerW : checkerB
      );
      sq.position.set(
        5.2 + col * sqSize,
        -0.8 + row * sqSize - sqSize * 1.5,
        0.02
      );
      scene.add(sq);
    }
  }

  // ─── BADGES MULTIPLICATEURS ────────────────────────────
  const multiplierBadges: THREE.Group[] = [];
  const defaultMults = ['×1.35', '×1.92', '×2.74', '×3.92', '×5.60'];
  const laneCenters = [-4.0, -2.0, 0.0, 2.0, 4.0];
  laneCenters.forEach((x, i) => {
    const badge = createMultiplierBadge(defaultMults[i], x, 0);
    scene.add(badge);
    multiplierBadges.push(badge);
  });

  return { scene, camera, renderer, multiplierBadges };
}

export function updateScene(
  _elements: SceneElements,
  _time: number,
  _delta: number
): void {
  // Scène statique
}

export function updateMultiplierBadges(
  elements: SceneElements,
  multipliers: string[]
): void {
  elements.multiplierBadges.forEach((badge, i) => {
    if (i >= multipliers.length) return;
    updateBadgeText(badge, multipliers[i]);
  });
}

export function setBadgeVisible(
  elements: SceneElements,
  index: number,
  visible: boolean
): void {
  const badge = elements.multiplierBadges[index];
  if (badge) badge.visible = visible;
}

export function resizeScene(
  elements: SceneElements,
  width: number,
  height: number
): void {
  const aspect = width / height;
  const frustumSize = 14;
  elements.camera.left = (-frustumSize * aspect) / 2;
  elements.camera.right = (frustumSize * aspect) / 2;
  elements.camera.top = frustumSize / 2;
  elements.camera.bottom = -frustumSize / 2;
  elements.camera.updateProjectionMatrix();
  elements.renderer.setSize(width, height);
}
