export const TILE_SIZE = 48;

export enum TileKind {
  Floor = 0,
  Wall = 1,
  Grave = 2,
  Tree = 3
}

export const MAP_COLS = 64;
export const MAP_ROWS = 36;
export const MAP_WIDTH = MAP_COLS * TILE_SIZE;
export const MAP_HEIGHT = MAP_ROWS * TILE_SIZE;

export const PLAYER_SPAWN = { col: 14, row: 18 } as const;
export type LightDef = {
  col: number;
  row: number;
  radius: number;
  kind: 'lantern' | 'bonfire';
};

export type SpawnDef = {
  col: number;
  row: number;
};

export type MapLayout = {
  id: string;
  name: string;
  cols: number;
  rows: number;
  width: number;
  height: number;
  tileSize: number;
  data: TileKind[][];
  playerSpawns: SpawnDef[];
  botSpawns: SpawnDef[];
  lightDefs: LightDef[];
  sealCandidates: SpawnDef[];
};

const BUILDINGS = [
  { col: 4, row: 4, width: 7, height: 5, doors: [{ col: 7, row: 8 }] },
  { col: 15, row: 3, width: 8, height: 6, doors: [{ col: 18, row: 8 }] },
  { col: 29, row: 4, width: 9, height: 5, doors: [{ col: 33, row: 8 }] },
  { col: 48, row: 3, width: 8, height: 6, doors: [{ col: 51, row: 8 }] },
  { col: 7, row: 13, width: 6, height: 8, doors: [{ col: 12, row: 17 }] },
  { col: 21, row: 13, width: 9, height: 6, doors: [{ col: 25, row: 18 }] },
  { col: 40, row: 12, width: 7, height: 8, doors: [{ col: 43, row: 19 }] },
  { col: 53, row: 14, width: 7, height: 6, doors: [{ col: 53, row: 17 }] },
  { col: 4, row: 26, width: 8, height: 6, doors: [{ col: 8, row: 26 }] },
  { col: 18, row: 25, width: 7, height: 7, doors: [{ col: 21, row: 25 }] },
  { col: 33, row: 26, width: 10, height: 5, doors: [{ col: 37, row: 26 }] },
  { col: 50, row: 25, width: 8, height: 7, doors: [{ col: 53, row: 25 }] }
] as const;

const GRAVES = [
  [14, 18], [16, 18], [18, 18], [14, 20], [16, 20], [18, 20],
  [30, 14], [32, 14], [34, 14], [31, 16], [33, 16],
  [46, 27], [48, 27], [50, 27], [46, 29], [48, 29], [50, 29],
  [57, 8], [59, 9], [56, 10], [58, 11],
  [9, 23], [11, 24], [13, 23]
] as const;

const TREES = [
  [3, 10], [5, 22], [8, 33], [13, 10], [17, 33], [24, 22],
  [27, 9], [30, 32], [36, 21], [39, 8], [43, 33], [47, 22],
  [52, 10], [55, 33], [60, 6], [61, 28]
] as const;

export const MAP_DATA: TileKind[][] = createVillageMap();

export const LIGHT_DEFS: readonly LightDef[] = [
  { col: 8, row: 10, radius: 138, kind: 'lantern' },
  { col: 18, row: 10, radius: 122, kind: 'lantern' },
  { col: 30, row: 10, radius: 132, kind: 'lantern' },
  { col: 43, row: 9, radius: 124, kind: 'lantern' },
  { col: 56, row: 8, radius: 130, kind: 'lantern' },
  { col: 14, row: 18, radius: 168, kind: 'bonfire' },
  { col: 25, row: 20, radius: 126, kind: 'lantern' },
  { col: 35, row: 18, radius: 170, kind: 'bonfire' },
  { col: 50, row: 20, radius: 132, kind: 'lantern' },
  { col: 15, row: 29, radius: 128, kind: 'lantern' },
  { col: 30, row: 30, radius: 154, kind: 'bonfire' },
  { col: 45, row: 30, radius: 128, kind: 'lantern' },
  { col: 57, row: 28, radius: 164, kind: 'bonfire' }
] as const;

export const BOT_SPAWNS = [
  { col: 56, row: 10 },
  { col: 48, row: 28 },
  { col: 18, row: 10 },
  { col: 33, row: 16 },
  { col: 57, row: 18 },
  { col: 23, row: 28 },
  { col: 42, row: 10 }
] as const;

const DEFAULT_PLAYER_SPAWNS: SpawnDef[] = [
  PLAYER_SPAWN,
  { col: 8, row: 27 },
  { col: 14, row: 18 },
  { col: 25, row: 30 },
  { col: 42, row: 28 },
  { col: 55, row: 18 },
  { col: 50, row: 8 },
  { col: 18, row: 9 }
];

const DEFAULT_SEAL_CANDIDATES: SpawnDef[] = [
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

export const DEFAULT_MAP_LAYOUT: MapLayout = {
  id: 'old-village',
  name: 'Old Village',
  cols: MAP_COLS,
  rows: MAP_ROWS,
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  tileSize: TILE_SIZE,
  data: MAP_DATA,
  playerSpawns: DEFAULT_PLAYER_SPAWNS,
  botSpawns: [...BOT_SPAWNS],
  lightDefs: [...LIGHT_DEFS],
  sealCandidates: DEFAULT_SEAL_CANDIDATES
};

export const EXPANDED_MAP_LAYOUT: MapLayout = createExpandedLayout();

export const MAP_LAYOUTS: readonly MapLayout[] = [DEFAULT_MAP_LAYOUT, EXPANDED_MAP_LAYOUT];

export function isWallTile(col: number, row: number): boolean {
  if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return true;
  return MAP_DATA[row][col] === TileKind.Wall;
}

export function isWallInLayout(layout: MapLayout, col: number, row: number): boolean {
  if (row < 0 || row >= layout.rows || col < 0 || col >= layout.cols) return true;
  return layout.data[row][col] === TileKind.Wall;
}

function createVillageMap(): TileKind[][] {
  const map = Array.from({ length: MAP_ROWS }, () => Array.from({ length: MAP_COLS }, () => TileKind.Floor));

  for (let row = 0; row < MAP_ROWS; row += 1) {
    for (let col = 0; col < MAP_COLS; col += 1) {
      if (row === 0 || row === MAP_ROWS - 1 || col === 0 || col === MAP_COLS - 1) {
        map[row][col] = TileKind.Wall;
      }
    }
  }

  carveRoad(map, 2, 18, 61, 18);
  carveRoad(map, 10, 2, 10, 33);
  carveRoad(map, 35, 2, 35, 33);
  carveRoad(map, 54, 2, 54, 33);
  carveRoad(map, 2, 10, 61, 10);
  carveRoad(map, 2, 29, 61, 29);

  for (const building of BUILDINGS) {
    for (let row = building.row; row < building.row + building.height; row += 1) {
      for (let col = building.col; col < building.col + building.width; col += 1) {
        map[row][col] = TileKind.Wall;
      }
    }

    for (const door of building.doors) {
      map[door.row][door.col] = TileKind.Floor;
    }
  }

  for (const [col, row] of GRAVES) {
    if (map[row][col] === TileKind.Floor) map[row][col] = TileKind.Grave;
  }

  for (const [col, row] of TREES) {
    if (map[row][col] === TileKind.Floor) map[row][col] = TileKind.Tree;
  }

  return map;
}

function carveRoad(map: TileKind[][], startCol: number, startRow: number, endCol: number, endRow: number): void {
  const dx = Math.sign(endCol - startCol);
  const dy = Math.sign(endRow - startRow);
  let col = startCol;
  let row = startRow;

  while (col !== endCol || row !== endRow) {
    clearRoadTile(map, col, row);
    if (col !== endCol) col += dx;
    if (row !== endRow) row += dy;
  }

  clearRoadTile(map, endCol, endRow);
}

function clearRoadTile(map: TileKind[][], col: number, row: number): void {
  for (let y = row - 1; y <= row + 1; y += 1) {
    for (let x = col - 1; x <= col + 1; x += 1) {
      if (y <= 0 || y >= MAP_ROWS - 1 || x <= 0 || x >= MAP_COLS - 1) continue;
      map[y][x] = TileKind.Floor;
    }
  }
}

function createExpandedLayout(): MapLayout {
  const cols = 84;
  const rows = 48;
  const map = Array.from({ length: rows }, () => Array.from({ length: cols }, () => TileKind.Floor));

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (row === 0 || row === rows - 1 || col === 0 || col === cols - 1) map[row][col] = TileKind.Wall;
    }
  }

  const roads = [
    [3, 12, cols - 4, 12],
    [3, 24, cols - 4, 24],
    [3, 37, cols - 4, 37],
    [12, 3, 12, rows - 4],
    [32, 3, 32, rows - 4],
    [54, 3, 54, rows - 4],
    [72, 3, 72, rows - 4],
    [12, 12, 32, 24],
    [32, 37, 54, 24],
    [54, 12, 72, 24]
  ];
  for (const [x1, y1, x2, y2] of roads) carveRoadFor(map, cols, rows, x1, y1, x2, y2);

  const buildings = [
    { col: 4, row: 4, width: 7, height: 6, doors: [{ col: 8, row: 9 }] },
    { col: 17, row: 4, width: 10, height: 7, doors: [{ col: 21, row: 10 }] },
    { col: 39, row: 4, width: 9, height: 7, doors: [{ col: 43, row: 10 }] },
    { col: 60, row: 4, width: 9, height: 8, doors: [{ col: 64, row: 11 }] },
    { col: 74, row: 6, width: 7, height: 7, doors: [{ col: 74, row: 10 }] },
    { col: 4, row: 17, width: 7, height: 8, doors: [{ col: 10, row: 21 }] },
    { col: 20, row: 17, width: 8, height: 7, doors: [{ col: 24, row: 23 }] },
    { col: 39, row: 16, width: 9, height: 8, doors: [{ col: 43, row: 23 }] },
    { col: 61, row: 16, width: 8, height: 8, doors: [{ col: 65, row: 23 }] },
    { col: 74, row: 19, width: 7, height: 6, doors: [{ col: 74, row: 22 }] },
    { col: 5, row: 34, width: 9, height: 8, doors: [{ col: 11, row: 37 }] },
    { col: 20, row: 32, width: 9, height: 9, doors: [{ col: 24, row: 37 }] },
    { col: 38, row: 35, width: 10, height: 7, doors: [{ col: 43, row: 37 }] },
    { col: 60, row: 32, width: 10, height: 9, doors: [{ col: 65, row: 37 }] },
    { col: 74, row: 34, width: 7, height: 8, doors: [{ col: 74, row: 37 }] }
  ];

  for (const building of buildings) {
    for (let row = building.row; row < building.row + building.height; row += 1) {
      for (let col = building.col; col < building.col + building.width; col += 1) map[row][col] = TileKind.Wall;
    }
    for (const door of building.doors) map[door.row][door.col] = TileKind.Floor;
  }

  const graves: SpawnDef[] = [
    { col: 16, row: 24 }, { col: 18, row: 24 }, { col: 20, row: 24 }, { col: 16, row: 27 },
    { col: 18, row: 27 }, { col: 20, row: 27 }, { col: 49, row: 30 }, { col: 51, row: 30 },
    { col: 53, row: 30 }, { col: 49, row: 33 }, { col: 51, row: 33 }, { col: 70, row: 13 },
    { col: 73, row: 14 }, { col: 76, row: 15 }, { col: 9, row: 30 }, { col: 11, row: 31 },
    { col: 31, row: 14 }, { col: 33, row: 15 }
  ];
  const trees: SpawnDef[] = [
    { col: 3, row: 14 }, { col: 6, row: 44 }, { col: 15, row: 14 }, { col: 25, row: 44 },
    { col: 30, row: 7 }, { col: 36, row: 43 }, { col: 49, row: 10 }, { col: 52, row: 44 },
    { col: 58, row: 26 }, { col: 69, row: 44 }, { col: 78, row: 4 }, { col: 81, row: 31 }
  ];

  for (const grave of graves) if (map[grave.row][grave.col] === TileKind.Floor) map[grave.row][grave.col] = TileKind.Grave;
  for (const tree of trees) if (map[tree.row][tree.col] === TileKind.Floor) map[tree.row][tree.col] = TileKind.Tree;

  const lightDefs: LightDef[] = [
    { col: 8, row: 12, radius: 138, kind: 'lantern' },
    { col: 23, row: 13, radius: 126, kind: 'lantern' },
    { col: 37, row: 11, radius: 134, kind: 'lantern' },
    { col: 54, row: 12, radius: 172, kind: 'bonfire' },
    { col: 72, row: 12, radius: 130, kind: 'lantern' },
    { col: 15, row: 25, radius: 172, kind: 'bonfire' },
    { col: 32, row: 24, radius: 130, kind: 'lantern' },
    { col: 49, row: 24, radius: 140, kind: 'lantern' },
    { col: 66, row: 24, radius: 172, kind: 'bonfire' },
    { col: 10, row: 38, radius: 128, kind: 'lantern' },
    { col: 30, row: 38, radius: 160, kind: 'bonfire' },
    { col: 45, row: 38, radius: 130, kind: 'lantern' },
    { col: 60, row: 38, radius: 154, kind: 'bonfire' },
    { col: 75, row: 37, radius: 132, kind: 'lantern' }
  ];

  return {
    id: 'grave-market',
    name: 'Grave Market',
    cols,
    rows,
    width: cols * TILE_SIZE,
    height: rows * TILE_SIZE,
    tileSize: TILE_SIZE,
    data: map,
    playerSpawns: [
      { col: 8, row: 12 }, { col: 18, row: 36 }, { col: 32, row: 24 }, { col: 48, row: 38 },
      { col: 67, row: 24 }, { col: 76, row: 37 }, { col: 72, row: 12 }, { col: 54, row: 8 }
    ],
    botSpawns: [
      { col: 76, row: 13 }, { col: 70, row: 37 }, { col: 51, row: 14 }, { col: 48, row: 31 },
      { col: 31, row: 13 }, { col: 22, row: 38 }, { col: 10, row: 25 }, { col: 59, row: 25 },
      { col: 78, row: 29 }, { col: 39, row: 39 }, { col: 16, row: 13 }
    ],
    lightDefs,
    sealCandidates: [
      { col: 12, row: 18 }, { col: 12, row: 31 }, { col: 24, row: 24 }, { col: 32, row: 18 },
      { col: 32, row: 31 }, { col: 43, row: 24 }, { col: 54, row: 18 }, { col: 54, row: 31 },
      { col: 66, row: 24 }, { col: 72, row: 18 }, { col: 72, row: 31 }, { col: 41, row: 37 }
    ]
  };
}

function carveRoadFor(map: TileKind[][], cols: number, rows: number, startCol: number, startRow: number, endCol: number, endRow: number): void {
  const dx = Math.sign(endCol - startCol);
  const dy = Math.sign(endRow - startRow);
  let col = startCol;
  let row = startRow;
  while (col !== endCol || row !== endRow) {
    clearRoadTileFor(map, cols, rows, col, row);
    if (col !== endCol) col += dx;
    if (row !== endRow) row += dy;
  }
  clearRoadTileFor(map, cols, rows, endCol, endRow);
}

function clearRoadTileFor(map: TileKind[][], cols: number, rows: number, col: number, row: number): void {
  for (let y = row - 1; y <= row + 1; y += 1) {
    for (let x = col - 1; x <= col + 1; x += 1) {
      if (y <= 0 || y >= rows - 1 || x <= 0 || x >= cols - 1) continue;
      map[y][x] = TileKind.Floor;
    }
  }
}
