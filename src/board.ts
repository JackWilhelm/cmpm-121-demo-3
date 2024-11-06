import leaflet from "leaflet";

interface Cell {
  readonly i: number;
  readonly j: number;
}

export class Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;

  private readonly knownCells: Map<string, Cell>;

  constructor(tileWidth: number, tileVisibilityRadius: number) {
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;
    this.knownCells = new Map<string, Cell>();
  }

  private getCanonicalCell(cell: Cell): Cell {
    const { i, j } = cell;
    const key = [i, j].toString();
    if (this.knownCells.get(key) === undefined) {
      this.knownCells.set(key, cell);
    }
    return this.knownCells.get(key)!;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    return this.getCanonicalCell({
      i: point.lat,
      j: point.lng,
    });
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    return (leaflet.latLngBounds(
      [cell.i * this.tileWidth, cell.j * this.tileWidth],
      [
        cell.i * this.tileWidth + this.tileWidth,
        cell.j * this.tileWidth + this.tileWidth,
      ],
    ));
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const resultCells: Cell[] = [];
    const originCell = this.getCellForPoint(point);
    for (
      let x = -this.tileVisibilityRadius;
      x < this.tileVisibilityRadius;
      x++
    ) {
      for (
        let y = -this.tileVisibilityRadius;
        y < this.tileVisibilityRadius;
        y++
      ) {
        resultCells.push(
          this.getCellForPoint(
            leaflet.latLng(
              originCell.i + (x * this.tileWidth),
              originCell.j + (y * this.tileWidth),
            ),
          ),
        );
      }
    }
    return resultCells;
  }
}
