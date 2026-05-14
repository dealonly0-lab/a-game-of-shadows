import {
  BOT_COUNT,
  BOT_FIRE_RANGE,
  BOT_HUNT_SPEED,
  BOT_INVESTIGATE_SPEED,
  BOT_MEMORY_MS,
  BOT_TARGET_RANGE,
  BOT_WANDER_SPEED,
  BEAM_COOLDOWN_MS,
  BEAM_RANGE,
  BEAM_SPEED,
  EXPOSURE_DECAY_PER_SECOND,
  EXPOSURE_GAIN_PER_SECOND,
  MATCH_COUNTDOWN_MS,
  PLAYER_RADIUS,
  PLAYER_SPAWN_GRACE_MS,
  PLAYER_SPEED
} from './constants';
import type { BotEntity, Entity, GameplayEvent, GameOutcome, InputActionState, LightSource, MatchPhase, MatchStats, Particle, Projectile } from './types';
import { MAP_COLS, MAP_ROWS, TILE_SIZE, isWallTile } from '../content/villageMap';
import { createMatchVariant, type MatchVariant } from '../content/matchDirector';

type SimulationInput = {
  playerLevel: number;
  matchesPlayed: number;
};

export class GameSimulation {
  readonly variant: MatchVariant;
  readonly player: Entity;
  readonly bots: BotEntity[];
  readonly lights: LightSource[];
  readonly projectiles: Projectile[] = [];
  readonly particles: Particle[] = [];
  readonly events: GameplayEvent[] = [];
  readonly stats: MatchStats = {
    playerShots: 0,
    playerHits: 0,
    playerKills: 0,
    botShots: 0,
    survivedMs: 0
  };

  matchPhase: MatchPhase = 'countdown';
  countdownMs = MATCH_COUNTDOWN_MS;
  matchElapsedMs = 0;
  playerSpawnGraceMs = PLAYER_SPAWN_GRACE_MS;
  playerExposure = 0;
  dawnMs = 0;
  dawnProgress = 0;
  outcome: GameOutcome = 'playing';
  muzzleFlashMs = 0;
  muzzleX = 0;
  muzzleY = 0;

  private projectileId = 0;
  private readonly sealedTileKeys: Set<string>;

  constructor(input: SimulationInput = { playerLevel: 1, matchesPlayed: 0 }) {
    this.variant = createMatchVariant(input);
    this.sealedTileKeys = new Set(this.variant.sealedTiles.map((tile) => tileKey(tile.col, tile.row)));

    const playerSpawn = resolveSpawnPoint(this.variant.playerSpawn.col, this.variant.playerSpawn.row, (x, y) => this.canMove(x, y, PLAYER_RADIUS));
    this.player = {
      id: 'player',
      x: playerSpawn.x,
      y: playerSpawn.y,
      angle: 0,
      alive: true,
      isPlayer: true,
      cooldownMs: 0,
      shadow: null
    };

    this.bots = this.variant.botSpawns.slice(0, Math.min(BOT_COUNT + 3, this.variant.botCount)).map((spawn, index) => ({
      ...createBot(index, spawn.col, spawn.row, (x, y) => this.canMove(x, y, PLAYER_RADIUS))
    }));

    this.lights = this.variant.lights.map((light, index) => ({
      id: `light-${index}`,
      x: light.col * TILE_SIZE,
      y: light.row * TILE_SIZE,
      baseRadius: light.radius * this.variant.lightRadiusMultiplier,
      radius: light.radius,
      kind: light.kind,
      flickerSeed: index * 0.73
    }));
  }

  update(deltaMs: number, actions: InputActionState): void {
    if (this.outcome !== 'playing') return;

    const dt = deltaMs / 1000;
    this.updateLights();
    this.updateCountdown(deltaMs);
    this.updatePlayer(deltaMs, dt, actions);
    this.updateShadows();
    this.updateExposure(dt);

    if (this.matchPhase === 'active') {
      this.updateBots(deltaMs, dt);
      this.updateProjectiles(dt);
      this.updateDawn(deltaMs);
      this.updateOutcome();
      this.matchElapsedMs += deltaMs;
      this.stats.survivedMs = this.matchElapsedMs;
      if (this.playerSpawnGraceMs > 0) this.playerSpawnGraceMs = Math.max(0, this.playerSpawnGraceMs - deltaMs);
    } else {
      for (const bot of this.bots) bot.aiState = 'idle';
    }

    this.updateParticles(dt);

    if (this.muzzleFlashMs > 0) this.muzzleFlashMs = Math.max(0, this.muzzleFlashMs - deltaMs);
  }

  firePlayer(): void {
    if (!this.player.alive || this.player.cooldownMs > 0 || this.outcome !== 'playing' || this.matchPhase !== 'active') return;
    this.fire(this.player);
    this.player.cooldownMs = BEAM_COOLDOWN_MS;
  }

  getAliveCount(): number {
    return this.bots.filter((bot) => bot.alive).length + (this.player.alive ? 1 : 0);
  }

  consumeEvents(): GameplayEvent[] {
    return this.events.splice(0, this.events.length);
  }

  getPlayerDangerLevel(): number {
    if (this.playerSpawnGraceMs > 0) return 0;
    return this.playerExposure;
  }

  isPlayerProtected(): boolean {
    return this.playerSpawnGraceMs > 0 || this.matchPhase !== 'active';
  }

  isBlockedTile(col: number, row: number): boolean {
    return isWallTile(col, row) || this.sealedTileKeys.has(tileKey(col, row));
  }

  isBlocked(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= MAP_COLS * TILE_SIZE || y >= MAP_ROWS * TILE_SIZE) return true;
    return this.isBlockedTile(Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE));
  }

  private updateCountdown(deltaMs: number): void {
    if (this.matchPhase !== 'countdown') return;
    this.countdownMs = Math.max(0, this.countdownMs - deltaMs);
    if (this.countdownMs === 0) this.matchPhase = 'active';
  }

  private updateLights(): void {
    const t = performance.now() / 16.666;
    for (const light of this.lights) {
      const flicker =
        light.kind === 'bonfire'
          ? Math.sin(t * 0.07 + light.flickerSeed) * 16 + Math.sin(t * 0.13 + light.flickerSeed * 2) * 9
          : Math.sin(t * 0.04 + light.flickerSeed) * 5;

      light.radius = light.baseRadius + flicker + this.dawnProgress * (220 + this.variant.difficulty * 10);
    }
  }

  private updatePlayer(deltaMs: number, dt: number, actions: InputActionState): void {
    if (!this.player.alive) return;

    const move = normalize(actions.moveX, actions.moveY);
    this.moveEntity(this.player, move.x * PLAYER_SPEED * dt, move.y * PLAYER_SPEED * dt);
    this.player.angle = Math.atan2(actions.aimY - this.player.y, actions.aimX - this.player.x);

    if (this.player.cooldownMs > 0) this.player.cooldownMs = Math.max(0, this.player.cooldownMs - deltaMs);
    if (actions.firePressed) this.firePlayer();
  }

  private updateBots(deltaMs: number, dt: number): void {
    for (const bot of this.bots) {
      if (!bot.alive) continue;

      if (bot.cooldownMs > 0) bot.cooldownMs = Math.max(0, bot.cooldownMs - deltaMs);
      if (bot.wanderMs > 0) bot.wanderMs -= deltaMs;
      if (bot.memoryMs > 0) bot.memoryMs = Math.max(0, bot.memoryMs - deltaMs);

      const target = this.findNearestShadowedTarget(bot, BOT_TARGET_RANGE * this.variant.botRangeMultiplier);
      if (target) {
        bot.aiState = 'hunt';
        bot.wanderAngle = Math.atan2(target.y - bot.y, target.x - bot.x);
        bot.angle = bot.wanderAngle;
        bot.lastKnownTargetX = target.x;
        bot.lastKnownTargetY = target.y;
        bot.memoryMs = BOT_MEMORY_MS;

        const distance = distanceBetween(bot, target);
        if (distance < BOT_FIRE_RANGE * this.variant.botRangeMultiplier && bot.cooldownMs <= 0 && bot.shadow) {
          this.fire(bot);
          bot.cooldownMs = (BEAM_COOLDOWN_MS + Math.random() * 1000) * this.variant.botCooldownMultiplier;
        }
      } else if (bot.memoryMs > 0) {
        bot.aiState = 'investigate';
        bot.wanderAngle = Math.atan2(bot.lastKnownTargetY - bot.y, bot.lastKnownTargetX - bot.x);
        bot.angle = bot.wanderAngle;

        if (Math.hypot(bot.lastKnownTargetX - bot.x, bot.lastKnownTargetY - bot.y) < 22) {
          bot.memoryMs = 0;
          bot.wanderMs = 0;
        }
      } else if (bot.wanderMs <= 0) {
        bot.aiState = 'wander';
        bot.wanderAngle += (Math.random() - 0.5) * 2.5;
        bot.angle = bot.wanderAngle;
        bot.wanderMs = 1200 + Math.random() * 2000;
      } else {
        bot.aiState = 'wander';
      }

      const baseSpeed = bot.aiState === 'hunt' ? BOT_HUNT_SPEED : bot.aiState === 'investigate' ? BOT_INVESTIGATE_SPEED : BOT_WANDER_SPEED;
      const speed = baseSpeed * this.variant.botSpeedMultiplier;
      const dx = Math.cos(bot.wanderAngle) * speed * dt;
      const dy = Math.sin(bot.wanderAngle) * speed * dt;
      const movedX = this.moveEntityAxis(bot, dx, 0);
      const movedY = this.moveEntityAxis(bot, 0, dy);

      if (!movedX || !movedY) {
        bot.wanderAngle += Math.PI * 0.6;
        bot.wanderMs = 0;
      }
    }
  }

  private updateShadows(): void {
    const allLights = [...this.lights];
    if (this.muzzleFlashMs > 0) {
      allLights.push({
        id: 'muzzle',
        x: this.muzzleX,
        y: this.muzzleY,
        baseRadius: 100,
        radius: 100 * (this.muzzleFlashMs / 160),
        kind: 'flash',
        flickerSeed: 0
      });
    }

    for (const entity of this.entities()) {
      if (!entity.alive) {
        entity.shadow = null;
        continue;
      }

      let best: Entity['shadow'] = null;
      for (const light of allLights) {
        const dx = entity.x - light.x;
        const dy = entity.y - light.y;
        const distance = Math.hypot(dx, dy);
        if (distance < light.radius && distance > 1) {
          const length = (distance / light.radius) * 110 + 28;
          if (!best || length > best.length) best = { length, nx: dx / distance, ny: dy / distance };
        }
      }

      entity.shadow = best;
    }
  }

  private updateExposure(dt: number): void {
    const exposed = Boolean(this.player.shadow);
    const delta = exposed ? EXPOSURE_GAIN_PER_SECOND * dt : -EXPOSURE_DECAY_PER_SECOND * dt;
    this.playerExposure = clamp01(this.playerExposure + delta);
  }

  private updateProjectiles(dt: number): void {
    for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = this.projectiles[index];
      projectile.trail.push({ x: projectile.x, y: projectile.y });
      if (projectile.trail.length > 14) projectile.trail.shift();

      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      projectile.traveled += BEAM_SPEED * dt;

      if (projectile.traveled > BEAM_RANGE || this.isBlocked(projectile.x, projectile.y)) {
        this.spawnParticles(projectile.x, projectile.y, false);
        this.events.push({ type: 'beam-impact', x: projectile.x, y: projectile.y });
        this.projectiles.splice(index, 1);
        continue;
      }

      const victim = this.entities().find((entity) => {
        if (!entity.alive || entity.id === projectile.ownerId || !entity.shadow) return false;
        if (entity.isPlayer && this.isPlayerProtected()) return false;
        return Math.hypot(entity.x - projectile.x, entity.y - projectile.y) < PLAYER_RADIUS + 7;
      });

      if (victim) {
        victim.alive = false;
        if (projectile.ownerId === this.player.id) {
          this.stats.playerHits += 1;
          this.stats.playerKills += 1;
        }
        this.spawnParticles(victim.x, victim.y, true);
        this.events.push({ type: 'entity-killed', x: victim.x, y: victim.y, victimId: victim.id, byPlayer: projectile.ownerId === this.player.id });
        this.projectiles.splice(index, 1);
      }
    }
  }

  private updateParticles(dt: number): void {
    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.91;
      particle.vy *= 0.91;
      particle.life -= particle.decay;
      if (particle.life <= 0) this.particles.splice(index, 1);
    }
  }

  private updateDawn(deltaMs: number): void {
    this.dawnMs = Math.min(this.variant.dawnDurationMs, this.dawnMs + deltaMs);
    this.dawnProgress = this.dawnMs / this.variant.dawnDurationMs;
  }

  private updateOutcome(): void {
    if (!this.player.alive) {
      this.outcome = 'lost';
      this.matchPhase = 'ended';
      return;
    }

    if (this.bots.every((bot) => !bot.alive)) {
      this.outcome = 'won';
      this.matchPhase = 'ended';
    }
  }

  private fire(shooter: Entity): void {
    if (shooter.isPlayer) this.stats.playerShots += 1;
    else this.stats.botShots += 1;

    if (shooter.isPlayer) {
      this.muzzleFlashMs = 160;
      this.muzzleX = shooter.x;
      this.muzzleY = shooter.y;
    }

    this.projectiles.push({
      id: `beam-${this.projectileId++}`,
      x: shooter.x,
      y: shooter.y,
      vx: Math.cos(shooter.angle) * BEAM_SPEED,
      vy: Math.sin(shooter.angle) * BEAM_SPEED,
      traveled: 0,
      ownerId: shooter.id,
      trail: []
    });
    this.events.push({ type: 'beam-fired', x: shooter.x, y: shooter.y, ownerId: shooter.id, isPlayer: shooter.isPlayer });
  }

  private spawnParticles(x: number, y: number, isKill: boolean): void {
    const count = isKill ? 22 : 8;
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * (isKill ? 120 : 60) + 20;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.035 + Math.random() * 0.04,
        radius: Math.random() * 3 + 1,
        color: isKill ? (Math.random() < 0.5 ? 0xd4853a : 0xe8c060) : 0x90c8ff
      });
    }
  }

  private findNearestShadowedTarget(bot: BotEntity, maxDistance: number): Entity | null {
    let closest: Entity | null = null;
    let closestDistance = Infinity;

    for (const entity of this.entities()) {
      if (!entity.alive || entity.id === bot.id || !entity.shadow) continue;
      const distance = distanceBetween(bot, entity);
      if (distance < maxDistance && distance < closestDistance && hasLineOfSight(bot.x, bot.y, entity.x, entity.y, (x, y) => this.isBlocked(x, y))) {
        closest = entity;
        closestDistance = distance;
      }
    }

    return closest;
  }

  private moveEntity(entity: Entity, dx: number, dy: number): void {
    this.moveEntityAxis(entity, dx, 0);
    this.moveEntityAxis(entity, 0, dy);
  }

  private moveEntityAxis(entity: Entity, dx: number, dy: number): boolean {
    const nx = entity.x + dx;
    const ny = entity.y + dy;
    if (!this.canMove(nx, ny, PLAYER_RADIUS)) return false;
    entity.x = nx;
    entity.y = ny;
    return true;
  }

  private entities(): Entity[] {
    return [this.player, ...this.bots];
  }

  private canMove(x: number, y: number, radius: number): boolean {
    const points = [
      [x - radius, y - radius],
      [x + radius, y - radius],
      [x - radius, y + radius],
      [x + radius, y + radius],
      [x, y - radius],
      [x, y + radius],
      [x - radius, y],
      [x + radius, y]
    ];

    return points.every(([px, py]) => !this.isBlocked(px, py));
  }
}

function normalize(x: number, y: number): { x: number; y: number } {
  const length = Math.hypot(x, y);
  if (length === 0) return { x: 0, y: 0 };
  return { x: x / length, y: y / length };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function createBot(index: number, col: number, row: number, canMoveTo: (x: number, y: number) => boolean): BotEntity {
  const spawn = resolveSpawnPoint(col, row, canMoveTo);
  return {
    id: `bot-${index}`,
    x: spawn.x,
    y: spawn.y,
    angle: Math.random() * Math.PI * 2,
    alive: true,
    isPlayer: false,
    cooldownMs: index * 260,
    shadow: null,
    aiState: 'idle',
    wanderAngle: Math.random() * Math.PI * 2,
    wanderMs: 0,
    memoryMs: 0,
    lastKnownTargetX: spawn.x,
    lastKnownTargetY: spawn.y
  };
}

function resolveSpawnPoint(col: number, row: number, canMoveTo: (x: number, y: number) => boolean): { x: number; y: number } {
  const preferredX = (col + 0.5) * TILE_SIZE;
  const preferredY = (row + 0.5) * TILE_SIZE;
  if (canMoveTo(preferredX, preferredY)) return { x: preferredX, y: preferredY };

  for (let radius = 1; radius <= 8; radius += 1) {
    for (let y = row - radius; y <= row + radius; y += 1) {
      for (let x = col - radius; x <= col + radius; x += 1) {
        if (Math.abs(x - col) !== radius && Math.abs(y - row) !== radius) continue;
        const worldX = (x + 0.5) * TILE_SIZE;
        const worldY = (y + 0.5) * TILE_SIZE;
        if (canMoveTo(worldX, worldY)) return { x: worldX, y: worldY };
      }
    }
  }

  return { x: TILE_SIZE * 2.5, y: TILE_SIZE * 2.5 };
}

function hasLineOfSight(x1: number, y1: number, x2: number, y2: number, isBlockedAt: (x: number, y: number) => boolean): boolean {
  const distance = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(1, Math.ceil(distance / (TILE_SIZE / 3)));

  for (let index = 1; index < steps; index += 1) {
    const t = index / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    if (isBlockedAt(x, y)) return false;
  }

  return true;
}

function distanceBetween(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function tileKey(col: number, row: number): string {
  return `${col},${row}`;
}
