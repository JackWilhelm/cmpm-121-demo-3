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
    const tileWidthString = this.tileWidth.toString();
    const parts = tileWidthString.split(".");
    let trailingDigits = 1;
    if (parts.length > 1) {
      trailingDigits = parts[1].length;
    } else {
      trailingDigits = 0;
    }
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
              (originCell.i + (x * this.tileWidth)).toFixed(trailingDigits),
              (originCell.j + (y * this.tileWidth)).toFixed(trailingDigits),
            ),
          ),
        );
      }
    }
    return resultCells;
  }
}
