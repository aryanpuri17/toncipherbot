import * as THREE from 'three';
import {
  createChicken, createCar, createTruck, createTree, createBush,
  createLampPost, createExplosionParticles, updateExplosion,
} from './voxelModels';
import { playCluck, playStep, playHonk, playCrash, playFanfare, playCoin, playDanger } from './audio';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'hardcore';
export type GameState = 'idle' | 'playing' | 'jumping' | 'dead' | 'won' | 'cashed_out';

interface Vehicle {
  mesh: THREE.Group;
  speed: number;
  lane: number;
  warningPlayed: boolean;
}

interface GameCallbacks {
  onStateChange:    (state: GameState) => void;
  onMultiplierChange: (mult: number) => void;
  onRowChange:      (row: number) => void;
  onAutoCashout?:   () => void; // triggered when auto-cashout target is reached
}

// ── RTP-based config ─────────────────────────────────────────────────────────
// mult[n] = CHICKEN_RTP / survivalProb^n
// Expected value of reaching lane n and cashing = mult[n] × survivalProb^n = CHICKEN_RTP ✓
const CHICKEN_RTP = 0.97;

export const DIFF_CONFIG: Record<Difficulty, {
  totalLanes:   number;
  survivalProb: number;  // per-lane survival probability
  baseSpeed:    number;
  carsPerLane:  number;
}> = {
  easy:     { totalLanes: 12, survivalProb: 0.86, baseSpeed: 2.5, carsPerLane: 2 },
  medium:   { totalLanes: 10, survivalProb: 0.76, baseSpeed: 4.2, carsPerLane: 3 },
  hard:     { totalLanes: 8,  survivalProb: 0.65, baseSpeed: 6.5, carsPerLane: 4 },
  hardcore: { totalLanes: 6,  survivalProb: 0.52, baseSpeed: 10.0, carsPerLane: 5 },
};

export function computeMultiplier(difficulty: Difficulty, lane: number): number {
  if (lane <= 0) return 1;
  const p = DIFF_CONFIG[difficulty].survivalProb;
  return Math.round(CHICKEN_RTP / Math.pow(p, lane) * 100) / 100;
}

const LANE_WIDTH = 2.2;
const ROAD_LENGTH = 18;

const COLORS = {
  road:      0x263238,
  lane:      0x37474F,
  stripe:    0xFFCC00,
  grass:     0x43A047,
  grassDark: 0x388E3C,
  sidewalk:  0x90A4AE,
  barrier:   0x00E676,
  barrierBg: 0x1B5E20,
};

// ── GameEngine class ──────────────────────────────────────────────────────────
export class GameEngine {
  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera;
  private renderer!: THREE.WebGLRenderer;

  private chicken!: THREE.Group;
  private chickenShadow!: THREE.Mesh;
  private vehicles: Vehicle[] = [];
  private barriers: THREE.Mesh[] = [];
  private multiplierSigns: THREE.Group[] = [];
  private explosion: THREE.Group | null = null;
  private decorations: THREE.Group[] = [];

  private state: GameState = 'idle';
  private difficulty: Difficulty = 'medium';
  private currentLane = -1;
  private multiplier = 1.0;
  private isJumping = false;
  private jumpProgress = 0;
  private jumpStartX = 0;
  private jumpEndX = 0;

  private animId = 0;
  private clock = new THREE.Clock();
  private callbacks: GameCallbacks;
  private disposed = false;
  private canvas: HTMLCanvasElement;
  private screenShake = 0;

  // Auto-cashout target (multiplier value, 0 = disabled)
  private autoCashoutTarget = 0;

  constructor(canvas: HTMLCanvasElement, callbacks: GameCallbacks) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.init();
  }

  private init() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB);
    this.scene.fog = new THREE.Fog(0x87CEEB, 45, 80);

    // Camera — orthographic isometric
    const aspect = (this.canvas.clientWidth || 390) / (this.canvas.clientHeight || 500);
    const fs = 22;
    this.camera = new THREE.OrthographicCamera(
      -fs * aspect / 2, fs * aspect / 2, fs / 2, -fs / 2, 0.1, 100
    );
    this.camera.position.set(12, 16, 8);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.canvas.clientWidth || 390, this.canvas.clientHeight || 500);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.animate();
  }

  // ── World ──────────────────────────────────────────────────────────────────

  private buildWorld() {
    this.scene.clear();
    this.multiplierSigns = [];
    this.barriers = [];
    this.decorations = [];
    this.vehicles = [];

    // Lights
    const ambient = new THREE.AmbientLight(0xFFFFFF, 0.65);
    this.scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xFFF8E1, 1.1);
    sun.position.set(8, 18, 10); sun.castShadow = true;
    sun.shadow.mapSize.width = 1024; sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.left = -25; sun.shadow.camera.right = 25;
    sun.shadow.camera.top = 20; sun.shadow.camera.bottom = -20;
    this.scene.add(sun);
    const hemi = new THREE.HemisphereLight(0x87CEEB, 0x388E3C, 0.35);
    this.scene.add(hemi);

    const cfg = DIFF_CONFIG[this.difficulty];
    const roadW = cfg.totalLanes * LANE_WIDTH;

    // Grass background
    const grassMesh = new THREE.Mesh(
      new THREE.BoxGeometry(70, 0.1, 70),
      new THREE.MeshLambertMaterial({ color: COLORS.grass })
    );
    grassMesh.position.set(roadW / 2, -0.1, 0);
    grassMesh.receiveShadow = true;
    this.scene.add(grassMesh);

    // Start sidewalk
    const startSW = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.18, ROAD_LENGTH + 6),
      new THREE.MeshLambertMaterial({ color: COLORS.sidewalk })
    );
    startSW.position.set(-2, 0.07, 0);
    startSW.receiveShadow = true;
    this.scene.add(startSW);

    // End sidewalk
    const endSW = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.18, ROAD_LENGTH + 6),
      new THREE.MeshLambertMaterial({ color: COLORS.sidewalk })
    );
    endSW.position.set(roadW + 2, 0.07, 0);
    endSW.receiveShadow = true;
    this.scene.add(endSW);

    // Road surface
    const road = new THREE.Mesh(
      new THREE.BoxGeometry(roadW, 0.12, ROAD_LENGTH + 2),
      new THREE.MeshLambertMaterial({ color: COLORS.road })
    );
    road.position.set(roadW / 2, 0.04, 0);
    road.receiveShadow = true;
    this.scene.add(road);

    // Lane dividers + dashes + multiplier signs
    for (let i = 0; i <= cfg.totalLanes; i++) {
      const x = i * LANE_WIDTH;
      const isEdge = i === 0 || i === cfg.totalLanes;
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.02, ROAD_LENGTH + 2),
        new THREE.MeshLambertMaterial({ color: isEdge ? 0xFFFFFF : COLORS.stripe })
      );
      stripe.position.set(x, 0.1, 0);
      this.scene.add(stripe);

      if (i < cfg.totalLanes) {
        // Center dashes
        for (let z = -ROAD_LENGTH / 2 + 0.4; z < ROAD_LENGTH / 2; z += 1.5) {
          const dash = new THREE.Mesh(
            new THREE.BoxGeometry(0.07, 0.02, 0.6),
            new THREE.MeshLambertMaterial({ color: 0x607D8B })
          );
          dash.position.set(x + LANE_WIDTH / 2, 0.08, z);
          this.scene.add(dash);
        }

        // Multiplier sign
        const mult = computeMultiplier(this.difficulty, i + 1);
        const sign = this.createMultiplierSign(mult, i);
        sign.position.set(x + LANE_WIDTH / 2, 0.01, -ROAD_LENGTH / 2 - 0.6);
        this.scene.add(sign);
        this.multiplierSigns.push(sign);
      }
    }

    // Decorations: trees, bushes, lamp posts on both sides
    const addDecoration = (x: number, z: number, type: 'tree' | 'bush' | 'lamp') => {
      const obj = type === 'tree' ? createTree() : type === 'bush' ? createBush() : createLampPost();
      obj.position.set(x, 0, z);
      this.scene.add(obj);
      this.decorations.push(obj as THREE.Group);
    };

    const zPositions = [-7, -5, -3, -1, 1, 3, 5, 7];
    zPositions.forEach((z, i) => {
      // Left of start sidewalk
      addDecoration(-4.5 + (Math.random() - 0.5) * 0.5, z + (Math.random() - 0.5) * 0.4,
        i % 3 === 0 ? 'tree' : i % 3 === 1 ? 'bush' : 'lamp');
      // Right of end sidewalk
      addDecoration(roadW + 4.5 + (Math.random() - 0.5) * 0.5, z + (Math.random() - 0.5) * 0.4,
        i % 3 === 1 ? 'tree' : i % 3 === 2 ? 'bush' : 'lamp');
    });

    // Vehicles
    this.createVehicles();
  }

  private createMultiplierSign(mult: number, _i: number): THREE.Group {
    const group = new THREE.Group();
    const color = mult < 1.5 ? 0x4CAF50 : mult < 3 ? 0xFFD600 : mult < 10 ? 0xFF6D00 : mult < 20 ? 0xFF1744 : 0xAA00FF;

    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(LANE_WIDTH - 0.28, 0.64, 0.16),
      new THREE.MeshLambertMaterial({ color })
    );
    panel.position.set(0, 0.36, 0);
    group.add(panel);

    const cvs = document.createElement('canvas');
    cvs.width = 128; cvs.height = 48;
    const ctx = cvs.getContext('2d')!;
    ctx.clearRect(0, 0, 128, 48);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = mult >= 1000 ? `×${(mult / 1000).toFixed(1)}k`
      : mult >= 100 ? `×${mult.toFixed(0)}`
      : mult >= 10 ? `×${mult.toFixed(1)}`
      : `×${mult.toFixed(2)}`;
    ctx.fillText(label, 64, 26);
    const tex = new THREE.CanvasTexture(cvs);
    const text = new THREE.Mesh(
      new THREE.PlaneGeometry(LANE_WIDTH - 0.38, 0.46),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    );
    text.position.set(0, 0.36, 0.085);
    group.add(text);

    return group;
  }

  private createVehicles() {
    this.vehicles = [];
    const cfg = DIFF_CONFIG[this.difficulty];

    for (let lane = 0; lane < cfg.totalLanes; lane++) {
      const x = lane * LANE_WIDTH + LANE_WIDTH / 2;
      const dir = lane % 2 === 0 ? 1 : -1;
      const laneSpeed = cfg.baseSpeed * (0.7 + Math.random() * 0.6);

      for (let i = 0; i < cfg.carsPerLane; i++) {
        const isTruck = Math.random() < 0.28;
        const mesh = isTruck ? createTruck() : createCar();
        const spacing = (ROAD_LENGTH + 10) / cfg.carsPerLane;
        const z = -ROAD_LENGTH / 2 - 5 + spacing * i + Math.random() * spacing * 0.4;
        mesh.position.set(x, 0, z);
        mesh.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        const speed = laneSpeed * (0.82 + Math.random() * 0.36) * dir;
        this.scene.add(mesh);
        this.vehicles.push({ mesh, speed, lane, warningPlayed: false });
      }
    }
  }

  private addBarrier(x: number) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.85, ROAD_LENGTH + 2),
      new THREE.MeshLambertMaterial({ color: COLORS.barrier, transparent: true, opacity: 0.5 })
    );
    bar.position.set(x - LANE_WIDTH / 2 - 0.08, 0.42, 0);
    this.scene.add(bar);
    this.barriers.push(bar);
  }

  private getLaneX(lane: number): number {
    if (lane < 0) return -1;
    const cfg = DIFF_CONFIG[this.difficulty];
    if (lane >= cfg.totalLanes) return cfg.totalLanes * LANE_WIDTH + 1;
    return lane * LANE_WIDTH + LANE_WIDTH / 2;
  }

  private updateCamera() {
    const cfg = DIFF_CONFIG[this.difficulty];
    const roadW = cfg.totalLanes * LANE_WIDTH;
    const cx = roadW / 2;
    this.camera.position.set(cx + 10, 17, 10);
    this.camera.lookAt(cx * 0.4, 0, 0);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  setDifficulty(d: Difficulty) { this.difficulty = d; }
  getDifficulty(): Difficulty { return this.difficulty; }
  getState(): GameState { return this.state; }
  getCurrentLane(): number { return this.currentLane; }
  getMultiplier(): number { return this.multiplier; }

  setAutoCashoutTarget(mult: number) { this.autoCashoutTarget = mult; }

  startGame() {
    this.currentLane = -1;
    this.multiplier = 1.0;
    this.isJumping = false;
    this.jumpProgress = 0;
    this.screenShake = 0;
    this.autoCashoutTarget = 0;

    if (this.explosion) { this.scene.remove(this.explosion); this.explosion = null; }

    this.buildWorld();

    if (this.chicken) this.scene.remove(this.chicken);
    if (this.chickenShadow) this.scene.remove(this.chickenShadow);
    this.chicken = createChicken();
    this.chicken.position.set(-1, 0, 0);
    this.chicken.rotation.y = Math.PI / 2;
    this.scene.add(this.chicken);

    const geo = new THREE.CircleGeometry(0.42, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false });
    this.chickenShadow = new THREE.Mesh(geo, mat);
    this.chickenShadow.rotation.x = -Math.PI / 2;
    this.chickenShadow.position.set(-1, 0.015, 0);
    this.chickenShadow.scale.set(1, 1.35, 1);
    this.scene.add(this.chickenShadow);

    this.updateCamera();
    this.state = 'playing';
    this.callbacks.onStateChange('playing');
    this.callbacks.onMultiplierChange(1.0);
    this.callbacks.onRowChange(-1);
  }

  jump() {
    if (this.state !== 'playing' || this.isJumping) return;
    const cfg = DIFF_CONFIG[this.difficulty];
    const next = this.currentLane + 1;
    if (next > cfg.totalLanes) return;
    this.isJumping = true;
    this.jumpStartX = this.getLaneX(this.currentLane);
    this.jumpEndX = this.getLaneX(next);
    this.jumpProgress = 0;
    this.state = 'jumping';
    playCluck();
  }

  cashOut() {
    if (this.state !== 'playing' || this.currentLane < 0) return;
    this.state = 'cashed_out';
    playCoin();
    setTimeout(() => playFanfare(), 100);
    this.callbacks.onStateChange('cashed_out');
  }

  resize(width: number, height: number) {
    const aspect = width / height;
    const fs = 22;
    this.camera.left = -fs * aspect / 2;
    this.camera.right = fs * aspect / 2;
    this.camera.top = fs / 2;
    this.camera.bottom = -fs / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.animId);
    this.renderer.dispose();
  }

  // ── Jump completion ────────────────────────────────────────────────────────

  private completeJump() {
    this.isJumping = false;
    const cfg = DIFF_CONFIG[this.difficulty];
    const targetLane = this.currentLane + 1;

    const survived = Math.random() < cfg.survivalProb;

    if (!survived) {
      this.state = 'dead';
      playHonk();
      setTimeout(() => playCrash(), 90);
      this.screenShake = 1.0;
      this.explosion = createExplosionParticles(this.chicken.position.clone());
      this.scene.add(this.explosion);
      this.chicken.visible = false;
      this.chickenShadow.visible = false;
      this.callbacks.onStateChange('dead');
      return;
    }

    // Survived
    this.currentLane = targetLane;
    playStep();
    this.addBarrier(this.getLaneX(this.currentLane));

    if (this.currentLane >= cfg.totalLanes) {
      // Won — crossed all lanes
      this.multiplier = computeMultiplier(this.difficulty, cfg.totalLanes);
      this.callbacks.onMultiplierChange(this.multiplier);
      this.state = 'won';
      this.callbacks.onStateChange('won');
      playFanfare();
      return;
    }

    this.multiplier = computeMultiplier(this.difficulty, this.currentLane);
    this.callbacks.onMultiplierChange(this.multiplier);
    this.callbacks.onRowChange(this.currentLane);
    this.state = 'playing';

    // Check auto-cashout
    if (this.autoCashoutTarget > 0 && this.multiplier >= this.autoCashoutTarget) {
      this.callbacks.onAutoCashout?.();
    }

    // Danger sound on last quarter of road
    if (this.currentLane >= Math.floor(cfg.totalLanes * 0.75)) {
      playDanger();
    }
  }

  // ── Animate loop ───────────────────────────────────────────────────────────

  private animate = () => {
    if (this.disposed) return;
    this.animId = requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.05);
    const time = this.clock.elapsedTime;

    // Move vehicles
    this.vehicles.forEach(v => {
      v.mesh.position.z += v.speed * delta;
      if (v.mesh.position.z > ROAD_LENGTH / 2 + 6) v.mesh.position.z = -ROAD_LENGTH / 2 - 6;
      if (v.mesh.position.z < -ROAD_LENGTH / 2 - 6) v.mesh.position.z = ROAD_LENGTH / 2 + 6;
    });

    // Screen shake
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - delta * 4.5);
      const cfg = DIFF_CONFIG[this.difficulty];
      const cx = (cfg.totalLanes * LANE_WIDTH) / 2;
      const sx = (Math.random() - 0.5) * this.screenShake * 0.45;
      const sy = (Math.random() - 0.5) * this.screenShake * 0.25;
      this.camera.position.set(cx + 10 + sx, 17 + sy, 10);
    }

    // Chicken animations
    if (this.chicken?.visible) {
      if (this.isJumping) {
        const dur = 0.28;
        this.jumpProgress += delta / dur;
        if (this.jumpProgress >= 1) {
          this.jumpProgress = 1;
          this.chicken.position.x = this.jumpEndX;
          this.chicken.position.y = 0;
          this.chicken.scale.set(1.15, 1.15, 1.15);
          this.chicken.rotation.z = 0;
          this.chickenShadow.position.x = this.jumpEndX;
          this.chickenShadow.scale.set(1, 1.35, 1);
          (this.chickenShadow.material as THREE.MeshBasicMaterial).opacity = 0.28;
          this.completeJump();
        } else {
          const t = this.jumpProgress;
          const f = Math.min(Math.floor(t * 8), 7);
          const jumpH = [0, 0.28, 0.65, 1.0, 1.0, 0.65, 0.28, 0.04];
          const squash  = [1, 0.84, 0.88, 1.0, 1.06, 1.12, 0.91, 0.97];
          const stretch = [1, 1.22, 1.18, 1.0, 0.90, 0.86, 1.12, 1.04];
          const height = jumpH[f] * 1.6;
          this.chicken.position.x = this.jumpStartX + (this.jumpEndX - this.jumpStartX) * t;
          this.chicken.position.y = height;
          this.chicken.scale.set(1.15 * squash[f], 1.15 * stretch[f], 1.15);
          // Wing flap
          const wing = Math.sin(t * Math.PI * 7) * 0.55;
          this.chicken.children.forEach(c => {
            if (c.position.x < -0.3 && c.position.y > 0.3 && c.position.y < 0.7) c.rotation.z = wing;
            if (c.position.x > 0.3 && c.position.y > 0.3 && c.position.y < 0.7) c.rotation.z = -wing;
          });
          this.chickenShadow.position.x = this.chicken.position.x;
          const ss = Math.max(0.35, 1 - height / 2.2);
          this.chickenShadow.scale.set(ss, ss * 1.35, 1);
          (this.chickenShadow.material as THREE.MeshBasicMaterial).opacity = 0.28 * ss;
        }
      } else if (this.state === 'playing' || this.state === 'idle') {
        this.chicken.position.y = Math.sin(time * 3.2) * 0.03;
        // Head bob
        this.chicken.children.forEach(c => {
          if (c.position.z > 0.2 && c.position.y > 0.8) c.rotation.y = Math.sin(time * 2.2) * 0.1;
        });
      } else if (this.state === 'won') {
        this.chicken.position.y = Math.abs(Math.sin(time * 9)) * 0.45;
        this.chicken.rotation.y = Math.PI / 2 + Math.sin(time * 5) * 0.35;
      } else if (this.state === 'cashed_out') {
        this.chicken.position.y = Math.sin(time * 3.5) * 0.09;
      }
    }

    // Explosion
    if (this.explosion) {
      if (!updateExplosion(this.explosion, delta)) {
        this.scene.remove(this.explosion);
        this.explosion = null;
      }
    }

    // Pulse next-lane multiplier sign
    if (this.state === 'playing' && !this.isJumping) {
      const nextIdx = this.currentLane + 1;
      this.multiplierSigns.forEach((s, i) => {
        if (i === nextIdx) {
          s.scale.setScalar(1 + Math.sin(time * 5.5) * 0.1);
        } else {
          s.scale.setScalar(1);
        }
      });
    }

    this.renderer.render(this.scene, this.camera);
  };
}
