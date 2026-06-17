// GameEngine.ts — Chicken Road TonCipher — Version 3
// Vue du dessus, voies verticales, poulet avance vers la droite
// ✅ CORRECTION : directions des voies alternées

import * as THREE from 'three';
import {
  createScene,
  updateScene,
  updateMultiplierBadges,
  setBadgeVisible,
  resizeScene,
  SceneElements,
} from './scene';
import {
  createChicken,
  animateChickenIdle,
  animateChickenJump,
  animateChickenVictory,
  resetChickenTransform,
  createGoldenEgg,
  updateGoldenEgg,
  createExplosionParticles,
  updateExplosion,
  spawnVehicle,
  JUMP_DURATION,
} from './voxelModels';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'hardcore';
export type GameState =
  | 'idle'
  | 'playing'
  | 'jumping'
  | 'dead'
  | 'won'
  | 'cashed_out';

interface DiffConfig {
  totalLanes: number;
  survivalProb: number;
  label: string;
}

export const DIFF_CONFIG: Record<Difficulty, DiffConfig> = {
  easy:     { totalLanes: 5, survivalProb: 0.88, label: 'Facile'    },
  medium:   { totalLanes: 5, survivalProb: 0.72, label: 'Moyen'     },
  hard:     { totalLanes: 5, survivalProb: 0.58, label: 'Difficile' },
  hardcore: { totalLanes: 5, survivalProb: 0.42, label: 'Hardcore'  },
};

export function computeMultiplier(
  difficulty: Difficulty,
  lane: number
): number {
  const prob = DIFF_CONFIG[difficulty].survivalProb;
  return Math.round((0.95 / Math.pow(prob, lane)) * 10000) / 10000;
}

interface GameCallbacks {
  onStateChange:      (state: GameState) => void;
  onMultiplierChange: (mult: number) => void;
  onRowChange:        (row: number) => void;
  onAutoCashout:      () => void;
  onGoldenEgg?:       () => void;
}

interface LaneConfig {
  x: number;
  direction: number;
  baseSpeed: number;
}

interface Lane {
  x: number;
  direction: number;
  baseSpeed: number;
  vehicles: THREE.Group[];
  hasGoldenEgg: boolean;
  goldenEggMesh: THREE.Group | null;
  spawnTimer: number;
  spawnInterval: number;
  laneIndex: number;
}

// ✅ CORRECTION APPLIQUÉE : directions alternées comme dans le vrai jeu
// -1 = descend (haut → bas), +1 = monte (bas → haut)
const LANE_CONFIGS: LaneConfig[] = [
  { x: -4.0, direction: -1, baseSpeed: 4.0 },
  { x: -2.0, direction:  1, baseSpeed: 3.2 },
  { x:  0.0, direction: -1, baseSpeed: 5.0 },
  { x:  2.0, direction:  1, baseSpeed: 2.8 },
  { x:  4.0, direction: -1, baseSpeed: 4.5 },
];

const CHICKEN_START_X   =  -6.0;
const FINISH_X          =   6.0;
const VEHICLE_SPAWN_Y   =   8.0;
const VEHICLE_DESPAWN_Y =  -8.5;

export class GameEngine {
  private callbacks:     GameCallbacks;
  private sceneElements: SceneElements;

  private chicken:        THREE.Group;
  private lanes:          Lane[];
  private explosionGroup: THREE.Group | null = null;

  private state:            GameState  = 'idle';
  private difficulty:       Difficulty = 'medium';
  private currentRow        = 0;
  private multiplier        = 1.0;
  private autoCashoutTarget = 0;

  private isJumping    = false;
  private jumpStartX   = 0;
  private jumpTargetX  = 0;
  private jumpProgress = 0;
  private jumpElapsed  = 0;

  private laneOutcomes: boolean[] = [];

  private animFrameId = 0;
  private clock: THREE.Clock;
  private time  = 0;

  private disposed = false;

  constructor(canvas: HTMLCanvasElement, callbacks: GameCallbacks) {
    this.callbacks = callbacks;
    this.clock     = new THREE.Clock();

    this.sceneElements = createScene(canvas);

    this.chicken = createChicken();
    this.chicken.position.set(CHICKEN_START_X, 0, 0);
    this.chicken.userData.baseZ = 0;
    this.sceneElements.scene.add(this.chicken);

    this.lanes = this.createLanes();
    this.lanes.forEach((lane) => this.spawnInitialVehicles(lane));

    this.updateSigns();
    this.animate();
    this.resize(canvas.clientWidth, canvas.clientHeight);
  }

  private createLanes(): Lane[] {
    return LANE_CONFIGS.map((cfg, index) => ({
      x:             cfg.x,
      direction:     cfg.direction,
      baseSpeed:     cfg.baseSpeed,
      vehicles:      [],
      hasGoldenEgg:  false,
      goldenEggMesh: null,
      spawnTimer:    0,
      spawnInterval: this.getSpawnInterval(cfg.baseSpeed),
      laneIndex:     index,
    }));
  }

  private getSpawnInterval(baseSpeed: number): number {
    return 2.5 / (baseSpeed / 3.5) + Math.random() * 0.6;
  }

  private spawnInitialVehicles(lane: Lane): void {
    const count   = 2 + Math.floor(Math.random() * 2);
    const spacing = 16 / count;

    for (let i = 0; i < count; i++) {
      const vehicle  = spawnVehicle(lane.laneIndex);
      const y        = VEHICLE_SPAWN_Y - i * spacing + (Math.random() - 0.5) * 1.5;
      vehicle.position.set(lane.x, y, 0);
      vehicle.userData.speed = lane.baseSpeed * (0.85 + Math.random() * 0.35);

      if (lane.direction === 1) {
        vehicle.rotation.z = Math.PI;
      }

      this.sceneElements.scene.add(vehicle);
      lane.vehicles.push(vehicle);
    }
  }

  private spawnNewVehicle(lane: Lane): void {
    const vehicle = spawnVehicle(lane.laneIndex);
    const length  = (vehicle.userData.length as number) || 2;

    const startY =
      lane.direction === -1
        ? VEHICLE_SPAWN_Y + length
        : VEHICLE_DESPAWN_Y - length;

    vehicle.position.set(lane.x, startY, 0);
    vehicle.userData.speed = lane.baseSpeed * (0.85 + Math.random() * 0.35);

    if (lane.direction === 1) {
      vehicle.rotation.z = Math.PI;
    }

    this.sceneElements.scene.add(vehicle);
    lane.vehicles.push(vehicle);
  }

  private setupGoldenEggs(): void {
    this.lanes.forEach((lane) => {
      if (lane.goldenEggMesh) {
        this.sceneElements.scene.remove(lane.goldenEggMesh);
        lane.goldenEggMesh = null;
      }
      lane.hasGoldenEgg = false;

      if (Math.random() < 0.08) {
        lane.hasGoldenEgg = true;
        const egg = createGoldenEgg();
        egg.position.set(lane.x, 4.5, 0.3);
        egg.userData.baseZ = 0.3;
        this.sceneElements.scene.add(egg);
        lane.goldenEggMesh = egg;
      }
    });
  }

  private collectGoldenEgg(lane: Lane): void {
    if (lane.hasGoldenEgg && lane.goldenEggMesh) {
      this.sceneElements.scene.remove(lane.goldenEggMesh);
      lane.goldenEggMesh  = null;
      lane.hasGoldenEgg   = false;
      this.multiplier    *= 1.25;
      this.callbacks.onMultiplierChange(this.multiplier);
      if (this.callbacks.onGoldenEgg) {
        this.callbacks.onGoldenEgg();
      }
    }
  }

  private updateSigns(): void {
    const labels: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const m = computeMultiplier(this.difficulty, i);
      labels.push('×' + m.toFixed(2));
    }
    updateMultiplierBadges(this.sceneElements, labels);
  }

  startGame(): void {
    if (
      this.state !== 'idle' &&
      this.state !== 'dead' &&
      this.state !== 'won' &&
      this.state !== 'cashed_out'
    ) return;

    this.currentRow   = 0;
    this.multiplier   = 1.0;
    this.isJumping    = false;
    this.jumpProgress = 0;
    this.jumpElapsed  = 0;

    if (this.explosionGroup) {
      this.sceneElements.scene.remove(this.explosionGroup);
      this.explosionGroup = null;
    }

    this.chicken.visible = true;
    this.chicken.position.set(CHICKEN_START_X, 0, 0);
    this.chicken.userData.baseZ = 0;
    resetChickenTransform(this.chicken);

    for (let i = 0; i < 5; i++) {
      setBadgeVisible(this.sceneElements, i, true);
    }

    const config = DIFF_CONFIG[this.difficulty];
    this.laneOutcomes = [];
    for (let i = 0; i < config.totalLanes; i++) {
      this.laneOutcomes.push(Math.random() < config.survivalProb);
    }

    this.lanes.forEach((lane) => {
      lane.vehicles.forEach((v) => this.sceneElements.scene.remove(v));
      lane.vehicles   = [];
      lane.spawnTimer = 0;
      this.spawnInitialVehicles(lane);
    });

    this.setupGoldenEggs();
    this.updateSigns();

    this.setState('playing');
    this.callbacks.onMultiplierChange(this.multiplier);
    this.callbacks.onRowChange(0);
  }

  jump(): void {
    if (this.state !== 'playing' || this.isJumping) return;

    const totalLanes = DIFF_CONFIG[this.difficulty].totalLanes;
    if (this.currentRow >= totalLanes) return;

    this.isJumping    = true;
    this.jumpElapsed  = 0;
    this.jumpProgress = 0;

    const targetLaneIndex = this.currentRow;
    this.jumpStartX  = this.chicken.position.x;
    this.jumpTargetX = LANE_CONFIGS[targetLaneIndex].x;

    this.setState('jumping');
  }

  cashOut(): void {
    if (this.state !== 'playing') return;
    if (this.currentRow === 0) return;
    this.setState('cashed_out');
  }

  setDifficulty(d: Difficulty): void {
    this.difficulty = d;
    this.updateSigns();
  }

  setAutoCashoutTarget(mult: number): void {
    this.autoCashoutTarget = mult;
  }

  resize(width: number, height: number): void {
    resizeScene(this.sceneElements, width, height);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.animFrameId);

    this.lanes.forEach((lane) => {
      lane.vehicles.forEach((v) => this.sceneElements.scene.remove(v));
      if (lane.goldenEggMesh) this.sceneElements.scene.remove(lane.goldenEggMesh);
    });

    this.sceneElements.scene.remove(this.chicken);
    if (this.explosionGroup) this.sceneElements.scene.remove(this.explosionGroup);

    this.sceneElements.renderer.dispose();

    this.sceneElements.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry?.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((m: THREE.Material) => m.dispose());
        } else if (object.material) {
          (object.material as THREE.Material).dispose();
        }
      }
    });
  }

  private setState(state: GameState): void {
    this.state = state;
    this.callbacks.onStateChange(state);
  }

  private completeJump(): void {
    this.currentRow++;
    const laneIndex = this.currentRow - 1;
    const survived  = this.laneOutcomes[laneIndex];

    if (!survived) {
      this.die();
      return;
    }

    this.multiplier = computeMultiplier(this.difficulty, this.currentRow);

    const lane = this.lanes[laneIndex];
    this.collectGoldenEgg(lane);

    setBadgeVisible(this.sceneElements, laneIndex, false);

    this.callbacks.onMultiplierChange(this.multiplier);
    this.callbacks.onRowChange(this.currentRow);

    resetChickenTransform(this.chicken);
    this.isJumping = false;

    if (this.autoCashoutTarget > 0 && this.multiplier >= this.autoCashoutTarget) {
      this.setState('cashed_out');
      this.callbacks.onAutoCashout();
      return;
    }

    const totalLanes = DIFF_CONFIG[this.difficulty].totalLanes;
    if (this.currentRow >= totalLanes) {
      this.chicken.position.x = FINISH_X;
      this.setState('won');
      return;
    }

    this.setState('playing');
  }

  private die(): void {
    this.setState('dead');
    this.isJumping = false;

    const pos = this.chicken.position.clone();
    pos.z = 0.5;
    this.explosionGroup = createExplosionParticles(pos);
    this.sceneElements.scene.add(this.explosionGroup);

    this.chicken.visible = false;
  }

  private animate = (): void => {
    if (this.disposed) return;
    this.animFrameId = requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.05);
    this.time  += delta;

    updateScene(this.sceneElements, this.time, delta);
    this.updateVehicles(delta);

    this.lanes.forEach((lane) => {
      if (lane.goldenEggMesh) updateGoldenEgg(lane.goldenEggMesh, this.time);
    });

    this.updateChicken(delta);

    if (this.explosionGroup) {
      const done = updateExplosion(this.explosionGroup, delta);
      if (done) {
        this.sceneElements.scene.remove(this.explosionGroup);
        this.explosionGroup = null;
      }
    }

    this.sceneElements.renderer.render(
      this.sceneElements.scene,
      this.sceneElements.camera
    );
  };

  private updateVehicles(delta: number): void {
    this.lanes.forEach((lane) => {
      lane.vehicles.forEach((vehicle) => {
        vehicle.position.y +=
          lane.direction * (vehicle.userData.speed as number) * delta;
      });

      lane.vehicles.forEach((vehicle) => {
        const length = ((vehicle.userData.length as number) || 2) / 2;
        if (lane.direction === -1 && vehicle.position.y < VEHICLE_DESPAWN_Y - length) {
          vehicle.position.y = VEHICLE_SPAWN_Y + length;
        } else if (lane.direction === 1 && vehicle.position.y > VEHICLE_SPAWN_Y + length) {
          vehicle.position.y = VEHICLE_DESPAWN_Y - length;
        }
      });

      lane.spawnTimer += delta;
      if (lane.spawnTimer >= lane.spawnInterval) {
        lane.spawnTimer    = 0;
        lane.spawnInterval = this.getSpawnInterval(lane.baseSpeed);
        if (lane.vehicles.length < 5) {
          this.spawnNewVehicle(lane);
        }
      }
    });
  }

  private updateChicken(delta: number): void {
    switch (this.state) {
      case 'idle':
      case 'playing':
        animateChickenIdle(this.chicken, this.time);
        break;

      case 'jumping': {
        this.jumpElapsed  += delta;
        this.jumpProgress  = Math.min(1, this.jumpElapsed / JUMP_DURATION);

        const x = this.jumpStartX + (this.jumpTargetX - this.jumpStartX) * this.jumpProgress;
        this.chicken.position.x = x;

        animateChickenJump(this.chicken, this.jumpProgress, this.time);

        if (this.jumpProgress >= 1) {
          this.chicken.position.x = this.jumpTargetX;
          this.completeJump();
        }
        break;
      }

      case 'won':
        animateChickenVictory(this.chicken, this.time, delta);
        break;

      case 'cashed_out':
        animateChickenIdle(this.chicken, this.time);
        break;

      case 'dead':
        break;
    }
  }
}
