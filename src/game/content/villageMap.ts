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

export const PLAYER_SPAWN = { col: 10, row: 18 } as const;

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

export const LIGHT_DEFS = [
  { col: 8, row: 10, radius: 138, kind: 'lantern' },
  { col: 18, row: 10, radius: 122, kind: 'lantern' },
  { col: 30, row: 10, radius: 132, kind: 'lantern' },
  { col: 43, row: 9, radius: 124, kind: 'lantern' },
  { col: 56, row: 8, radius: 130, kind: 'lantern' },
  { col: 10, row: 18, radius: 168, kind: 'bonfire' },
  { col: 25, row: 20, radius: 126, kind: 'lantern' },
  { col: 35, row: 18, radius: 170, kind: 'bonfire' },
  { col: 50, row: 20, radius: 132, kind: 'lantern' },
  { col: 15, row: 29, radius: 128, kind: 'lantern' },
  { col: 30, row: 30, radius: 154, kind: 'bonfire' },
  { col: 45, row: 30, radius: 128, kind: 'lantern' },
  { col: 57, row: 28, radius: 164, kind: 'bonfire' }
] as const;

export const BOT_SPAWNS = [
  { col: 54, row: 7 },
  { col: 48, row: 29 },
  { col: 18, row: 6 },
  { col: 33, row: 17 },
  { col: 57, row: 18 },
  { col: 23, row: 28 },
  { col: 42, row: 8 }
] as const;

export function isWallTile(col: number, row: number): boolean {
  if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return true;
  return MAP_DATA[row][col] === TileKind.Wall;
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
    map[row][col] = TileKind.Grave;
  }

  for (const [col, row] of TREES) {
    map[row][col] = TileKind.Tree;
  }

  carveRoad(map, 2, 18, 61, 18);
  carveRoad(map, 10, 2, 10, 33);
  carveRoad(map, 35, 2, 35, 33);
  carveRoad(map, 54, 2, 54, 33);
  carveRoad(map, 2, 10, 61, 10);
  carveRoad(map, 2, 29, 61, 29);

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
