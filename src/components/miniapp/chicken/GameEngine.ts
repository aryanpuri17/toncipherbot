// GameEngine.ts — Chicken Road TonCipher
// Livré par l'IA 3D, validé par Claude.ai
// ✅ CORRECTION APPLIQUÉE : rotation des véhicules corrigée dans spawnInitialVehicles et spawnNewVehicle

import * as THREE from 'three';
import {
  createScene,
  updateScene,
  updateMultiplierSigns,
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
  z: number;
  direction: number;
  baseSpeed: number;
  vehicleType: string;
}

interface Lane {
  z: number;
  direction: number;
  baseSpeed: number;
  vehicles: THREE.Group[];
  safe: boolean;
  hasGoldenEgg: boolean;
  goldenEggMesh: THREE.Group | null;
  spawnTimer: number;
  spawnInterval: number;
  laneIndex: number;
}

const LANE_CONFIGS: LaneConfig[] = [
  { z:  3.0, direction: -1, baseSpeed: 4.0, vehicleType: 'car'   },
  { z:  1.0, direction:  1, baseSpeed: 3.2, vehicleType: 'car'   },
  { z: -1.0, direction: -1, baseSpeed: 5.0, vehicleType: 'car'   },
  { z: -3.0, direction:  1, baseSpeed: 2.8, vehicleType: 'truck' },
  { z: -5.0, direction: -1, baseSpeed: 4.5, vehicleType: 'car'   },
];

const CHICKEN_START_Z  = 5.5;
const FINISH_Z         = -7.0;
const VEHICLE_DESPAWN_X = 16;
const VEHICLE_SPAWN_X   = 15;

export class GameEngine {
  private callbacks:     GameCallbacks;
  private sceneElements: SceneElements;

  private chicken:        THREE.Group;
  private lanes:          Lane[];
  private explosionGroup: THREE.Group | null = null;

  private state:              GameState  = 'idle';
  private difficulty:         Difficulty = 'medium';
  private currentRow          = 0;
  private multiplier          = 1.0;
  private autoCashoutTarget   = 0;

  private isJumping     = false;
  private jumpStartZ    = 0;
  private jumpTargetZ   = 0;
  private jumpProgress  = 0;
  private jumpElapsed   = 0;

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
    this.chicken.position.set(0, 0, CHICKEN_START_Z);
    this.chicken.userData.baseY = 0;
    this.chicken.rotation.y = Math.PI;
    this.sceneElements.scene.add(this.chicken);

    this.lanes = this.createLanes();
    this.lanes.forEach((lane) => this.spawnInitialVehicles(lane));

    this.updateSigns();
    this.animate();
    this.resize(canvas.clientWidth, canvas.clientHeight);
  }

  // ─── CRÉATION DES LANES ────────────────────────────────────────
  private createLanes(): Lane[] {
    return LANE_CONFIGS.map((cfg, index) => ({
      z:             cfg.z,
      direction:     cfg.direction,
      baseSpeed:     cfg.baseSpeed,
      vehicles:      [],
      safe:          true,
      hasGoldenEgg:  false,
      goldenEggMesh: null,
      spawnTimer:    0,
      spawnInterval: this.getSpawnInterval(cfg.baseSpeed),
      laneIndex:     index,
    }));
  }

  private getSpawnInterval(baseSpeed: number): number {
    return 2.5 / (baseSpeed / 3.5) + Math.random() * 0.5;
  }

  // ─── SPAWN VÉHICULES ────────────────────────────────────────────
  // ✅ CORRECTION : rotation corrigée pour que les véhicules regardent
  //    dans leur direction de déplacement.
  //    direction  1 (droite) → rotation.y = -PI/2
  //    direction -1 (gauche) → rotation.y =  PI/2
  private spawnInitialVehicles(lane: Lane): void {
    const count   = 3 + Math.floor(Math.random() * 3);
    const spacing = (VEHICLE_SPAWN_X * 2) / count;

    for (let i = 0; i < count; i++) {
      const vehicle = spawnVehicle(lane.laneIndex);
      const x = -VEHICLE_SPAWN_X + i * spacing + (Math.random() - 0.5) * spacing * 0.5;
      vehicle.position.set(x, 0, lane.z);
      vehicle.userData.speed = lane.baseSpeed * (0.85 + Math.random() * 0.35);

      if (lane.direction === 1) {
        vehicle.rotation.y = -Math.PI / 2;
      } else {
        vehicle.rotation.y = Math.PI / 2;
      }

      this.sceneElements.scene.add(vehicle);
      lane.vehicles.push(vehicle);
    }
  }

  private spawnNewVehicle(lane: Lane): void {
    const vehicle = spawnVehicle(lane.laneIndex);
    const halfW   = ((vehicle.userData.width as number) || 2) / 2;
    const startX  = lane.direction === 1
      ? -VEHICLE_SPAWN_X - halfW
      :  VEHICLE_SPAWN_X + halfW;

    vehicle.position.set(startX, 0, lane.z);
    vehicle.userData.speed = lane.baseSpeed * (0.85 + Math.random() * 0.35);

    if (lane.direction === 1) {
      vehicle.rotation.y = -Math.PI / 2;
    } else {
      vehicle.rotation.y = Math.PI / 2;
    }

    this.sceneElements.scene.add(vehicle);
    lane.vehicles.push(vehicle);
  }

  // ─── GOLDEN EGG ────────────────────────────────────────────────
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
        egg.position.set(0, 0.5, lane.z);
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

  // ─── PANNEAUX ──────────────────────────────────────────────────
  private updateSigns(): void {
    const labels: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const m = computeMultiplier(this.difficulty, i);
      labels.push('×' + m.toFixed(2));
    }
    updateMultiplierSigns(this.sceneElements, labels);
  }

  // ─── API PUBLIQUE ───────────────────────────────────────────────
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
    this.chicken.position.set(0, 0, CHICKEN_START_Z);
    this.chicken.userData.baseY = 0;
    resetChickenTransform(this.chicken);
    this.chicken.rotation.y = Math.PI;

    const config = DIFF_CONFIG[this.difficulty];
    this.laneOutcomes = [];
    for (let i = 0; i < config.totalLanes; i++) {
      this.laneOutcomes.push(Math.random() < config.survivalProb);
    }

    this.lanes.forEach((lane) => {
      lane.vehicles.forEach((v) => this.sceneElements.scene.remove(v));
      lane.vehicles    = [];
      lane.spawnTimer  = 0;
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

    this.isJumping   = true;
    this.jumpElapsed = 0;
    this.jumpProgress = 0;

    const targetLaneIndex = this.currentRow;
    this.jumpStartZ = this.chicken.position.z;
    this.jumpTargetZ = LANE_CONFIGS[targetLaneIndex].z;

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

  // ─── LOGIQUE INTERNE ────────────────────────────────────────────
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

    this.callbacks.onMultiplierChange(this.multiplier);
    this.callbacks.onRowChange(this.currentRow);

    resetChickenTransform(this.chicken);
    this.chicken.rotation.y = Math.PI;
    this.isJumping = false;

    if (this.autoCashoutTarget > 0 && this.multiplier >= this.autoCashoutTarget) {
      this.setState('cashed_out');
      this.callbacks.onAutoCashout();
      return;
    }

    const totalLanes = DIFF_CONFIG[this.difficulty].totalLanes;
    if (this.currentRow >= totalLanes) {
      this.chicken.position.z = FINISH_Z;
      this.setState('won');
      return;
    }

    this.setState('playing');
  }

  private die(): void {
    this.setState('dead');
    this.isJumping = false;

    const pos = this.chicken.position.clone();
    this.explosionGroup = createExplosionParticles(pos);
    this.sceneElements.scene.add(this.explosionGroup);

    this.chicken.visible = false;
  }

  // ─── BOUCLE RAF ─────────────────────────────────────────────────
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
        vehicle.position.x += lane.direction * (vehicle.userData.speed as number) * delta;
      });

      lane.vehicles.forEach((vehicle) => {
        const halfW = ((vehicle.userData.width as number) || 1.6) / 2;
        if (lane.direction === 1 && vehicle.position.x > VEHICLE_DESPAWN_X + halfW) {
          vehicle.position.x = -VEHICLE_SPAWN_X - halfW;
        } else if (lane.direction === -1 && vehicle.position.x < -VEHICLE_DESPAWN_X - halfW) {
          vehicle.position.x = VEHICLE_SPAWN_X + halfW;
        }
      });

      lane.spawnTimer += delta;
      if (lane.spawnTimer >= lane.spawnInterval) {
        lane.spawnTimer    = 0;
        lane.spawnInterval = this.getSpawnInterval(lane.baseSpeed);
        if (lane.vehicles.length < 8) {
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

        const z = this.jumpStartZ + (this.jumpTargetZ - this.jumpStartZ) * this.jumpProgress;
        this.chicken.position.z = z;

        animateChickenJump(this.chicken, this.jumpProgress, this.time);

        if (this.jumpProgress >= 1) {
          this.chicken.position.z = this.jumpTargetZ;
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
