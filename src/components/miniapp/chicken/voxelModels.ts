// voxelModels.ts — Chicken Road TonCipher
// Livré par l'IA 3D, validé par Claude.ai

import * as THREE from 'three';

function voxelMat(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.1,
    roughness: 0.75,
  });
}

function glassMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x88ccff,
    metalness: 0.0,
    roughness: 0.0,
    transparent: true,
    opacity: 0.7,
  });
}

function addBox(
  parent: THREE.Group,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  mat: THREE.MeshStandardMaterial,
  castShadow = true
): THREE.Mesh {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export interface ChickenParts {
  body: THREE.Mesh;
  head: THREE.Group;
  wingL: THREE.Mesh;
  wingR: THREE.Mesh;
  legL: THREE.Group;
  legR: THREE.Group;
  tail: THREE.Group;
}

export function createChicken(): THREE.Group {
  const chicken = new THREE.Group();
  const parts: ChickenParts = {} as ChickenParts;

  const whiteMat = voxelMat(0xffffff);
  const wingMat = voxelMat(0xe5e5e5);
  const crestMat = voxelMat(0xef4444);
  const beakMat = voxelMat(0xf97316);
  const legMat = voxelMat(0xf97316);
  const eyeMat = voxelMat(0x111111);
  const eyeWhiteMat = voxelMat(0xffffff);

  const body = addBox(chicken, 0.7, 0.65, 0.55, 0, 0.55, 0, whiteMat);
  parts.body = body;

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.1, -0.05);
  chicken.add(headGroup);
  parts.head = headGroup;

  addBox(headGroup, 0.5, 0.45, 0.45, 0, 0, 0, whiteMat);

  addBox(headGroup, 0.15, 0.18, 0.12, -0.1, 0.3, -0.05, crestMat);
  addBox(headGroup, 0.15, 0.22, 0.12, 0.05, 0.32, -0.05, crestMat);
  addBox(headGroup, 0.15, 0.16, 0.12, 0.18, 0.28, -0.05, crestMat);

  addBox(headGroup, 0.18, 0.1, 0.15, 0, -0.05, -0.28, beakMat);
  addBox(headGroup, 0.1, 0.1, 0.08, 0, -0.15, -0.25, crestMat);

  addBox(headGroup, 0.1, 0.1, 0.04, -0.18, 0.06, -0.19, eyeWhiteMat, false);
  addBox(headGroup, 0.1, 0.1, 0.04, 0.18, 0.06, -0.19, eyeWhiteMat, false);
  addBox(headGroup, 0.08, 0.08, 0.05, -0.18, 0.06, -0.2, eyeMat, false);
  addBox(headGroup, 0.08, 0.08, 0.05, 0.18, 0.06, -0.2, eyeMat, false);

  const wingL = addBox(chicken, 0.12, 0.45, 0.35, -0.42, 0.6, 0, wingMat);
  parts.wingL = wingL;
  const wingR = addBox(chicken, 0.12, 0.45, 0.35, 0.42, 0.6, 0, wingMat);
  parts.wingR = wingR;

  const legL = new THREE.Group();
  legL.position.set(-0.15, 0.15, 0);
  chicken.add(legL);
  parts.legL = legL;
  addBox(legL, 0.08, 0.22, 0.08, 0, 0, 0, legMat);
  addBox(legL, 0.18, 0.05, 0.15, 0, -0.12, -0.04, legMat);

  const legR = new THREE.Group();
  legR.position.set(0.15, 0.15, 0);
  chicken.add(legR);
  parts.legR = legR;
  addBox(legR, 0.08, 0.22, 0.08, 0, 0, 0, legMat);
  addBox(legR, 0.18, 0.05, 0.15, 0, -0.12, -0.04, legMat);

  const tail = new THREE.Group();
  tail.position.set(0, 0.75, 0.32);
  chicken.add(tail);
  parts.tail = tail;

  const tailFeather1 = addBox(tail, 0.06, 0.25, 0.06, 0, 0.1, 0, whiteMat);
  tailFeather1.rotation.x = -0.3;
  const tailFeather2 = addBox(tail, 0.06, 0.2, 0.06, -0.1, 0.06, 0.02, whiteMat);
  tailFeather2.rotation.x = -0.25;
  tailFeather2.rotation.z = 0.15;
  const tailFeather3 = addBox(tail, 0.06, 0.2, 0.06, 0.1, 0.06, 0.02, whiteMat);
  tailFeather3.rotation.x = -0.25;
  tailFeather3.rotation.z = -0.15;

  chicken.scale.set(1.2, 1.2, 1.2);
  chicken.userData.parts = parts;

  return chicken;
}

export const JUMP_FRAMES: number[][] = [
  [1.0, 1.0, 1.0, 0.0, 0.0],
  [1.3, 0.7, 1.0, 0.0, 0.05],
  [0.8, 1.4, 0.8, 0.45, -0.15],
  [0.85, 1.25, 0.85, 0.95, -0.2],
  [0.9, 1.15, 0.9, 1.2, -0.1],
  [0.88, 1.05, 0.88, 0.85, 0.05],
  [1.2, 0.75, 1.2, 0.25, 0.1],
  [1.4, 0.6, 1.4, 0.0, 0.05],
];

export const JUMP_DURATION = 0.38;

export function getJumpFrame(t: number): {
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  posY: number;
  rotX: number;
} {
  const totalFrames = JUMP_FRAMES.length;
  const progress = Math.max(0, Math.min(1, t));
  const frameFloat = progress * (totalFrames - 1);
  const frameA = Math.floor(frameFloat);
  const frameB = Math.min(frameA + 1, totalFrames - 1);
  const lerp = frameFloat - frameA;

  const a = JUMP_FRAMES[frameA];
  const b = JUMP_FRAMES[frameB];

  return {
    scaleX: a[0] + (b[0] - a[0]) * lerp,
    scaleY: a[1] + (b[1] - a[1]) * lerp,
    scaleZ: a[2] + (b[2] - a[2]) * lerp,
    posY: a[3] + (b[3] - a[3]) * lerp,
    rotX: a[4] + (b[4] - a[4]) * lerp,
  };
}

export function animateChickenIdle(chicken: THREE.Group, time: number): void {
  const parts = chicken.userData.parts as ChickenParts | undefined;
  if (!parts) return;

  const baseY = (chicken.userData.baseY as number) ?? 0;
  chicken.position.y = baseY + Math.sin(time * 2.2) * 0.05;

  parts.head.rotation.y = Math.sin(time * 1.2) * 0.22;

  parts.wingL.rotation.z = Math.sin(time * 1.8) * 0.05;
  parts.wingR.rotation.z = -Math.sin(time * 1.8) * 0.05;
}

export function animateChickenJump(
  chicken: THREE.Group,
  jumpProgress: number,
  time: number
): void {
  const parts = chicken.userData.parts as ChickenParts | undefined;
  if (!parts) return;

  const frame = getJumpFrame(jumpProgress);
  const baseY = (chicken.userData.baseY as number) ?? 0;

  chicken.scale.set(1.2 * frame.scaleX, 1.2 * frame.scaleY, 1.2 * frame.scaleZ);
  chicken.position.y = baseY + frame.posY;
  chicken.rotation.x = frame.rotX;

  const wingFlap = Math.sin(time * Math.PI * 4) * 0.6;
  parts.wingL.rotation.z = wingFlap;
  parts.wingR.rotation.z = -wingFlap;
}

export function animateChickenVictory(
  chicken: THREE.Group,
  time: number,
  delta: number
): void {
  const parts = chicken.userData.parts as ChickenParts | undefined;
  if (!parts) return;

  const baseY = (chicken.userData.baseY as number) ?? 0;
  chicken.position.y = baseY + Math.abs(Math.sin(time * 7)) * 0.6;
  chicken.rotation.y += delta * 4;

  parts.wingL.rotation.z = Math.sin(time * 12) * 0.8;
  parts.wingR.rotation.z = -Math.sin(time * 12) * 0.8;
}

export function resetChickenTransform(chicken: THREE.Group): void {
  chicken.scale.set(1.2, 1.2, 1.2);
  chicken.rotation.set(0, 0, 0);

  const parts = chicken.userData.parts as ChickenParts | undefined;
  if (parts) {
    parts.head.rotation.y = 0;
    parts.wingL.rotation.z = 0;
    parts.wingR.rotation.z = 0;
  }
}

const CAR_COLORS = [
  0xef4444, 0x3b82f6, 0x22c55e, 0xf59e0b, 0x8b5cf6, 0xec4899, 0x06b6d4,
  0xff6b35,
];

export function createCar(colorIndex?: number): THREE.Group {
  const car = new THREE.Group();
  const idx =
    colorIndex !== undefined
      ? colorIndex % CAR_COLORS.length
      : Math.floor(Math.random() * CAR_COLORS.length);
  const color = CAR_COLORS[idx];
  const bodyMat = voxelMat(color);
  const darkMat = voxelMat(0x333333);
  const glass = glassMat();
  const hubMat = voxelMat(0xaaaaaa);

  addBox(car, 1.6, 0.35, 0.9, 0, 0.2, 0, bodyMat);
  addBox(car, 0.9, 0.35, 0.8, -0.1, 0.55, 0, bodyMat);

  addBox(car, 0.02, 0.28, 0.7, -0.56, 0.55, 0, glass, false);
  addBox(car, 0.02, 0.28, 0.7, 0.36, 0.55, 0, glass, false);

  addBox(car, 0.4, 0.22, 0.02, -0.1, 0.58, 0.41, glass, false);
  addBox(car, 0.4, 0.22, 0.02, -0.1, 0.58, -0.41, glass, false);

  const wheelPositions = [
    { x: -0.5, z: 0.42 },
    { x: -0.5, z: -0.42 },
    { x: 0.5, z: 0.42 },
    { x: 0.5, z: -0.42 },
  ];
  wheelPositions.forEach((wp) => {
    addBox(car, 0.25, 0.25, 0.12, wp.x, 0.12, wp.z, darkMat);
    addBox(car, 0.15, 0.15, 0.02, wp.x, 0.12, wp.z + (wp.z > 0 ? 0.07 : -0.07), hubMat, false);
  });

  const lightMat = voxelMat(0xffffaa);
  addBox(car, 0.05, 0.1, 0.15, -0.82, 0.22, 0.3, lightMat, false);
  addBox(car, 0.05, 0.1, 0.15, -0.82, 0.22, -0.3, lightMat, false);

  const tailMat = voxelMat(0xff2222);
  addBox(car, 0.05, 0.1, 0.15, 0.82, 0.22, 0.3, tailMat, false);
  addBox(car, 0.05, 0.1, 0.15, 0.82, 0.22, -0.3, tailMat, false);

  car.userData.width = 1.6;
  car.userData.vehicleType = 'car';

  return car;
}

export function createTruck(colorIndex?: number): THREE.Group {
  const truck = new THREE.Group();
  const truckColors = [0x2563eb, 0x059669, 0xd97706, 0x7c3aed, 0xdc2626];
  const idx =
    colorIndex !== undefined
      ? colorIndex % truckColors.length
      : Math.floor(Math.random() * truckColors.length);
  const color = truckColors[idx];
  const bodyMat = voxelMat(color);
  const cabinMat = voxelMat(0x444444);
  const darkMat = voxelMat(0x333333);
  const glass = glassMat();

  addBox(truck, 0.7, 0.65, 0.9, -0.85, 0.4, 0, cabinMat);
  addBox(truck, 0.02, 0.45, 0.75, -1.21, 0.45, 0, glass, false);
  addBox(truck, 0.65, 0.08, 0.85, -0.85, 0.75, 0, cabinMat);
  addBox(truck, 1.5, 0.8, 0.95, 0.35, 0.45, 0, bodyMat);
  addBox(truck, 1.45, 0.05, 0.9, 0.35, 0.87, 0, bodyMat);

  const wheelPositions = [
    { x: -0.85, z: 0.46 },
    { x: -0.85, z: -0.46 },
    { x: 0.2, z: 0.46 },
    { x: 0.2, z: -0.46 },
    { x: 0.7, z: 0.46 },
    { x: 0.7, z: -0.46 },
  ];
  wheelPositions.forEach((wp) => {
    addBox(truck, 0.3, 0.3, 0.12, wp.x, 0.15, wp.z, darkMat);
  });

  const lightMat = voxelMat(0xffffaa);
  addBox(truck, 0.05, 0.12, 0.15, -1.22, 0.25, 0.3, lightMat, false);
  addBox(truck, 0.05, 0.12, 0.15, -1.22, 0.25, -0.3, lightMat, false);

  const tailMat = voxelMat(0xff2222);
  addBox(truck, 0.05, 0.12, 0.15, 1.12, 0.25, 0.3, tailMat, false);
  addBox(truck, 0.05, 0.12, 0.15, 1.12, 0.25, -0.3, tailMat, false);

  truck.userData.width = 2.5;
  truck.userData.vehicleType = 'truck';

  return truck;
}

export function createBus(): THREE.Group {
  const bus = new THREE.Group();
  const bodyMat = voxelMat(0x2196f3);
  const darkMat = voxelMat(0x333333);
  const glass = glassMat();
  const roofMat = voxelMat(0x1565c0);
  const doorMat = voxelMat(0x1256a0);
  const signMat = voxelMat(0xff8800);

  addBox(bus, 3.2, 0.6, 0.95, 0, 0.35, 0, bodyMat);
  addBox(bus, 3.15, 0.08, 0.9, 0, 0.68, 0, roofMat);
  addBox(bus, 3.1, 0.25, 0.9, 0, 0.55, 0, bodyMat);

  const windowCount = 8;
  const windowSpacing = 3.0 / windowCount;
  for (let i = 0; i < windowCount; i++) {
    const xPos = -1.4 + i * windowSpacing;
    addBox(bus, 0.25, 0.2, 0.02, xPos, 0.5, 0.48, glass, false);
    addBox(bus, 0.25, 0.2, 0.02, xPos, 0.5, -0.48, glass, false);
  }

  addBox(bus, 0.02, 0.35, 0.8, -1.62, 0.48, 0, glass, false);
  addBox(bus, 0.02, 0.25, 0.6, 1.62, 0.48, 0, glass, false);

  const wheelPositions = [
    { x: -1.1, z: 0.48 },
    { x: -1.1, z: -0.48 },
    { x: 1.1, z: 0.48 },
    { x: 1.1, z: -0.48 },
  ];
  wheelPositions.forEach((wp) => {
    addBox(bus, 0.35, 0.35, 0.12, wp.x, 0.17, wp.z, darkMat);
  });

  const lightMat = voxelMat(0xffffaa);
  addBox(bus, 0.05, 0.12, 0.15, -1.63, 0.22, 0.35, lightMat, false);
  addBox(bus, 0.05, 0.12, 0.15, -1.63, 0.22, -0.35, lightMat, false);

  const tailMat = voxelMat(0xff2222);
  addBox(bus, 0.05, 0.15, 0.2, 1.63, 0.22, 0.32, tailMat, false);
  addBox(bus, 0.05, 0.15, 0.2, 1.63, 0.22, -0.32, tailMat, false);

  addBox(bus, 0.04, 0.15, 0.4, -1.63, 0.62, 0, signMat, false);
  addBox(bus, 0.35, 0.55, 0.02, -0.6, 0.35, 0.49, doorMat, false);
  addBox(bus, 0.35, 0.55, 0.02, 0.5, 0.35, 0.49, doorMat, false);

  bus.userData.width = 3.2;
  bus.userData.vehicleType = 'bus';

  return bus;
}

export function createTaxi(): THREE.Group {
  const taxi = new THREE.Group();
  const bodyMat = voxelMat(0xffd600);
  const darkMat = voxelMat(0x333333);
  const glass = glassMat();
  const hubMat = voxelMat(0xaaaaaa);
  const stripeMat = voxelMat(0x222222);

  addBox(taxi, 1.6, 0.35, 0.9, 0, 0.2, 0, bodyMat);
  addBox(taxi, 0.9, 0.35, 0.8, -0.1, 0.55, 0, bodyMat);

  addBox(taxi, 0.02, 0.28, 0.7, -0.56, 0.55, 0, glass, false);
  addBox(taxi, 0.02, 0.28, 0.7, 0.36, 0.55, 0, glass, false);

  addBox(taxi, 0.4, 0.22, 0.02, -0.1, 0.58, 0.41, glass, false);
  addBox(taxi, 0.4, 0.22, 0.02, -0.1, 0.58, -0.41, glass, false);

  const wheelPositions = [
    { x: -0.5, z: 0.42 },
    { x: -0.5, z: -0.42 },
    { x: 0.5, z: 0.42 },
    { x: 0.5, z: -0.42 },
  ];
  wheelPositions.forEach((wp) => {
    addBox(taxi, 0.25, 0.25, 0.12, wp.x, 0.12, wp.z, darkMat);
    addBox(taxi, 0.15, 0.15, 0.02, wp.x, 0.12, wp.z + (wp.z > 0 ? 0.07 : -0.07), hubMat, false);
  });

  const lightMat = voxelMat(0xffffaa);
  addBox(taxi, 0.05, 0.1, 0.15, -0.82, 0.22, 0.3, lightMat, false);
  addBox(taxi, 0.05, 0.1, 0.15, -0.82, 0.22, -0.3, lightMat, false);

  const tailMat = voxelMat(0xff2222);
  addBox(taxi, 0.05, 0.1, 0.15, 0.82, 0.22, 0.3, tailMat, false);
  addBox(taxi, 0.05, 0.1, 0.15, 0.82, 0.22, -0.3, tailMat, false);

  const taxiSignBase = voxelMat(0xffffff);
  addBox(taxi, 0.35, 0.12, 0.2, -0.1, 0.78, 0, taxiSignBase, false);

  const taxiTextMat = voxelMat(0x222222);
  addBox(taxi, 0.06, 0.06, 0.02, -0.22, 0.8, -0.11, taxiTextMat, false);
  addBox(taxi, 0.06, 0.06, 0.02, -0.14, 0.8, -0.11, taxiTextMat, false);
  addBox(taxi, 0.06, 0.06, 0.02, -0.06, 0.8, -0.11, taxiTextMat, false);
  addBox(taxi, 0.06, 0.06, 0.02, 0.02, 0.8, -0.11, taxiTextMat, false);

  const signLight = new THREE.PointLight(0xffdd00, 0.5, 1.5);
  signLight.position.set(-0.1, 0.9, 0);
  taxi.add(signLight);

  addBox(taxi, 1.55, 0.06, 0.02, 0, 0.28, 0.46, stripeMat, false);
  addBox(taxi, 1.55, 0.06, 0.02, 0, 0.28, -0.46, stripeMat, false);

  taxi.userData.width = 1.6;
  taxi.userData.vehicleType = 'taxi';

  return taxi;
}

export function createGoldenEgg(): THREE.Group {
  const group = new THREE.Group();

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    metalness: 0.7,
    roughness: 0.2,
    emissive: new THREE.Color(0xffaa00),
    emissiveIntensity: 0.15,
  });

  const layers = [
    { y: 0.0, r: 0.18 },
    { y: 0.1, r: 0.25 },
    { y: 0.2, r: 0.3 },
    { y: 0.3, r: 0.32 },
    { y: 0.4, r: 0.3 },
    { y: 0.5, r: 0.26 },
    { y: 0.6, r: 0.2 },
    { y: 0.7, r: 0.13 },
    { y: 0.8, r: 0.06 },
  ];

  layers.forEach((l) => {
    const size = l.r * 2;
    const box = new THREE.Mesh(new THREE.BoxGeometry(size, 0.1, size), goldMat);
    box.position.y = l.y;
    box.castShadow = true;
    group.add(box);
  });

  const glow = new THREE.PointLight(0xffd700, 2.0, 1.5);
  glow.position.set(0, 0.4, 0);
  group.add(glow);

  const starMat = new THREE.MeshStandardMaterial({
    color: 0xffff44,
    metalness: 0.3,
    roughness: 0.2,
    emissive: new THREE.Color(0xffff00),
    emissiveIntensity: 0.5,
  });

  for (let i = 0; i < 4; i++) {
    const star = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), starMat);
    star.userData.orbitAngle = (i / 4) * Math.PI * 2;
    star.userData.orbitRadius = 0.5;
    star.userData.orbitSpeed = 2.5 + i * 0.3;
    star.userData.isStar = true;
    group.add(star);
  }

  group.userData.isGoldenEgg = true;

  return group;
}

export function updateGoldenEgg(egg: THREE.Group, time: number): void {
  egg.position.y = 0.5 + Math.sin(time * 3) * 0.08;
  egg.rotation.y += 0.02;

  egg.children.forEach((child) => {
    if (child.userData.isStar) {
      const angle = (child.userData.orbitAngle as number) + time * (child.userData.orbitSpeed as number);
      const r = child.userData.orbitRadius as number;
      child.position.x = Math.cos(angle) * r;
      child.position.z = Math.sin(angle) * r;
      child.position.y = 0.4 + Math.sin(time * 4 + (child.userData.orbitAngle as number)) * 0.1;
      child.rotation.y = time * 3;
      child.rotation.x = time * 2;
    }
  });
}

export function createExplosionParticles(position: THREE.Vector3): THREE.Group {
  const group = new THREE.Group();

  const fireColors = [0xff4500, 0xff6600, 0xffaa00, 0xffdd00, 0xff2200];

  for (let i = 0; i < 30; i++) {
    const color = fireColors[Math.floor(Math.random() * fireColors.length)];
    const mat = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.0,
      roughness: 0.5,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 1.0,
    });

    const size = 0.08 + Math.random() * 0.12;
    const particle = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), mat);
    particle.position.copy(position);
    particle.userData.vx = (Math.random() - 0.5) * 6;
    particle.userData.vy = 2 + Math.random() * 5;
    particle.userData.vz = (Math.random() - 0.5) * 6;
    particle.userData.decay = 0.008;
    particle.userData.isFeather = false;
    particle.userData.rotSpeed = {
      x: (Math.random() - 0.5) * 8,
      y: (Math.random() - 0.5) * 8,
      z: (Math.random() - 0.5) * 8,
    };
    group.add(particle);
  }

  for (let i = 0; i < 18; i++) {
    const size = 0.06 + Math.random() * 0.06;
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.1,
      roughness: 0.75,
      transparent: true,
      opacity: 1.0,
    });
    const feather = new THREE.Mesh(new THREE.BoxGeometry(size, size * 0.3, size * 1.5), mat);
    feather.position.copy(position);
    feather.userData.vx = (Math.random() - 0.5) * 3;
    feather.userData.vy = 1.5 + Math.random() * 3;
    feather.userData.vz = (Math.random() - 0.5) * 3;
    feather.userData.decay = 0.004;
    feather.userData.isFeather = true;
    feather.userData.rotSpeed = {
      x: (Math.random() - 0.5) * 4,
      y: (Math.random() - 0.5) * 4,
      z: (Math.random() - 0.5) * 4,
    };
    group.add(feather);
  }

  return group;
}

export function updateExplosion(group: THREE.Group, delta: number): boolean {
  let allDead = true;

  group.children.forEach((particle) => {
    const mat = (particle as THREE.Mesh).material as THREE.MeshStandardMaterial;
    if (mat.opacity <= 0) return;

    allDead = false;

    particle.position.x += (particle.userData.vx as number) * delta;
    particle.position.y += (particle.userData.vy as number) * delta;
    particle.position.z += (particle.userData.vz as number) * delta;

    const grav = (particle.userData.isFeather as boolean) ? 0.003 : 0.008;
    (particle.userData.vy as number) -= grav * 60 * delta;

    if (particle.userData.isFeather as boolean) {
      (particle.userData.vx as number) *= 0.995;
      (particle.userData.vz as number) *= 0.995;
      (particle.userData.vx as number) += Math.sin(particle.position.y * 5) * 0.02;
    }

    const rs = particle.userData.rotSpeed as { x: number; y: number; z: number };
    particle.rotation.x += rs.x * delta;
    particle.rotation.y += rs.y * delta;
    particle.rotation.z += rs.z * delta;

    mat.opacity -= (particle.userData.decay as number) * 60 * delta;
    if (mat.opacity < 0) mat.opacity = 0;

    particle.scale.multiplyScalar(0.998);
  });

  return allDead;
}

export function createTree(): THREE.Group {
  const tree = new THREE.Group();

  const trunkMat = voxelMat(0x8b5e3c);
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.3), trunkMat);
  trunk.position.y = 0.4;
  trunk.castShadow = true;
  tree.add(trunk);

  const leafMat = voxelMat(0x3da33d);
  const layers = [
    { y: 1.0, size: 1.0 },
    { y: 1.4, size: 0.75 },
    { y: 1.7, size: 0.5 },
  ];
  layers.forEach((l) => {
    const foliage = new THREE.Mesh(new THREE.BoxGeometry(l.size, 0.4, l.size), leafMat);
    foliage.position.y = l.y;
    foliage.castShadow = true;
    tree.add(foliage);
  });

  return tree;
}

export function spawnVehicle(laneIndex: number): THREE.Group {
  if (laneIndex === 3) {
    return Math.random() < 0.5 ? createTruck() : createBus();
  }
  const r = Math.random();
  if (r < 0.55) return createCar();
  if (r < 0.75) return createTruck();
  if (r < 0.9) return createTaxi();
  return createCar();
}
