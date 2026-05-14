export type Vec2 = {
  x: number;
  y: number;
};

export type Segment = {
  a: Vec2;
  b: Vec2;
};

export type LightKind = 'lantern' | 'bonfire' | 'flash';

export type LightSource = {
  id: string;
  x: number;
  y: number;
  baseRadius: number;
  radius: number;
  kind: LightKind;
  flickerSeed: number;
};

export type ShadowState = {
  length: number;
  nx: number;
  ny: number;
};

export type Entity = {
  id: string;
  x: number;
  y: number;
  angle: number;
  alive: boolean;
  isPlayer: boolean;
  cooldownMs: number;
  shadow: ShadowState | null;
};

export type BotEntity = Entity & {
  isPlayer: false;
  aiState: 'wander' | 'hunt';
  wanderAngle: number;
  wanderMs: number;
};

export type Projectile = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: string;
  traveled: number;
  trail: Vec2[];
};

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  radius: number;
  color: number;
};

export type InputActionState = {
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
  firePressed: boolean;
};

export type GameOutcome = 'playing' | 'won' | 'lost';
