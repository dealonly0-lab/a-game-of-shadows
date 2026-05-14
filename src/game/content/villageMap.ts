export const TILE_SIZE = 48;

export enum TileKind {
  Floor = 0,
  Wall = 1,
  Grave = 2,
  Tree = 3
}

export const MAP_DATA: TileKind[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,3,0,0,0,1],
  [1,0,1,1,1,0,0,0,0,2,0,0,1,1,1,1,0,0,2,0,0,0,0,1],
  [1,0,1,0,1,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,3,0,1],
  [1,0,1,0,1,0,0,2,0,0,3,0,1,0,0,1,0,0,0,0,0,0,0,1],
  [1,0,1,1,1,0,0,0,0,0,0,0,1,1,1,1,0,0,0,2,0,0,0,1],
  [1,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,2,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,2,0,0,0,0,1],
  [1,0,0,0,3,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,3,0,1],
  [1,0,0,2,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,2,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,1],
  [1,0,3,0,0,0,0,2,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,1],
  [1,0,1,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1,0,0,2,0,1],
  [1,0,1,1,0,2,0,0,0,3,0,0,0,0,0,1,0,0,1,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,1],
  [1,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,3,0,0,1],
  [1,0,2,0,0,1,0,0,1,0,2,0,0,2,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

export const MAP_COLS = MAP_DATA[0].length;
export const MAP_ROWS = MAP_DATA.length;
export const MAP_WIDTH = MAP_COLS * TILE_SIZE;
export const MAP_HEIGHT = MAP_ROWS * TILE_SIZE;

export const LIGHT_DEFS = [
  { col: 3, row: 1.5, radius: 125, kind: 'lantern' },
  { col: 8, row: 4, radius: 108, kind: 'lantern' },
  { col: 13, row: 1.5, radius: 122, kind: 'lantern' },
  { col: 20, row: 3, radius: 112, kind: 'lantern' },
  { col: 5.5, row: 9, radius: 158, kind: 'bonfire' },
  { col: 11.5, row: 6.5, radius: 112, kind: 'lantern' },
  { col: 20, row: 9, radius: 152, kind: 'bonfire' },
  { col: 3, row: 14, radius: 122, kind: 'lantern' },
  { col: 9, row: 13, radius: 102, kind: 'lantern' },
  { col: 17, row: 12, radius: 118, kind: 'lantern' },
  { col: 22, row: 15, radius: 150, kind: 'bonfire' },
  { col: 13, row: 16.5, radius: 106, kind: 'lantern' },
  { col: 22, row: 6, radius: 102, kind: 'lantern' }
] as const;

export const BOT_SPAWNS = [
  { col: 21, row: 2 },
  { col: 22, row: 16 },
  { col: 1, row: 16 },
  { col: 9, row: 9 },
  { col: 19, row: 5 },
  { col: 13, row: 14 },
  { col: 6, row: 12 }
] as const;

export function isWallTile(col: number, row: number): boolean {
  if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return true;
  return MAP_DATA[row][col] === TileKind.Wall;
}
