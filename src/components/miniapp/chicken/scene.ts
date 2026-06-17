// scene.ts — Chicken Road TonCipher
// Livré par l'IA 3D, validé par Claude.ai

import * as THREE from 'three';

export interface SceneElements {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  renderer: THREE.WebGLRenderer;
  clouds: THREE.Group[];
  finishTrophy: THREE.Group;
  multiplierSigns: THREE.Group[];
}

function createCloud(): THREE.Group {
  const cloud = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.0,
    roughness: 1.0,
    transparent: true,
    opacity: 0.85,
  });

  const positions = [
    { x: 0, y: 0, z: 0, sx: 1.2, sy: 0.5, sz: 0.8 },
    { x: 0.7, y: 0.1, z: 0, sx: 0.9, sy: 0.4, sz: 0.7 },
    { x: -0.6, y: 0.05, z: 0.1, sx: 0.8, sy: 0.45, sz: 0.65 },
    { x: 0.3, y: 0.15, z: -0.1, sx: 0.7, sy: 0.35, sz: 0.6 },
    { x: -0.3, y: 0.12, z: -0.05, sx: 0.85, sy: 0.38, sz: 0.7 },
  ];

  positions.forEach((p) => {
    const geo = new THREE.BoxGeometry(p.sx, p.sy, p.sz);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(p.x, p.y, p.z);
    cloud.add(mesh);
  });

  return cloud;
}

function createSceneTree(): THREE.Group {
  const tree = new THREE.Group();

  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x8b5e3c,
    metalness: 0.1,
    roughness: 0.85,
  });
  const trunk = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.8, 0.3),
    trunkMat
  );
  trunk.position.y = 0.4;
  trunk.castShadow = true;
  tree.add(trunk);

  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x3da33d,
    metalness: 0.05,
    roughness: 0.8,
  });

  const layers = [
    { y: 1.0, size: 1.0 },
    { y: 1.4, size: 0.75 },
    { y: 1.7, size: 0.5 },
  ];

  layers.forEach((l) => {
    const foliage = new THREE.Mesh(
      new THREE.BoxGeometry(l.size, 0.4, l.size),
      leafMat
    );
    foliage.position.y = l.y;
    foliage.castShadow = true;
    tree.add(foliage);
  });

  return tree;
}

function createFlower(color: number): THREE.Mesh {
  const mat = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.0,
    roughness: 0.7,
  });
  const flower = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), mat);
  flower.castShadow = false;
  return flower;
}

function createFinishTrophy(): THREE.Group {
  const group = new THREE.Group();

  const baseMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    metalness: 0.6,
    roughness: 0.3,
  });

  const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.8), baseMat);
  base.position.y = 0.15;
  base.castShadow = true;
  group.add(base);

  const cup = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.6), baseMat);
  cup.position.y = 0.65;
  cup.castShadow = true;
  group.add(cup);

  const rim = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.12, 0.75), baseMat);
  rim.position.y = 1.05;
  rim.castShadow = true;
  group.add(rim);

  const handleMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    metalness: 0.6,
    roughness: 0.3,
  });
  const handleL = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.35, 0.12),
    handleMat
  );
  handleL.position.set(-0.42, 0.65, 0);
  group.add(handleL);
  const handleR = handleL.clone();
  handleR.position.set(0.42, 0.65, 0);
  group.add(handleR);

  const starMat = new THREE.MeshStandardMaterial({
    color: 0xffff00,
    metalness: 0.4,
    roughness: 0.3,
    emissive: new THREE.Color(0xffd700),
    emissiveIntensity: 0.3,
  });
  const star = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), starMat);
  star.position.y = 1.25;
  star.rotation.y = Math.PI / 4;
  group.add(star);

  const light = new THREE.PointLight(0xffd700, 1.5, 3);
  light.position.y = 1.3;
  group.add(light);

  return group;
}

function createCheckerboardLine(z: number): THREE.Group {
  const group = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.1,
    roughness: 0.6,
  });
  const black = new THREE.MeshStandardMaterial({
    color: 0x222222,
    metalness: 0.1,
    roughness: 0.6,
  });

  const squareSize = 0.5;
  const count = 60;
  for (let i = 0; i < count; i++) {
    const mat = i % 2 === 0 ? white : black;
    const sq = new THREE.Mesh(
      new THREE.BoxGeometry(squareSize, 0.05, squareSize),
      mat
    );
    sq.position.set(-14.75 + i * squareSize, 0.01, z);
    group.add(sq);
  }
  return group;
}

function createRoadMarkings(): THREE.Group {
  const group = new THREE.Group();

  const dashMat = new THREE.MeshStandardMaterial({
    color: 0xffcc00,
    metalness: 0.1,
    roughness: 0.6,
  });

  const laneZPositions = [2.0, 0.0, -2.0, -4.0];
  laneZPositions.forEach((z) => {
    for (let x = -14; x <= 14; x += 2.5) {
      const dash = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 0.02, 0.08),
        dashMat
      );
      dash.position.set(x, 0.01, z);
      group.add(dash);
    }
  });

  const edgeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.1,
    roughness: 0.6,
  });

  const topEdge = new THREE.Mesh(
    new THREE.BoxGeometry(30, 0.02, 0.1),
    edgeMat
  );
  topEdge.position.set(0, 0.01, -6.0);
  group.add(topEdge);

  const bottomEdge = new THREE.Mesh(
    new THREE.BoxGeometry(30, 0.02, 0.1),
    edgeMat
  );
  bottomEdge.position.set(0, 0.01, 4.0);
  group.add(bottomEdge);

  return group;
}

function createMultiplierSign(
  text: string,
  x: number,
  z: number
): THREE.Group {
  const group = new THREE.Group();

  const postMat = new THREE.MeshStandardMaterial({
    color: 0x888888,
    metalness: 0.3,
    roughness: 0.6,
  });
  const post = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.8, 0.08),
    postMat
  );
  post.position.set(x, 0.4, z);
  group.add(post);

  const boardMat = new THREE.MeshStandardMaterial({
    color: 0x1a5c2a,
    metalness: 0.1,
    roughness: 0.5,
  });
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.4, 0.06),
    boardMat
  );
  board.position.set(x, 0.95, z);
  group.add(board);

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#1A5C2A';
    ctx.fillRect(0, 0, 128, 64);
    ctx.fillStyle = '#00FF88';
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 32);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;

  const signFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.85, 0.35),
    new THREE.MeshStandardMaterial({
      map: texture,
      metalness: 0.0,
      roughness: 0.5,
    })
  );
  signFace.position.set(x, 0.95, z + 0.035);
  group.add(signFace);

  group.userData.signText = text;
  group.userData.canvas = canvas;
  group.userData.texture = texture;
  group.userData.signFace = signFace;

  return group;
}

function createLampPost(x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x555555,
    metalness: 0.5,
    roughness: 0.4,
  });

  const pole = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 2.5, 0.1),
    metalMat
  );
  pole.position.set(x, 1.25, z);
  pole.castShadow = true;
  group.add(pole);

  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xffdd88,
    metalness: 0.2,
    roughness: 0.3,
    emissive: new THREE.Color(0xffdd88),
    emissiveIntensity: 0.2,
  });
  const lamp = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.12, 0.25),
    lampMat
  );
  lamp.position.set(x, 2.55, z);
  group.add(lamp);

  return group;
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
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0xb0d4f1, 20, 40);

  const aspect = canvas.clientWidth / canvas.clientHeight;
  const frustumSize = 18;
  const camera = new THREE.OrthographicCamera(
    (-frustumSize * aspect) / 2,
    (frustumSize * aspect) / 2,
    frustumSize / 2,
    -frustumSize / 2,
    0.1,
    100
  );
  camera.position.set(0, 20, 10);
  camera.lookAt(0, 0, -3);

  const sun = new THREE.DirectionalLight(0xfff5e0, 1.8);
  sun.position.set(5, 10, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 1024;
  sun.shadow.mapSize.height = 1024;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 50;
  sun.shadow.camera.left = -18;
  sun.shadow.camera.right = 18;
  sun.shadow.camera.top = 12;
  sun.shadow.camera.bottom = -12;
  sun.shadow.bias = -0.001;
  scene.add(sun);

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  const fill = new THREE.DirectionalLight(0xb0d4f1, 0.3);
  fill.position.set(-3, 5, -3);
  scene.add(fill);

  const grassStartMat = new THREE.MeshStandardMaterial({
    color: 0x5a9e3f,
    metalness: 0.0,
    roughness: 0.9,
  });
  const grassStart = new THREE.Mesh(
    new THREE.BoxGeometry(30, 0.15, 4),
    grassStartMat
  );
  grassStart.position.set(0, -0.075, 5.5);
  grassStart.receiveShadow = true;
  scene.add(grassStart);

  const sidewalkMat = new THREE.MeshStandardMaterial({
    color: 0xbbbbaa,
    metalness: 0.1,
    roughness: 0.8,
  });
  const sidewalk = new THREE.Mesh(
    new THREE.BoxGeometry(30, 0.12, 0.6),
    sidewalkMat
  );
  sidewalk.position.set(0, -0.06, 3.7);
  sidewalk.receiveShadow = true;
  scene.add(sidewalk);

  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    metalness: 0.05,
    roughness: 0.95,
  });
  const road = new THREE.Mesh(new THREE.BoxGeometry(30, 0.1, 10), roadMat);
  road.position.set(0, -0.05, -1.0);
  road.receiveShadow = true;
  scene.add(road);

  const markings = createRoadMarkings();
  scene.add(markings);

  const sidewalkTop = new THREE.Mesh(
    new THREE.BoxGeometry(30, 0.12, 0.6),
    sidewalkMat
  );
  sidewalkTop.position.set(0, -0.06, -6.3);
  sidewalkTop.receiveShadow = true;
  scene.add(sidewalkTop);

  const grassFinishMat = new THREE.MeshStandardMaterial({
    color: 0x6db84d,
    metalness: 0.0,
    roughness: 0.9,
  });
  const grassFinish = new THREE.Mesh(
    new THREE.BoxGeometry(30, 0.15, 4),
    grassFinishMat
  );
  grassFinish.position.set(0, -0.075, -8.5);
  grassFinish.receiveShadow = true;
  scene.add(grassFinish);

  const checkerboard = createCheckerboardLine(-7.0);
  scene.add(checkerboard);

  const finishTrophy = createFinishTrophy();
  finishTrophy.position.set(0, 0.0, -7.8);
  scene.add(finishTrophy);

  const treePositions = [
    { x: -12, z: 5.0 },
    { x: -9, z: 5.8 },
    { x: -6, z: 5.2 },
    { x: 7, z: 5.5 },
    { x: 10, z: 5.0 },
    { x: 13, z: 5.7 },
    { x: -11, z: -8.5 },
    { x: -7, z: -9.0 },
    { x: 8, z: -8.3 },
    { x: 12, z: -8.8 },
  ];

  treePositions.forEach((pos) => {
    const tree = createSceneTree();
    tree.position.set(pos.x, 0, pos.z);
    const scale = 0.7 + Math.random() * 0.5;
    tree.scale.set(scale, scale, scale);
    scene.add(tree);
  });

  const flowerColors = [0xff4444, 0xffdd00, 0xff69b4, 0xff8844, 0xaa44ff];
  for (let i = 0; i < 30; i++) {
    const color = flowerColors[Math.floor(Math.random() * flowerColors.length)];
    const flower = createFlower(color);
    const side = Math.random() < 0.5 ? 1 : -1;
    flower.position.set(
      (Math.random() - 0.5) * 28,
      0.06,
      side > 0 ? 4.5 + Math.random() * 2.5 : -7.5 - Math.random() * 2.5
    );
    scene.add(flower);
  }

  const laneZs = [3.0, 1.0, -1.0, -3.0, -5.0];
  const defaultMults = ['×1.35', '×1.92', '×2.74', '×3.92', '×5.60'];
  const multiplierSigns: THREE.Group[] = [];
  laneZs.forEach((z, i) => {
    const sign = createMultiplierSign(defaultMults[i], 14.5, z);
    scene.add(sign);
    multiplierSigns.push(sign);
  });

  const lampPositions = [
    { x: -14.5, z: 2.0 },
    { x: -14.5, z: -2.0 },
    { x: 14.5, z: 0.0 },
    { x: 14.5, z: -4.0 },
  ];
  lampPositions.forEach((pos) => {
    const lamp = createLampPost(pos.x, pos.z);
    scene.add(lamp);
  });

  const clouds: THREE.Group[] = [];
  const cloudConfigs = [
    { x: -8, y: 12, z: -10, speed: 0.15 },
    { x: 5, y: 14, z: -12, speed: 0.1 },
    { x: 12, y: 11, z: -8, speed: 0.18 },
  ];

  cloudConfigs.forEach((cfg) => {
    const cloud = createCloud();
    cloud.position.set(cfg.x, cfg.y, cfg.z);
    cloud.scale.set(1.5, 1.0, 1.2);
    cloud.userData.speed = cfg.speed;
    scene.add(cloud);
    clouds.push(cloud);
  });

  const manholeMat = new THREE.MeshStandardMaterial({
    color: 0x333333,
    metalness: 0.4,
    roughness: 0.6,
  });
  const manholePositions = [
    { x: -5, z: 1.0 },
    { x: 3, z: -3.0 },
    { x: -8, z: -5.0 },
  ];
  manholePositions.forEach((pos) => {
    const cover = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.02, 0.6),
      manholeMat
    );
    cover.position.set(pos.x, 0.01, pos.z);
    const cross1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.025, 0.06),
      manholeMat
    );
    cross1.position.set(pos.x, 0.02, pos.z);
    const cross2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.025, 0.5),
      manholeMat
    );
    cross2.position.set(pos.x, 0.02, pos.z);
    scene.add(cover, cross1, cross2);
  });

  return { scene, camera, renderer, clouds, finishTrophy, multiplierSigns };
}

export function updateScene(
  elements: SceneElements,
  time: number,
  delta: number
): void {
  elements.clouds.forEach((cloud) => {
    cloud.position.x += (cloud.userData.speed as number) * delta;
    if (cloud.position.x > 20) {
      cloud.position.x = -20;
    }
  });

  const trophy = elements.finishTrophy;
  const scale = 1.0 + Math.sin(time * 2.5) * 0.05;
  trophy.scale.set(scale, scale, scale);
  trophy.rotation.y = Math.sin(time * 0.8) * 0.2;
}

export function updateMultiplierSigns(
  elements: SceneElements,
  multipliers: string[]
): void {
  elements.multiplierSigns.forEach((sign, i) => {
    if (i >= multipliers.length) return;
    const text = multipliers[i];
    const canvasEl = sign.userData.canvas as HTMLCanvasElement | undefined;
    const texture = sign.userData.texture as THREE.CanvasTexture | undefined;
    if (!canvasEl || !texture) return;

    const ctx = canvasEl.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#1A5C2A';
      ctx.fillRect(0, 0, 128, 64);
      ctx.fillStyle = '#00FF88';
      ctx.font = 'bold 28px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 64, 32);
      texture.needsUpdate = true;
    }
  });
}

export function resizeScene(
  elements: SceneElements,
  width: number,
  height: number
): void {
  const aspect = width / height;
  const frustumSize = 18;
  elements.camera.left = (-frustumSize * aspect) / 2;
  elements.camera.right = (frustumSize * aspect) / 2;
  elements.camera.top = frustumSize / 2;
  elements.camera.bottom = -frustumSize / 2;
  elements.camera.updateProjectionMatrix();
  elements.renderer.setSize(width, height);
}
