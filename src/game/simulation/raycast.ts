import type { Segment, Vec2 } from './types';

export function buildWallSegments(isWall: (col: number, row: number) => boolean, cols: number, rows: number, tileSize: number): Segment[] {
  const segments: Segment[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (!isWall(col, row)) continue;

      const x1 = col * tileSize;
      const y1 = row * tileSize;
      const x2 = x1 + tileSize;
      const y2 = y1 + tileSize;

      if (!isWall(col, row - 1)) segments.push({ a: { x: x1, y: y1 }, b: { x: x2, y: y1 } });
      if (!isWall(col, row + 1)) segments.push({ a: { x: x1, y: y2 }, b: { x: x2, y: y2 } });
      if (!isWall(col - 1, row)) segments.push({ a: { x: x1, y: y1 }, b: { x: x1, y: y2 } });
      if (!isWall(col + 1, row)) segments.push({ a: { x: x2, y: y1 }, b: { x: x2, y: y2 } });
    }
  }

  return segments;
}

export class Raycaster {
  constructor(private readonly worldSegments: Segment[]) {}

  getVisibility(lightX: number, lightY: number, radius: number, viewport: { x: number; y: number; width: number; height: number }): Vec2[] {
    const segments = this.collectSegmentsNearLight(lightX, lightY, radius, viewport);
    const angles: number[] = [];

    for (const segment of segments) {
      for (const point of [segment.a, segment.b]) {
        const angle = Math.atan2(point.y - lightY, point.x - lightX);
        angles.push(angle - 0.0001, angle, angle + 0.0001);
      }
    }

    return angles
      .map((angle) => {
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        let minT = radius;

        for (const segment of segments) {
          const t = intersectRaySegment(lightX, lightY, dx, dy, segment);
          if (t !== null && t < minT) minT = t;
        }

        return { x: lightX + dx * minT, y: lightY + dy * minT, angle };
      })
      .sort((a, b) => a.angle - b.angle)
      .map(({ x, y }) => ({ x, y }));
  }

  private collectSegmentsNearLight(lightX: number, lightY: number, radius: number, viewport: { x: number; y: number; width: number; height: number }): Segment[] {
    const left = viewport.x;
    const top = viewport.y;
    const right = viewport.x + viewport.width;
    const bottom = viewport.y + viewport.height;
    const segments: Segment[] = [];

    for (const segment of this.worldSegments) {
      const minX = Math.min(segment.a.x, segment.b.x);
      const maxX = Math.max(segment.a.x, segment.b.x);
      const minY = Math.min(segment.a.y, segment.b.y);
      const maxY = Math.max(segment.a.y, segment.b.y);

      if (maxX < lightX - radius || minX > lightX + radius || maxY < lightY - radius || minY > lightY + radius) continue;
      segments.push(segment);
    }

    segments.push(
      { a: { x: left, y: top }, b: { x: right, y: top } },
      { a: { x: right, y: top }, b: { x: right, y: bottom } },
      { a: { x: right, y: bottom }, b: { x: left, y: bottom } },
      { a: { x: left, y: bottom }, b: { x: left, y: top } }
    );

    return segments;
  }
}

function intersectRaySegment(originX: number, originY: number, dirX: number, dirY: number, segment: Segment): number | null {
  const segX = segment.b.x - segment.a.x;
  const segY = segment.b.y - segment.a.y;
  const denom = dirX * segY - dirY * segX;

  if (Math.abs(denom) < 1e-8) return null;

  const tRay = ((segment.a.x - originX) * segY - (segment.a.y - originY) * segX) / denom;
  const tSegment = ((segment.a.x - originX) * dirY - (segment.a.y - originY) * dirX) / denom;

  if (tRay < 0.001 || tSegment < 0 || tSegment > 1) return null;
  return tRay;
}
