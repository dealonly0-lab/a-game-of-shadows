import { BOT_SPAWNS, LIGHT_DEFS, PLAYER_SPAWN } from './villageMap';

export type SpawnDef = {
  col: number;
  row: number;
};

export type MatchLightDef = {
  col: number;
  row: number;
  radius: number;
  kind: 'lantern' | 'bonfire';
};

export type MatchVariant = {
  seed: number;
  name: string;
  threatLabel: string;
  difficulty: number;
  dawnDurationMs: number;
  botCount: number;
  botSpeedMultiplier: number;
  botRangeMultiplier: number;
  botCooldownMultiplier: number;
  lightRadiusMultiplier: number;
  playerSpawn: SpawnDef;
  botSpawns: SpawnDef[];
  lights: MatchLightDef[];
  sealedTiles: SpawnDef[];
};

type DirectorInput = {
  playerLevel: number;
  matchesPlayed: number;
};

const PLAYER_SPAWNS: SpawnDef[] = [
  PLAYER_SPAWN,
  { col: 8, row: 27 },
  { col: 14, row: 18 },
  { col: 25, row: 30 },
  { col: 42, row: 28 },
  { col: 55, row: 18 },
  { col: 50, row: 8 },
  { col: 18, row: 9 }
];

const EXTRA_BOT_SPAWNS: SpawnDef[] = [
  { col: 8, row: 10 },
  { col: 14, row: 28 },
  { col: 28, row: 10 },
  { col: 35, row: 27 },
  { col: 50, row: 18 },
  { col: 58, row: 27 },
  { col: 43, row: 9 }
];

const SEALED_TILE_CANDIDATES: SpawnDef[] = [
  { col: 10, row: 15 },
  { col: 10, row: 22 },
  { col: 17, row: 18 },
  { col: 25, row: 10 },
  { col: 35, row: 14 },
  { col: 35, row: 22 },
  { col: 45, row: 18 },
  { col: 54, row: 12 },
  { col: 54, row: 24 },
  { col: 27, row: 29 },
  { col: 43, row: 29 },
  { col: 58, row: 10 }
];

const VARIANT_NAMES = [
  'Black Lanterns',
  'Ash Roads',
  'Broken Chapel',
  'Witching Fog',
  'Dawn Pressure',
  'Hollow Market'
] as const;

export function createMatchVariant(input: DirectorInput): MatchVariant {
  const seed = createSeed(input);
  const rng = mulberry32(seed);
  const difficulty = Math.min(8, 1 + Math.floor(input.matchesPlayed / 4) + Math.floor(input.playerLevel / 5));
  const name = pick(VARIANT_NAMES, rng);
  const pressure = difficulty - 1;

  const playerSpawn = pickUnique(PLAYER_SPAWNS, 1, rng)[0];
  const botSpawns = shuffle([...BOT_SPAWNS, ...EXTRA_BOT_SPAWNS], rng).filter((spawn) => distanceTiles(spawn, playerSpawn) > 9);
  const sealedCount = Math.min(8, 2 + Math.floor(difficulty / 2));
  const sealedTiles = pickUnique(
    SEALED_TILE_CANDIDATES.filter((tile) => distanceTiles(tile, playerSpawn) > 5),
    sealedCount,
    rng
  );

  const lights = LIGHT_DEFS.map((light, index) => {
    const dimChance = light.kind === 'lantern' ? 0.22 + difficulty * 0.025 : 0.08;
    const radiusMultiplier = rng() < dimChance ? 0.72 : 0.92 + rng() * 0.22;
    return {
      col: light.col,
      row: light.row,
      kind: light.kind,
      radius: Math.round(light.radius * radiusMultiplier + (index % 3) * difficulty)
    };
  });

  return {
    seed,
    name,
    threatLabel: threatLabel(difficulty),
    difficulty,
    dawnDurationMs: Math.max(42_000, 72_000 - pressure * 4_000),
    botCount: Math.min(10, 7 + Math.floor(difficulty / 3)),
    botSpeedMultiplier: 1 + pressure * 0.035,
    botRangeMultiplier: 1 + pressure * 0.045,
    botCooldownMultiplier: Math.max(0.72, 1 - pressure * 0.035),
    lightRadiusMultiplier: 1 + pressure * 0.025,
    playerSpawn,
    botSpawns,
    lights,
    sealedTiles
  };
}

function createSeed(input: DirectorInput): number {
  const now = Date.now();
  const mixed = now ^ (input.playerLevel * 73856093) ^ (input.matchesPlayed * 19349663);
  return mixed >>> 0;
}

function threatLabel(difficulty: number): string {
  if (difficulty >= 7) return 'Nightmare';
  if (difficulty >= 5) return 'Severe';
  if (difficulty >= 3) return 'Rising';
  return 'Low';
}

function pick<T>(items: readonly T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)];
}

function pickUnique<T>(items: readonly T[], count: number, rng: () => number): T[] {
  return shuffle([...items], rng).slice(0, count);
}

function shuffle<T>(items: T[], rng: () => number): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function distanceTiles(a: SpawnDef, b: SpawnDef): number {
  return Math.hypot(a.col - b.col, a.row - b.row);
}

function mulberry32(seed: number): () => number {
  return () => {
    seed += 0x6d2b79f5;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
