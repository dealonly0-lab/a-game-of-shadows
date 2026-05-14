import Phaser from 'phaser';
import { BOT_COUNT, BEAM_COOLDOWN_MS, PLAYER_RADIUS } from '../../game/simulation/constants';
import { GameSimulation } from '../../game/simulation/GameSimulation';
import { MAP_DATA, MAP_HEIGHT, MAP_WIDTH, MAP_COLS, MAP_ROWS, TILE_SIZE, TileKind, isWallTile } from '../../game/content/villageMap';
import { buildWallSegments, Raycaster } from '../../game/simulation/raycast';
import type { Entity, InputActionState, LightSource } from '../../game/simulation/types';
import { GameAudio } from '../audio/GameAudio';

type ImpactRipple = {
  x: number;
  y: number;
  ageMs: number;
  durationMs: number;
  color: number;
  maxRadius: number;
};

type HudRefs = {
  root: HTMLDivElement;
  title: HTMLDivElement;
  gameOver: HTMLDivElement;
  debug: HTMLDivElement;
  souls: HTMLSpanElement;
  phase: HTMLDivElement;
  beam: HTMLDivElement;
  dangerFill: HTMLDivElement;
  status: HTMLDivElement;
  dawnFill: HTMLDivElement;
  gameOverTitle: HTMLHeadingElement;
  gameOverMessage: HTMLParagraphElement;
};

export class GameScene extends Phaser.Scene {
  private simulation!: GameSimulation;
  private raycaster!: Raycaster;
  private audio!: GameAudio;
  private hud!: HudRefs;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  private worldLayer!: Phaser.GameObjects.Graphics;
  private lightVisualLayer!: Phaser.GameObjects.Graphics;
  private shadowLayer!: Phaser.GameObjects.Graphics;
  private entityLayer!: Phaser.GameObjects.Graphics;
  private projectileLayer!: Phaser.GameObjects.Graphics;
  private particleLayer!: Phaser.GameObjects.Graphics;
  private feedbackLayer!: Phaser.GameObjects.Graphics;
  private debugLayer!: Phaser.GameObjects.Graphics;
  private minimapLayer!: Phaser.GameObjects.Graphics;
  private darkness!: Phaser.GameObjects.RenderTexture;
  private eraseLayer!: Phaser.GameObjects.Graphics;
  private dawnOverlay!: Phaser.GameObjects.Rectangle;

  private isStarted = false;
  private debugEnabled = false;
  private pointerWasDown = false;
  private debugKeyWasDown = false;
  private impactRipples: ImpactRipple[] = [];
  private lastCountdownSecond = 0;
  private lastExposedPulseMs = 0;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.simulation = new GameSimulation();
    this.raycaster = new Raycaster(buildWallSegments(isWallTile, MAP_COLS, MAP_ROWS, TILE_SIZE));
    this.audio = new GameAudio();

    this.createHud();
    this.createRenderLayers();
    this.drawMap();
    this.setupInput();
    this.configureCamera();
  }

  update(_time: number, deltaMs: number): void {
    if (!this.isStarted) return;

    const actions = this.readActions();
    this.simulation.update(deltaMs, actions);
    this.handleGameplayEvents();
    this.updateDebugToggle();
    this.updateImpactRipples(deltaMs);

    this.updateCamera(deltaMs / 1000);
    this.renderLights();
    this.renderShadows();
    this.renderEntities();
    this.renderProjectiles();
    this.renderParticles();
    this.renderFeedback();
    this.renderDarkness();
    this.renderDebug();
    this.renderMinimap();
    this.updateHud();

    if (this.simulation.outcome !== 'playing') {
      this.showGameOver();
    }
  }

  private createHud(): void {
    const hud = document.createElement('div');
    hud.className = 'hud';
    hud.innerHTML = `
      <div class="hud__top">
        <div><span id="souls-count">8</span> REMAIN</div>
        <div id="phase-display" class="hud__phase">NIGHT</div>
        <div id="beam-display" class="hud__beam">BEAM READY</div>
      </div>
      <div id="status-display" class="hud__status"></div>
      <div class="hud__bottom">
        <div class="hud__danger"><div id="danger-fill" class="hud__danger-fill"></div></div>
        <div class="hud__bar"><div id="dawn-fill" class="hud__fill"></div></div>
        <div class="hud__hint">WASD - Move - Mouse - Aim - Click - Fire - F1 - Debug</div>
      </div>
      <div id="debug-panel" class="debug-panel is-hidden"></div>
    `;

    const title = document.createElement('div');
    title.className = 'title';
    title.innerHTML = `
      <div class="title__inner">
        <div class="title__eyebrow">A Game of Shadows</div>
        <h1 class="title__name">HOLLOW</h1>
        <div class="title__tagline">"Don't step in the light."</div>
        <button id="start-button" class="button" type="button">Enter the Village</button>
      </div>
    `;

    const gameOver = document.createElement('div');
    gameOver.className = 'game-over is-hidden';
    gameOver.innerHTML = `
      <div class="game-over__inner">
        <h2 id="game-over-title" class="title__name">YOUR SHADOW FADES</h2>
        <p id="game-over-message" class="game-over__message">The light found you.</p>
        <button id="restart-button" class="button" type="button">Play Again</button>
      </div>
    `;

    document.body.append(hud, title, gameOver);

    title.querySelector<HTMLButtonElement>('#start-button')?.addEventListener('click', () => {
      void this.audio.unlock();
      title.classList.add('is-hidden');
      this.isStarted = true;
    });

    gameOver.querySelector<HTMLButtonElement>('#restart-button')?.addEventListener('click', () => {
      this.restartRound();
    });

    this.hud = {
      root: hud,
      title,
      gameOver,
      debug: hud.querySelector<HTMLDivElement>('#debug-panel')!,
      souls: hud.querySelector<HTMLSpanElement>('#souls-count')!,
      phase: hud.querySelector<HTMLDivElement>('#phase-display')!,
      beam: hud.querySelector<HTMLDivElement>('#beam-display')!,
      dangerFill: hud.querySelector<HTMLDivElement>('#danger-fill')!,
      status: hud.querySelector<HTMLDivElement>('#status-display')!,
      dawnFill: hud.querySelector<HTMLDivElement>('#dawn-fill')!,
      gameOverTitle: gameOver.querySelector<HTMLHeadingElement>('#game-over-title')!,
      gameOverMessage: gameOver.querySelector<HTMLParagraphElement>('#game-over-message')!
    };
  }

  private createRenderLayers(): void {
    this.worldLayer = this.add.graphics().setDepth(1);
    this.lightVisualLayer = this.add.graphics().setDepth(3);
    this.shadowLayer = this.add.graphics().setDepth(5);
    this.entityLayer = this.add.graphics().setDepth(6);
    this.projectileLayer = this.add.graphics().setDepth(7);
    this.particleLayer = this.add.graphics().setDepth(8);
    this.feedbackLayer = this.add.graphics().setDepth(9);
    this.darkness = this.add.renderTexture(0, 0, this.scale.width, this.scale.height).setOrigin(0, 0).setScrollFactor(0).setDepth(20);
    this.eraseLayer = this.add.graphics().setVisible(false);
    this.dawnOverlay = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x1f0900, 0).setOrigin(0, 0).setScrollFactor(0).setDepth(21);
    this.debugLayer = this.add.graphics().setDepth(30);
    this.minimapLayer = this.add.graphics().setDepth(31).setScrollFactor(0);
  }

  private setupInput(): void {
    if (!this.input.keyboard) throw new Error('Keyboard input is unavailable.');

    this.keys = this.input.keyboard.addKeys({
      W: Phaser.Input.Keyboard.KeyCodes.W,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      UP: Phaser.Input.Keyboard.KeyCodes.UP,
      DOWN: Phaser.Input.Keyboard.KeyCodes.DOWN,
      LEFT: Phaser.Input.Keyboard.KeyCodes.LEFT,
      RIGHT: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      F1: Phaser.Input.Keyboard.KeyCodes.F1
    }) as Record<string, Phaser.Input.Keyboard.Key>;

    this.input.keyboard.on('keydown-F1', (event: KeyboardEvent) => event.preventDefault());
  }

  private configureCamera(): void {
    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.cameras.main.centerOn(this.simulation.player.x, this.simulation.player.y);
  }

  private restartRound(): void {
    this.simulation = new GameSimulation();
    this.hud.gameOver.classList.add('is-hidden');
    this.isStarted = true;
    this.lastCountdownSecond = 0;
    this.lastExposedPulseMs = 0;
    void this.audio.unlock();
    this.configureCamera();
  }

  private updateDebugToggle(): void {
    const isDown = this.keys.F1.isDown;
    if (isDown && !this.debugKeyWasDown) {
      this.debugEnabled = !this.debugEnabled;
      this.hud.debug.classList.toggle('is-hidden', !this.debugEnabled);
      this.debugLayer.clear();
    }

    this.debugKeyWasDown = isDown;
  }

  private readActions(): InputActionState {
    const pointer = this.input.activePointer;
    const camera = this.cameras.main;
    const firePressed = pointer.isDown && !this.pointerWasDown;
    this.pointerWasDown = pointer.isDown;

    return {
      moveX: (this.keys.D.isDown || this.keys.RIGHT.isDown ? 1 : 0) - (this.keys.A.isDown || this.keys.LEFT.isDown ? 1 : 0),
      moveY: (this.keys.S.isDown || this.keys.DOWN.isDown ? 1 : 0) - (this.keys.W.isDown || this.keys.UP.isDown ? 1 : 0),
      aimX: pointer.x + camera.scrollX,
      aimY: pointer.y + camera.scrollY,
      firePressed
    };
  }

  private updateCamera(dt: number): void {
    const camera = this.cameras.main;
    const targetX = Phaser.Math.Clamp(this.simulation.player.x - camera.width / 2, 0, Math.max(0, MAP_WIDTH - camera.width));
    const targetY = Phaser.Math.Clamp(this.simulation.player.y - camera.height / 2, 0, Math.max(0, MAP_HEIGHT - camera.height));
    const lerp = Math.min(1, dt * 7);
    camera.setScroll(camera.scrollX + (targetX - camera.scrollX) * lerp, camera.scrollY + (targetY - camera.scrollY) * lerp);
  }

  private drawMap(): void {
    const g = this.worldLayer.clear();
    for (let row = 0; row < MAP_ROWS; row += 1) {
      for (let col = 0; col < MAP_COLS; col += 1) {
        this.drawTile(g, col, row, MAP_DATA[row][col]);
      }
    }
  }

  private drawTile(g: Phaser.GameObjects.Graphics, col: number, row: number, tile: TileKind): void {
    const x = col * TILE_SIZE;
    const y = row * TILE_SIZE;

    if (tile === TileKind.Floor) {
      g.fillStyle((col ^ row) & 1 ? 0x141020 : 0x111018, 1);
      g.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      g.lineStyle(1, 0x1b1528, 1).strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      return;
    }

    if (tile === TileKind.Wall) {
      g.fillStyle(0x1b1228, 1).fillRect(x, y, TILE_SIZE, TILE_SIZE);
      g.fillStyle(0x120d1c, 1).fillRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);
      g.lineStyle(1, 0x28193a, 1).strokeRect(x, y, TILE_SIZE, TILE_SIZE);
      return;
    }

    g.fillStyle(0x111018, 1).fillRect(x, y, TILE_SIZE, TILE_SIZE);

    if (tile === TileKind.Grave) {
      const cx = x + TILE_SIZE / 2;
      const cy = y + TILE_SIZE * 0.58;
      g.fillStyle(0x272040, 1).fillRect(cx - 8, cy - 4, 16, 17).fillCircle(cx, cy - 4, 8);
      g.lineStyle(1, 0x5a4070, 1).lineBetween(cx, cy - 11, cx, cy + 5).lineBetween(cx - 6, cy - 3, cx + 6, cy - 3);
      return;
    }

    if (tile === TileKind.Tree) {
      const cx = x + TILE_SIZE / 2;
      const cy = y + TILE_SIZE * 0.72;
      g.lineStyle(4, 0x181020, 1).lineBetween(cx, cy + 10, cx, cy - 20);
      g.lineStyle(2, 0x181020, 1).lineBetween(cx, cy - 10, cx - 16, cy - 24).lineBetween(cx, cy - 15, cx + 14, cy - 26);
    }
  }

  private renderLights(): void {
    const g = this.lightVisualLayer.clear();
    const frame = this.game.loop.frame;

    for (const light of this.simulation.lights) {
      if (light.kind === 'bonfire') {
        this.drawBonfire(g, light, frame);
      } else {
        g.lineStyle(2.5, 0x3a2212, 1).lineBetween(light.x, light.y + 6, light.x, light.y + 22);
        g.fillStyle(0x2a1e08, 1).fillRect(light.x - 5, light.y - 5, 10, 10);
        g.fillStyle(0xffee88, 1).fillCircle(light.x, light.y, 3.5);
        g.fillStyle(0xffcc44, 0.5).fillCircle(light.x, light.y, 7);
      }
    }
  }

  private drawBonfire(g: Phaser.GameObjects.Graphics, light: LightSource, frame: number): void {
    for (let layer = 5; layer >= 0; layer -= 1) {
      const height = (9 + Math.sin(frame * 0.14 + layer * 0.9) * 4) * (1 - layer * 0.13);
      const width = 5.5 - layer * 0.5;
      const offsetX = Math.sin(frame * 0.12 + layer) * 2.5;
      const green = Math.floor(70 + layer * 35 + Math.sin(frame * 0.07 + layer) * 15);
      g.fillStyle(Phaser.Display.Color.GetColor(255, green, 0), 0.85 - layer * 0.1);
      g.fillEllipse(light.x + offsetX, light.y - height * layer * 0.26, width * 2, height * 1.1);
    }

    g.fillStyle(0x2d1402, 1).fillRect(light.x - 8, light.y + 2, 16, 5);
  }

  private renderShadows(): void {
    const g = this.shadowLayer.clear();
    for (const entity of this.entities()) {
      if (!entity.alive || !entity.shadow) continue;

      const s = entity.shadow;
      const opacity = Math.min(0.9, 0.28 + (s.length / 110) * 0.62);
      const px = -s.ny;
      const py = s.nx;
      const endX = entity.x + s.nx * s.length;
      const endY = entity.y + s.ny * s.length;
      const color = entity.isPlayer ? 0x4a8adc : 0xcc5028;

      g.fillStyle(color, opacity);
      g.fillTriangle(entity.x + px * 11, entity.y + py * 11, entity.x - px * 11, entity.y - py * 11, endX, endY);
      g.fillEllipse(entity.x, entity.y, 20, 12);
      g.fillStyle(color, opacity * 0.25);
      g.fillTriangle(entity.x + px * 13, entity.y + py * 13, entity.x - px * 13, entity.y - py * 13, entity.x + s.nx * s.length * 1.3, entity.y + s.ny * s.length * 1.3);
    }
  }

  private renderEntities(): void {
    const g = this.entityLayer.clear();
    for (const entity of this.entities()) {
      if (!entity.alive) continue;

      const inLight = Boolean(entity.shadow);
      const color = entity.isPlayer ? 0x80b4ff : 0xe06040;
      const alpha = entity.isPlayer ? (inLight ? 0.56 : 0.22) : inLight ? 0.5 : 0.04;
      this.drawEntitySilhouette(g, entity, color, alpha);

      if (entity.isPlayer) {
        if (this.simulation.isPlayerProtected()) {
          g.lineStyle(2, 0x90c8ff, 0.52);
          g.strokeCircle(entity.x, entity.y, PLAYER_RADIUS + 11);
        }
        this.drawAim(g, entity);
      }
    }
  }

  private drawEntitySilhouette(g: Phaser.GameObjects.Graphics, entity: Entity, color: number, alpha: number): void {
    const noseX = Math.cos(entity.angle) * 12;
    const noseY = Math.sin(entity.angle) * 12;
    const sideX = Math.cos(entity.angle + Math.PI / 2) * 7;
    const sideY = Math.sin(entity.angle + Math.PI / 2) * 7;

    g.fillStyle(color, alpha * 0.42);
    g.fillCircle(entity.x, entity.y, PLAYER_RADIUS + 5);
    g.fillStyle(color, alpha);
    g.fillTriangle(
      entity.x + noseX,
      entity.y + noseY,
      entity.x - noseX * 0.55 + sideX,
      entity.y - noseY * 0.55 + sideY,
      entity.x - noseX * 0.55 - sideX,
      entity.y - noseY * 0.55 - sideY
    );
    g.fillStyle(0xffffff, entity.isPlayer ? alpha * 0.36 : alpha * 0.18);
    g.fillCircle(entity.x + noseX * 0.35, entity.y + noseY * 0.35, 2);
  }

  private drawAim(g: Phaser.GameObjects.Graphics, entity: Entity): void {
    const ready = entity.cooldownMs <= 0;
    g.lineStyle(1, 0x80c0ff, ready ? 0.38 : 0.15);
    g.lineBetween(entity.x, entity.y, entity.x + Math.cos(entity.angle) * 70, entity.y + Math.sin(entity.angle) * 70);

    if (!ready) {
      const progress = 1 - entity.cooldownMs / BEAM_COOLDOWN_MS;
      g.lineStyle(2, 0x80c0ff, 0.5);
      g.beginPath();
      g.arc(entity.x, entity.y, 17, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2, false, 0.02);
      g.strokePath();
    }
  }

  private renderProjectiles(): void {
    const g = this.projectileLayer.clear();
    for (const projectile of this.simulation.projectiles) {
      for (let i = 1; i < projectile.trail.length; i += 1) {
        const t = i / projectile.trail.length;
        g.lineStyle(t * 5, 0x90ccff, t * 0.5);
        g.lineBetween(projectile.trail[i - 1].x, projectile.trail[i - 1].y, projectile.trail[i].x, projectile.trail[i].y);
      }

      g.fillStyle(0xb8deff, 0.35).fillCircle(projectile.x, projectile.y, 16);
      g.fillStyle(0xddeeff, 0.8).fillCircle(projectile.x, projectile.y, 7);
      g.fillStyle(0xffffff, 1).fillCircle(projectile.x, projectile.y, 3);
    }
  }

  private renderParticles(): void {
    const g = this.particleLayer.clear();
    for (const particle of this.simulation.particles) {
      g.fillStyle(particle.color, particle.life * 0.9).fillCircle(particle.x, particle.y, particle.radius);
    }
  }

  private handleGameplayEvents(): void {
    for (const event of this.simulation.consumeEvents()) {
      if (event.type === 'beam-fired') {
        this.audio.playBeam(event.isPlayer);
        if (event.isPlayer) this.cameras.main.shake(55, 0.0016);
        this.impactRipples.push({ x: event.x, y: event.y, ageMs: 0, durationMs: 180, color: 0x90c8ff, maxRadius: 26 });
      }

      if (event.type === 'beam-impact') {
        this.audio.playImpact();
        this.impactRipples.push({ x: event.x, y: event.y, ageMs: 0, durationMs: 240, color: 0x90c8ff, maxRadius: 34 });
      }

      if (event.type === 'entity-killed') {
        this.audio.playKill(event.byPlayer);
        this.cameras.main.shake(event.byPlayer ? 170 : 230, event.byPlayer ? 0.004 : 0.006);
        this.impactRipples.push({ x: event.x, y: event.y, ageMs: 0, durationMs: 520, color: event.byPlayer ? 0xd4a843 : 0xe06040, maxRadius: 72 });
      }
    }
  }

  private updateImpactRipples(deltaMs: number): void {
    for (let index = this.impactRipples.length - 1; index >= 0; index -= 1) {
      this.impactRipples[index].ageMs += deltaMs;
      if (this.impactRipples[index].ageMs >= this.impactRipples[index].durationMs) this.impactRipples.splice(index, 1);
    }
  }

  private renderFeedback(): void {
    const g = this.feedbackLayer.clear();
    for (const ripple of this.impactRipples) {
      const t = ripple.ageMs / ripple.durationMs;
      const radius = 4 + ripple.maxRadius * t;
      const alpha = Math.max(0, 1 - t);
      g.lineStyle(2, ripple.color, alpha * 0.85);
      g.strokeCircle(ripple.x, ripple.y, radius);
      g.lineStyle(1, ripple.color, alpha * 0.38);
      g.strokeCircle(ripple.x, ripple.y, radius * 0.62);
    }
  }

  private renderDarkness(): void {
    const camera = this.cameras.main;
    const baseAlpha = Math.max(0.04, 0.97 - this.simulation.dawnProgress * 0.88);
    this.darkness.setSize(this.scale.width, this.scale.height);
    this.darkness.clear();
    this.darkness.fill(0x020008, baseAlpha);

    const erase = this.eraseLayer.clear();
    const viewport = {
      x: camera.scrollX,
      y: camera.scrollY,
      width: camera.width,
      height: camera.height
    };

    const player = this.simulation.player;
    erase.fillStyle(0xffffff, 0.28).fillCircle(player.x - camera.scrollX, player.y - camera.scrollY, 35);

    const lights = [...this.simulation.lights];
    if (this.simulation.muzzleFlashMs > 0) {
      lights.push({
        id: 'muzzle',
        x: this.simulation.muzzleX,
        y: this.simulation.muzzleY,
        baseRadius: 95,
        radius: 95 * (this.simulation.muzzleFlashMs / 160),
        kind: 'flash',
        flickerSeed: 0
      });
    }

    for (const light of lights) {
      if (light.x < viewport.x - light.radius || light.x > viewport.x + viewport.width + light.radius) continue;
      if (light.y < viewport.y - light.radius || light.y > viewport.y + viewport.height + light.radius) continue;

      const worldPolygon = this.raycaster.getVisibility(light.x, light.y, light.radius, viewport);
      if (worldPolygon.length < 3) continue;

      erase.fillStyle(0xffffff, 1);
      erase.fillPoints(
        worldPolygon.map((point) => ({ x: point.x - camera.scrollX, y: point.y - camera.scrollY })),
        true,
        true
      );
      erase.fillStyle(0xffffff, 0.55).fillCircle(light.x - camera.scrollX, light.y - camera.scrollY, light.radius * 0.18);
    }

    this.darkness.erase(erase, 0, 0);
    this.dawnOverlay.setSize(this.scale.width, this.scale.height);
    this.dawnOverlay.setFillStyle(0x1f0900, this.simulation.dawnProgress * 0.28);
  }

  private renderDebug(): void {
    const g = this.debugLayer.clear();
    if (!this.debugEnabled) return;

    for (let row = 0; row < MAP_ROWS; row += 1) {
      for (let col = 0; col < MAP_COLS; col += 1) {
        if (MAP_DATA[row][col] !== TileKind.Wall) continue;
        g.lineStyle(1, 0x44ff88, 0.26);
        g.strokeRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }

    for (const light of this.simulation.lights) {
      g.lineStyle(1, light.kind === 'bonfire' ? 0xff8844 : 0xffdd88, 0.32);
      g.strokeCircle(light.x, light.y, light.radius);
    }

    for (const entity of this.entities()) {
      if (!entity.alive) continue;
      g.lineStyle(1, entity.isPlayer ? 0x80b4ff : 0xff6040, 0.8);
      g.strokeCircle(entity.x, entity.y, PLAYER_RADIUS);

      if (entity.shadow) {
        g.lineStyle(2, entity.isPlayer ? 0x80b4ff : 0xff6040, 0.55);
        g.lineBetween(entity.x, entity.y, entity.x + entity.shadow.nx * entity.shadow.length, entity.y + entity.shadow.ny * entity.shadow.length);
      }
    }
  }

  private renderMinimap(): void {
    const g = this.minimapLayer.clear();
    const width = 184;
    const height = Math.round(width * (MAP_HEIGHT / MAP_WIDTH));
    const x = this.scale.width - width - 24;
    const y = this.scale.height - height - 24;
    const sx = width / MAP_WIDTH;
    const sy = height / MAP_HEIGHT;

    g.fillStyle(0x020008, 0.72);
    g.fillRect(x, y, width, height);
    g.lineStyle(1, 0xd4a843, 0.34);
    g.strokeRect(x, y, width, height);

    for (let row = 0; row < MAP_ROWS; row += 1) {
      for (let col = 0; col < MAP_COLS; col += 1) {
        const tile = MAP_DATA[row][col];
        if (tile === TileKind.Wall) {
          g.fillStyle(0x433052, 0.82);
        } else if (tile === TileKind.Grave || tile === TileKind.Tree) {
          g.fillStyle(0x2d2440, 0.72);
        } else {
          continue;
        }

        g.fillRect(x + col * TILE_SIZE * sx, y + row * TILE_SIZE * sy, Math.ceil(TILE_SIZE * sx), Math.ceil(TILE_SIZE * sy));
      }
    }

    for (const light of this.simulation.lights) {
      g.fillStyle(light.kind === 'bonfire' ? 0xff8844 : 0xffdd88, 0.75);
      g.fillCircle(x + light.x * sx, y + light.y * sy, light.kind === 'bonfire' ? 2.4 : 1.8);
    }

    const camera = this.cameras.main;
    g.lineStyle(1, 0x90c8ff, 0.56);
    g.strokeRect(x + camera.scrollX * sx, y + camera.scrollY * sy, camera.width * sx, camera.height * sy);

    for (const bot of this.simulation.bots) {
      if (!bot.alive) continue;
      g.fillStyle(bot.shadow || this.debugEnabled ? 0xe06040 : 0x5a2a24, bot.shadow || this.debugEnabled ? 0.95 : 0.42);
      g.fillCircle(x + bot.x * sx, y + bot.y * sy, 2);
    }

    const player = this.simulation.player;
    if (player.alive) {
      g.fillStyle(0x80b4ff, 1);
      g.fillCircle(x + player.x * sx, y + player.y * sy, 3.2);
    }
  }

  private updateHud(): void {
    const progress = this.simulation.dawnProgress;
    this.hud.souls.textContent = String(this.simulation.getAliveCount());
    this.hud.dawnFill.style.width = `${Math.round(progress * 100)}%`;
    this.hud.dangerFill.style.width = `${Math.round(this.simulation.getPlayerDangerLevel() * 100)}%`;
    this.hud.root.classList.toggle('is-exposed', Boolean(this.simulation.player.shadow) && !this.simulation.isPlayerProtected());
    this.hud.root.classList.toggle('is-protected', this.simulation.isPlayerProtected());

    if (this.simulation.matchPhase === 'countdown') {
      const count = Math.max(1, Math.ceil(this.simulation.countdownMs / 1000));
      if (count !== this.lastCountdownSecond) {
        this.audio.playCountdownTick();
        this.lastCountdownSecond = count;
      }
      this.hud.status.textContent = `MATCH STARTS IN ${count}`;
      this.hud.status.classList.remove('is-hidden');
    } else if (this.simulation.isPlayerProtected()) {
      if (this.lastCountdownSecond !== -1) {
        this.audio.playRoundStart();
        this.lastCountdownSecond = -1;
      }
      const shield = Math.ceil(this.simulation.playerSpawnGraceMs / 1000);
      this.hud.status.textContent = `SHADOW VEIL ${shield}`;
      this.hud.status.classList.remove('is-hidden');
    } else {
      this.hud.status.classList.add('is-hidden');
    }

    if (this.simulation.matchPhase === 'countdown') {
      this.hud.phase.textContent = 'READY';
      this.hud.phase.style.color = '#80b4ff';
    } else if (progress < 0.3) {
      this.hud.phase.textContent = 'NIGHT';
      this.hud.phase.style.color = '#806040';
    } else if (progress < 0.65) {
      this.hud.phase.textContent = 'TWILIGHT';
      this.hud.phase.style.color = '#c08040';
    } else {
      this.hud.phase.textContent = 'DAWN';
      this.hud.phase.style.color = '#d4a843';
    }

    const cooldown = this.simulation.player.cooldownMs;
    if (this.simulation.matchPhase === 'countdown') {
      this.hud.beam.textContent = 'BEAM LOCKED';
      this.hud.beam.style.color = 'rgba(144,200,255,0.56)';
    } else if (cooldown > 0) {
      this.hud.beam.textContent = `CHARGING ${Math.min(99, Math.ceil((1 - cooldown / BEAM_COOLDOWN_MS) * 100))}%`;
      this.hud.beam.style.color = 'rgba(90,120,180,0.72)';
    } else {
      this.hud.beam.textContent = 'BEAM READY';
      this.hud.beam.style.color = 'rgba(180,220,255,0.8)';
    }

    if (this.debugEnabled) {
      const shadowedBots = this.simulation.bots.filter((bot) => bot.alive && bot.shadow).length;
      const huntingBots = this.simulation.bots.filter((bot) => bot.alive && bot.aiState === 'hunt').length;
      const investigatingBots = this.simulation.bots.filter((bot) => bot.alive && bot.aiState === 'investigate').length;
      this.hud.debug.innerHTML = [
        `FPS ${Math.round(this.game.loop.actualFps)}`,
        `STATE ${this.simulation.outcome}`,
        `PHASE ${this.simulation.matchPhase}`,
        `ALIVE ${this.simulation.getAliveCount()} / ${BOT_COUNT + 1}`,
        `MATCH ${Math.round(this.simulation.matchElapsedMs / 1000)}s`,
        `COUNTDOWN ${Math.round(this.simulation.countdownMs / 1000)}s`,
        `VEIL ${Math.round(this.simulation.playerSpawnGraceMs / 1000)}s`,
        `DAWN ${Math.round(this.simulation.dawnProgress * 100)}%`,
        `DANGER ${Math.round(this.simulation.getPlayerDangerLevel() * 100)}%`,
        `PLAYER ${Math.round(this.simulation.player.x)}, ${Math.round(this.simulation.player.y)}`,
        `EXPOSED ${this.simulation.player.shadow ? 'YES' : 'NO'}`,
        `BOTS SHADOWED ${shadowedBots}`,
        `BOTS HUNTING ${huntingBots}`,
        `BOTS INVESTIGATING ${investigatingBots}`,
        `BEAMS ${this.simulation.projectiles.length}`,
        `PARTICLES ${this.simulation.particles.length}`
      ].join('<br>');
    }

    const danger = this.simulation.getPlayerDangerLevel();
    if (danger > 0.15 && this.simulation.matchElapsedMs - this.lastExposedPulseMs > 520) {
      this.audio.playExposedPulse(danger);
      this.lastExposedPulseMs = this.simulation.matchElapsedMs;
    }
  }

  private showGameOver(): void {
    if (!this.hud.gameOver.classList.contains('is-hidden')) return;

    const won = this.simulation.outcome === 'won';
    this.hud.gameOverTitle.textContent = won ? 'LAST SHADOW STANDING' : 'YOUR SHADOW FADES';
    this.hud.gameOverTitle.style.color = won ? '#d4a843' : '#7a2a14';
    this.hud.gameOverMessage.textContent = won ? 'You survived the night. The village is yours.' : 'The light found you. You are consumed.';
    this.hud.gameOver.classList.remove('is-hidden');
  }

  private entities(): Entity[] {
    return [this.simulation.player, ...this.simulation.bots];
  }
}
