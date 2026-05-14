import {
  BOT_COUNT,
  BOT_SPEED,
  BEAM_COOLDOWN_MS,
  BEAM_RANGE,
  BEAM_SPEED,
  DAWN_DURATION_MS,
  PLAYER_RADIUS,
  PLAYER_SPEED
} from './constants';
import type { BotEntity, Entity, GameOutcome, InputActionState, LightSource, Particle, Projectile } from './types';
import { BOT_SPAWNS, LIGHT_DEFS, MAP_COLS, MAP_ROWS, PLAYER_SPAWN, TILE_SIZE, isWallTile } from '../content/villageMap';

export class GameSimulation {
  readonly player: Entity;
  readonly bots: BotEntity[];
  readonly lights: LightSource[];
  readonly projectiles: Projectile[] = [];
  readonly particles: Particle[] = [];

  dawnMs = 0;
  dawnProgress = 0;
  outcome: GameOutcome = 'playing';
  muzzleFlashMs = 0;
  muzzleX = 0;
  muzzleY = 0;

  private projectileId = 0;

  constructor() {
    this.player = {
      id: 'player',
      x: (PLAYER_SPAWN.col + 0.5) * TILE_SIZE,
      y: (PLAYER_SPAWN.row + 0.5) * TILE_SIZE,
      angle: 0,
      alive: true,
      isPlayer: true,
      cooldownMs: 0,
      shadow: null
    };

    this.bots = BOT_SPAWNS.slice(0, BOT_COUNT).map((spawn, index) => ({
      id: `bot-${index}`,
      x: (spawn.col + 0.5) * TILE_SIZE,
      y: (spawn.row + 0.5) * TILE_SIZE,
      angle: Math.random() * Math.PI * 2,
      alive: true,
      isPlayer: false,
      cooldownMs: index * 260,
      shadow: null,
      aiState: 'wander',
      wanderAngle: Math.random() * Math.PI * 2,
      wanderMs: 0
    }));

    this.lights = LIGHT_DEFS.map((light, index) => ({
      id: `light-${index}`,
      x: light.col * TILE_SIZE,
      y: light.row * TILE_SIZE,
      baseRadius: light.radius,
      radius: light.radius,
      kind: light.kind,
      flickerSeed: index * 0.73
    }));
  }

  update(deltaMs: number, actions: InputActionState): void {
    if (this.outcome !== 'playing') return;

    const dt = deltaMs / 1000;
    this.updateLights();
    this.updatePlayer(deltaMs, dt, actions);
    this.updateBots(deltaMs, dt);
    this.updateShadows();
    this.updateProjectiles(dt);
    this.updateParticles(dt);
    this.updateDawn(deltaMs);
    this.updateOutcome();

    if (this.muzzleFlashMs > 0) this.muzzleFlashMs = Math.max(0, this.muzzleFlashMs - deltaMs);
  }

  firePlayer(): void {
    if (!this.player.alive || this.player.cooldownMs > 0 || this.outcome !== 'playing') return;
    this.fire(this.player);
    this.player.cooldownMs = BEAM_COOLDOWN_MS;
  }

  getAliveCount(): number {
    return this.bots.filter((bot) => bot.alive).length + (this.player.alive ? 1 : 0);
  }

  private updateLights(): void {
    const t = performance.now() / 16.666;
    for (const light of this.lights) {
      const flicker =
        light.kind === 'bonfire'
          ? Math.sin(t * 0.07 + light.flickerSeed) * 16 + Math.sin(t * 0.13 + light.flickerSeed * 2) * 9
          : Math.sin(t * 0.04 + light.flickerSeed) * 5;

      light.radius = light.baseRadius + flicker + this.dawnProgress * 220;
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

      const target = this.findNearestShadowedTarget(bot, 400);
      if (target) {
        bot.aiState = 'hunt';
        bot.wanderAngle = Math.atan2(target.y - bot.y, target.x - bot.x);
        bot.angle = bot.wanderAngle;

        const distance = distanceBetween(bot, target);
        if (distance < 280 && bot.cooldownMs <= 0 && bot.shadow) {
          this.fire(bot);
          bot.cooldownMs = BEAM_COOLDOWN_MS + Math.random() * 1000;
        }
      } else if (bot.wanderMs <= 0) {
        bot.aiState = 'wander';
        bot.wanderAngle += (Math.random() - 0.5) * 2.5;
        bot.angle = bot.wanderAngle;
        bot.wanderMs = 1200 + Math.random() * 2000;
      } else {
        bot.aiState = 'wander';
      }

      const dx = Math.cos(bot.wanderAngle) * BOT_SPEED * dt;
      const dy = Math.sin(bot.wanderAngle) * BOT_SPEED * dt;
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

  private updateProjectiles(dt: number): void {
    for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = this.projectiles[index];
      projectile.trail.push({ x: projectile.x, y: projectile.y });
      if (projectile.trail.length > 14) projectile.trail.shift();

      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      projectile.traveled += BEAM_SPEED * dt;

      if (projectile.traveled > BEAM_RANGE || isBlocked(projectile.x, projectile.y)) {
        this.spawnParticles(projectile.x, projectile.y, false);
        this.projectiles.splice(index, 1);
        continue;
      }

      const victim = this.entities().find((entity) => {
        if (!entity.alive || entity.id === projectile.ownerId || !entity.shadow) return false;
        return Math.hypot(entity.x - projectile.x, entity.y - projectile.y) < PLAYER_RADIUS + 7;
      });

      if (victim) {
        victim.alive = false;
        this.spawnParticles(victim.x, victim.y, true);
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
    this.dawnMs = Math.min(DAWN_DURATION_MS, this.dawnMs + deltaMs);
    this.dawnProgress = this.dawnMs / DAWN_DURATION_MS;
  }

  private updateOutcome(): void {
    if (!this.player.alive) {
      this.outcome = 'lost';
      return;
    }

    if (this.bots.every((bot) => !bot.alive)) {
      this.outcome = 'won';
    }
  }

  private fire(shooter: Entity): void {
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
      if (distance < maxDistance && distance < closestDistance && hasLineOfSight(bot.x, bot.y, entity.x, entity.y)) {
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
    if (!canMove(nx, ny, PLAYER_RADIUS)) return false;
    entity.x = nx;
    entity.y = ny;
    return true;
  }

  private entities(): Entity[] {
    return [this.player, ...this.bots];
  }
}

function normalize(x: number, y: number): { x: number; y: number } {
  const length = Math.hypot(x, y);
  if (length === 0) return { x: 0, y: 0 };
  return { x: x / length, y: y / length };
}

function canMove(x: number, y: number, radius: number): boolean {
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

  return points.every(([px, py]) => !isBlocked(px, py));
}

function isBlocked(x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= MAP_COLS * TILE_SIZE || y >= MAP_ROWS * TILE_SIZE) return true;
  return isWallTile(Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE));
}

function hasLineOfSight(x1: number, y1: number, x2: number, y2: number): boolean {
  const distance = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(1, Math.ceil(distance / (TILE_SIZE / 3)));

  for (let index = 1; index < steps; index += 1) {
    const t = index / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    if (isBlocked(x, y)) return false;
  }

  return true;
}

function distanceBetween(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
