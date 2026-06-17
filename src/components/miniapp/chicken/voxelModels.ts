import * as THREE from 'three';

const voxelMat = (color: number, emissive = 0, emissiveIntensity = 0) => {
  const m = new THREE.MeshLambertMaterial({ color, emissive, emissiveIntensity });
  return m;
};

function box(w: number, h: number, d: number, color: number, emissive = 0, ei = 0): THREE.Mesh {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, voxelMat(color, emissive, ei));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createChicken(): THREE.Group {
  const g = new THREE.Group();

  // Body — bright yellow-white, cartoon chunky
  const body = box(0.72, 0.62, 0.78, 0xFFF176);
  body.position.set(0, 0.48, 0);
  g.add(body);

  // Belly patch — lighter center
  const belly = box(0.4, 0.38, 0.1, 0xFFFDE7);
  belly.position.set(0, 0.44, 0.39);
  g.add(belly);

  // Head — big, round
  const head = box(0.52, 0.52, 0.52, 0xFFF176);
  head.position.set(0, 0.98, 0.28);
  g.add(head);

  // Beak — bright orange
  const beak = box(0.18, 0.13, 0.18, 0xFF8F00);
  beak.position.set(0, 0.92, 0.58);
  g.add(beak);

  // Comb — big bright red
  const comb1 = box(0.1, 0.24, 0.14, 0xFF1744);
  comb1.position.set(0, 1.27, 0.24);
  g.add(comb1);
  const comb2 = box(0.08, 0.18, 0.1, 0xFF1744);
  comb2.position.set(0.1, 1.22, 0.18);
  g.add(comb2);
  const comb3 = box(0.08, 0.18, 0.1, 0xFF1744);
  comb3.position.set(-0.1, 1.22, 0.18);
  g.add(comb3);

  // Wattle — red chin
  const wattle = box(0.08, 0.14, 0.08, 0xFF1744);
  wattle.position.set(0, 0.76, 0.54);
  g.add(wattle);

  // Eyes — large white with black pupil
  const eyeWhiteL = box(0.12, 0.12, 0.06, 0xFFFFFF);
  eyeWhiteL.position.set(-0.2, 1.04, 0.54);
  g.add(eyeWhiteL);
  const eyeWhiteR = box(0.12, 0.12, 0.06, 0xFFFFFF);
  eyeWhiteR.position.set(0.2, 1.04, 0.54);
  g.add(eyeWhiteR);
  const pupilL = box(0.06, 0.07, 0.04, 0x111111);
  pupilL.position.set(-0.2, 1.03, 0.57);
  g.add(pupilL);
  const pupilR = box(0.06, 0.07, 0.04, 0x111111);
  pupilR.position.set(0.2, 1.03, 0.57);
  g.add(pupilR);
  // Eye shine
  const shineL = box(0.025, 0.025, 0.04, 0xFFFFFF);
  shineL.position.set(-0.17, 1.05, 0.58);
  g.add(shineL);
  const shineR = box(0.025, 0.025, 0.04, 0xFFFFFF);
  shineR.position.set(0.23, 1.05, 0.58);
  g.add(shineR);

  // Wings — bright yellow with orange tips
  const wingL = box(0.14, 0.42, 0.54, 0xFFD54F);
  wingL.position.set(-0.44, 0.52, -0.04);
  g.add(wingL);
  const wingTipL = box(0.1, 0.12, 0.3, 0xFF8F00);
  wingTipL.position.set(-0.44, 0.26, 0.06);
  g.add(wingTipL);
  const wingR = box(0.14, 0.42, 0.54, 0xFFD54F);
  wingR.position.set(0.44, 0.52, -0.04);
  g.add(wingR);
  const wingTipR = box(0.1, 0.12, 0.3, 0xFF8F00);
  wingTipR.position.set(0.44, 0.26, 0.06);
  g.add(wingTipR);

  // Tail feathers — colorful
  const tail = box(0.24, 0.42, 0.16, 0xFF8F00);
  tail.position.set(0, 0.78, -0.46);
  tail.rotation.x = -0.28;
  g.add(tail);
  const tailL = box(0.12, 0.32, 0.12, 0xFF1744);
  tailL.position.set(-0.14, 0.72, -0.5);
  tailL.rotation.x = -0.35;
  g.add(tailL);
  const tailR = box(0.12, 0.32, 0.12, 0xFFD54F);
  tailR.position.set(0.14, 0.72, -0.5);
  tailR.rotation.x = -0.35;
  g.add(tailR);

  // Legs — orange
  const legL = box(0.1, 0.24, 0.1, 0xFF8F00);
  legL.position.set(-0.18, 0.12, 0);
  g.add(legL);
  const legR = box(0.1, 0.24, 0.1, 0xFF8F00);
  legR.position.set(0.18, 0.12, 0);
  g.add(legR);

  // Feet — big cartoon feet
  const footL = box(0.16, 0.05, 0.22, 0xFF8F00);
  footL.position.set(-0.18, 0.02, 0.05);
  g.add(footL);
  const footR = box(0.16, 0.05, 0.22, 0xFF8F00);
  footR.position.set(0.18, 0.02, 0.05);
  g.add(footR);

  g.scale.set(1.15, 1.15, 1.15);
  return g;
}

const CAR_COLORS = [
  0xFF3D00, 0x2979FF, 0xFFD600, 0x00E676, 0xFF6D00,
  0xD500F9, 0x00BCD4, 0xFF4081, 0x76FF03, 0xFF6E40,
  0x651FFF, 0x00E5FF, 0xF50057, 0x69F0AE, 0xFFAB40,
];

function darken(color: number, amount: number): number {
  const r = Math.max(0, ((color >> 16) & 0xff) * (1 - amount)) | 0;
  const g = Math.max(0, ((color >> 8) & 0xff) * (1 - amount)) | 0;
  const b = Math.max(0, (color & 0xff) * (1 - amount)) | 0;
  return (r << 16) | (g << 8) | b;
}

export function createCar(colorIndex?: number): THREE.Group {
  const car = new THREE.Group();
  const color = CAR_COLORS[colorIndex ?? Math.floor(Math.random() * CAR_COLORS.length)];
  const dark = darken(color, 0.2);

  const bodyLow = box(1.9, 0.48, 0.95, color);
  bodyLow.position.set(0, 0.34, 0);
  car.add(bodyLow);

  const cabin = box(1.05, 0.44, 0.8, dark);
  cabin.position.set(-0.08, 0.74, 0);
  car.add(cabin);

  const windshield = box(0.05, 0.34, 0.68, 0xB3E5FC);
  windshield.position.set(0.44, 0.74, 0);
  car.add(windshield);

  const rearWin = box(0.05, 0.28, 0.62, 0xB3E5FC);
  rearWin.position.set(-0.64, 0.74, 0);
  car.add(rearWin);

  // Headlights — emissive
  const hlL = box(0.05, 0.13, 0.16, 0xFFFDE7, 0xFFFF00, 0.8);
  hlL.position.set(0.96, 0.34, 0.28); car.add(hlL);
  const hlR = box(0.05, 0.13, 0.16, 0xFFFDE7, 0xFFFF00, 0.8);
  hlR.position.set(0.96, 0.34, -0.28); car.add(hlR);

  // Tail lights
  const tlL = box(0.05, 0.1, 0.13, 0xFF1744, 0xFF0000, 0.6);
  tlL.position.set(-0.97, 0.34, 0.28); car.add(tlL);
  const tlR = box(0.05, 0.1, 0.13, 0xFF1744, 0xFF0000, 0.6);
  tlR.position.set(-0.97, 0.34, -0.28); car.add(tlR);

  const wheelGeo = new THREE.BoxGeometry(0.3, 0.3, 0.16);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x212121 });
  const hubMat = new THREE.MeshLambertMaterial({ color: 0xBDBDBD });
  ([
    [0.57, 0.15, 0.52],
    [0.57, 0.15, -0.52],
    [-0.57, 0.15, 0.52],
    [-0.57, 0.15, -0.52],
  ] as [number, number, number][]).forEach(([x, y, z]) => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(x, y, z); w.castShadow = true; car.add(w);
    const hub = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.14), hubMat);
    hub.position.set(x, y, z); car.add(hub);
  });

  return car;
}

export function createTruck(colorIndex?: number): THREE.Group {
  const truck = new THREE.Group();
  const color = CAR_COLORS[colorIndex ?? Math.floor(Math.random() * CAR_COLORS.length)];
  const dark = darken(color, 0.22);

  const bed = box(2.7, 0.88, 1.15, color);
  bed.position.set(-0.2, 0.54, 0);
  truck.add(bed);

  const cabin = box(0.98, 0.78, 1.05, dark);
  cabin.position.set(1.12, 0.74, 0);
  truck.add(cabin);

  const ws = box(0.05, 0.58, 0.9, 0xB3E5FC);
  ws.position.set(1.62, 0.8, 0);
  truck.add(ws);

  const hlL = box(0.05, 0.16, 0.22, 0xFFFDE7, 0xFFFF00, 0.8);
  hlL.position.set(1.64, 0.5, 0.34); truck.add(hlL);
  const hlR = box(0.05, 0.16, 0.22, 0xFFFDE7, 0xFFFF00, 0.8);
  hlR.position.set(1.64, 0.5, -0.34); truck.add(hlR);

  const tlL = box(0.05, 0.13, 0.16, 0xFF1744, 0xFF0000, 0.6);
  tlL.position.set(-1.56, 0.5, 0.38); truck.add(tlL);
  const tlR = box(0.05, 0.13, 0.16, 0xFF1744, 0xFF0000, 0.6);
  tlR.position.set(-1.56, 0.5, -0.38); truck.add(tlR);

  const wheelGeo = new THREE.BoxGeometry(0.4, 0.4, 0.22);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x212121 });
  ([
    [1.0, 0.2, 0.65],
    [1.0, 0.2, -0.65],
    [-0.9, 0.2, 0.65],
    [-0.9, 0.2, -0.65],
  ] as [number, number, number][]).forEach(([x, y, z]) => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.position.set(x, y, z); w.castShadow = true; truck.add(w);
  });

  return truck;
}

export function createTree(): THREE.Group {
  const tree = new THREE.Group();
  const trunk = box(0.28, 1.1, 0.28, 0x5D4037);
  trunk.position.set(0, 0.55, 0);
  tree.add(trunk);
  const greens = [0x2E7D32, 0x388E3C, 0x43A047, 0x4CAF50];
  [{ y: 1.4, s: 1.3 }, { y: 1.85, s: 1.05 }, { y: 2.22, s: 0.72 }, { y: 2.5, s: 0.42 }].forEach((l, i) => {
    const f = box(l.s, 0.52, l.s, greens[i]);
    f.position.set(0, l.y, 0); f.castShadow = true;
    tree.add(f);
  });
  return tree;
}

export function createBush(): THREE.Group {
  const bush = new THREE.Group();
  const sizes = [0.58, 0.48, 0.44];
  const offsets: [number, number, number][] = [[0, 0.28, 0], [0.22, 0.24, 0.16], [-0.16, 0.22, -0.1]];
  const greens = [0x2E7D32, 0x388E3C, 0x43A047];
  sizes.forEach((s, i) => {
    const b = box(s, s * 0.82, s, greens[i]);
    b.position.set(offsets[i][0], offsets[i][1], offsets[i][2]);
    bush.add(b);
  });
  return bush;
}

export function createLampPost(): THREE.Group {
  const lamp = new THREE.Group();
  const pole = box(0.1, 2.2, 0.1, 0x757575);
  pole.position.set(0, 1.1, 0);
  lamp.add(pole);
  const arm = box(0.6, 0.08, 0.08, 0x757575);
  arm.position.set(0.3, 2.2, 0);
  lamp.add(arm);
  const head = box(0.22, 0.14, 0.22, 0xFFF9C4, 0xFFFF00, 1.0);
  head.position.set(0.6, 2.2, 0);
  lamp.add(head);
  return lamp;
}

export function createExplosionParticles(position: THREE.Vector3): THREE.Group {
  const group = new THREE.Group();
  const colors = [0xFF6D00, 0xFF3D00, 0xFFD600, 0xFFFFFF, 0xFF1744, 0xE91E63];
  for (let i = 0; i < 36; i++) {
    const size = 0.09 + Math.random() * 0.22;
    const p = box(size, size, size, colors[i % colors.length]);
    p.position.copy(position);
    p.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.44,
      Math.random() * 0.35 + 0.1,
      (Math.random() - 0.5) * 0.44
    );
    p.userData.life = 1.0;
    p.userData.decay = 0.012 + Math.random() * 0.018;
    group.add(p);
  }
  // White feathers
  for (let i = 0; i < 18; i++) {
    const size = 0.05 + Math.random() * 0.12;
    const f = box(size, size * 0.28, size * 2.2, 0xFFF9C4);
    f.position.copy(position);
    f.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.3,
      Math.random() * 0.22 + 0.14,
      (Math.random() - 0.5) * 0.3
    );
    f.userData.life = 1.0;
    f.userData.decay = 0.007 + Math.random() * 0.01;
    f.userData.rotSpeed = (Math.random() - 0.5) * 0.35;
    group.add(f);
  }
  return group;
}

export function updateExplosion(group: THREE.Group, delta: number): boolean {
  let alive = false;
  group.children.forEach(p => {
    const vel = p.userData.velocity as THREE.Vector3;
    if (!vel) return;
    p.position.add(vel.clone().multiplyScalar(delta * 60));
    vel.y -= 0.009 * delta * 60;
    p.userData.life -= p.userData.decay * delta * 60;
    if (p.userData.life > 0) {
      alive = true;
      p.scale.setScalar(p.userData.life);
      if (p.userData.rotSpeed) {
        p.rotation.z += p.userData.rotSpeed * delta * 60;
        p.rotation.x += p.userData.rotSpeed * 0.5 * delta * 60;
      }
    } else {
      p.visible = false;
    }
  });
  return alive;
}
