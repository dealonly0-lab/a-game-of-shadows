import { MAP_LAYOUTS, type MapLayout } from './villageMap';

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
  layout: MapLayout;
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

const EXTRA_BOT_SPAWNS: SpawnDef[] = [
  { col: 8, row: 10 },
  { col: 14, row: 28 },
  { col: 28, row: 10 },
  { col: 35, row: 27 },
  { col: 50, row: 18 },
  { col: 58, row: 27 },
  { col: 43, row: 9 }
];

const VARIANT_NAMES = [
  'Black Lanterns',
  'Ash Roads',
  'Broken Chapel',
  'Witching Fog',
  'Dawn Pressure',
  'Hollow Market',
  'Moonless Graves',
  'Raven Bells',
  'Sealed Alleys'
] as const;

export function createMatchVariant(input: DirectorInput): MatchVariant {
  const seed = createSeed(input);
  const rng = mulberry32(seed);
  const layout = chooseLayout(input.matchesPlayed, rng);
  const difficulty = Math.max(1, Math.min(10, 1 + layout.difficultyOffset + Math.floor(input.matchesPlayed / 4) + Math.floor(input.playerLevel / 5)));
  const name = pick(VARIANT_NAMES, rng);
  const pressure = difficulty - 1;

  const playerSpawn = pickUnique(layout.playerSpawns, 1, rng)[0];
  const botSpawns = shuffle([...layout.botSpawns, ...EXTRA_BOT_SPAWNS], rng).filter((spawn) => isInLayout(spawn, layout) && distanceTiles(spawn, playerSpawn) > 9);
  const botCount = Math.min(chooseHunterCount(layout, difficulty, rng), botSpawns.length);
  const sealedCount = Math.min(layout.scaleLabel === 'small' ? 5 : 10, 1 + Math.floor(difficulty / 2) + (layout.scaleLabel === 'huge' ? 2 : 0));
  const sealedTiles = pickUnique(
    layout.sealCandidates.filter((tile) => distanceTiles(tile, playerSpawn) > 5),
    sealedCount,
    rng
  );

  const lights = layout.lightDefs.map((light, index) => {
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
    layout,
    dawnDurationMs: Math.max(36_000, layout.baseDawnDurationMs - pressure * 3_500),
    botCount,
    botSpeedMultiplier: 1 + pressure * 0.045 + (layout.scaleLabel === 'small' ? 0.02 : 0),
    botRangeMultiplier: 1 + pressure * 0.055 + (layout.scaleLabel === 'huge' ? 0.08 : 0),
    botCooldownMultiplier: Math.max(0.58, 1 - pressure * 0.045),
    lightRadiusMultiplier: 1 + pressure * 0.026 - (layout.scaleLabel === 'small' ? 0.04 : 0),
    playerSpawn,
    botSpawns,
    lights,
    sealedTiles
  };
}

function chooseLayout(matchesPlayed: number, rng: () => number): MapLayout {
  if (matchesPlayed < 2) return MAP_LAYOUTS.find((layout) => layout.id === 'chapel-square') ?? MAP_LAYOUTS[0];
  if (matchesPlayed < 5) {
    const earlyLayouts = MAP_LAYOUTS.filter((layout) => layout.scaleLabel === 'small' || layout.scaleLabel === 'medium');
    return pick(earlyLayouts, rng);
  }
  if (matchesPlayed < 10) {
    const midLayouts = MAP_LAYOUTS.filter((layout) => layout.scaleLabel !== 'huge');
    return pick(midLayouts, rng);
  }
  return pick(MAP_LAYOUTS, rng);
}

function createSeed(input: DirectorInput): number {
  const now = Date.now();
  const mixed = now ^ (input.playerLevel * 73856093) ^ (input.matchesPlayed * 19349663);
  return mixed >>> 0;
}

function threatLabel(difficulty: number): string {
  if (difficulty >= 9) return 'Hollow';
  if (difficulty >= 7) return 'Nightmare';
  if (difficulty >= 5) return 'Severe';
  if (difficulty >= 3) return 'Rising';
  return 'Low';
}

function chooseHunterCount(layout: MapLayout, difficulty: number, rng: () => number): number {
  const base = layout.hunterRange.min + Math.floor(difficulty / 3);
  const variance = rng() < 0.5 ? 0 : 1;
  return Math.max(layout.hunterRange.min, Math.min(layout.hunterRange.max, base + variance));
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

function isInLayout(spawn: SpawnDef, layout: MapLayout): boolean {
  return spawn.col > 0 && spawn.row > 0 && spawn.col < layout.cols - 1 && spawn.row < layout.rows - 1;
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
