// todo
import "./style.css";
import "leaflet/dist/leaflet.css";
import leaflet from "leaflet";
import "./leafletWorkaround.ts";
import luck from "./luck.ts";
import { Board } from "./board.ts";

const oakesLat = 36.9894;
const oakesLng = -122.0627;
const oakesLocation = leaflet.latLng(oakesLat, oakesLng);

const zoomLevel = 19;
const tileDegrees = 1e-4;
const neighborhoodSize = 8;
const cacheSpawnChance = 0.1;

const map = leaflet.map(document.getElementById("map")!, {
  center: oakesLocation,
  zoom: zoomLevel,
  minZoom: zoomLevel,
  maxZoom: zoomLevel,
  zoomControl: false,
  scrollWheelZoom: false,
});

leaflet.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

const player = leaflet.marker(oakesLocation);
player.bindTooltip("Here you are!");
player.addTo(map);

const globe = new Board(tileDegrees, neighborhoodSize);

interface Memento<T> {
  toMemento(): T;
  fromMemento(memento: T): void;
}

interface Cache {
  key: string;
  coins: Coin[];
}

class Cache implements Memento<string> {
  constructor() {
    this.coins = [];
    this.key = "null";
  }
  toMemento() {
    return JSON.stringify(this.coins);
  }

  fromMemento(memento: string) {
    this.coins = JSON.parse(memento);
  }
}

const cacheTracker: Map<string, string> = new Map<string, string>();

const playerInventory: Cache = new Cache();
const playerCoins = 0;
const statusArea = document.querySelector<HTMLDivElement>("#statusArea")!;
statusArea.innerHTML = `${playerCoins} coins gained`;

interface Coin {
  i: number;
  j: number;
  serial: number;
}

function coinToString(coin: Coin): string {
  return `${coin.i}:${coin.j}#${coin.serial}`;
}

function makeCache(i: number, j: number) {
  i = Math.round(i);
  j = Math.round(j);
  const thisCell = globe.getCellForPoint(leaflet.latLng(i, j));
  const thisCellBounds = globe.getCellBounds(thisCell);
  const newCache: Cache = new Cache();
  newCache.key = [thisCell.i, thisCell.j].toString();
  if (cacheTracker.get(newCache.key) === undefined) {
    for (
      let serial = 0;
      serial < Math.floor(luck([i, j, "initialValue"].toString()) * 100);
      serial++
    ) {
      newCache.coins.push({ i: i, j: j, serial: serial });
    }
    cacheTracker.set(newCache.key, newCache.toMemento());
  } else {
    newCache.fromMemento(cacheTracker.get(newCache.key)!);
  }

  const rect = leaflet.rectangle(thisCellBounds);
  rect.addTo(map);

  rect.bindPopup(() => {
    const popupDisplay = document.createElement("div");
    popupDisplay.innerHTML =
      `<div>Cache at "${i},${j}" with a value of <span id="value">${newCache.coins.length}</span>.</div><button id="collect">collect</button></span>.</div><button id="deposit">deposit</button>`;

    popupDisplay.querySelector<HTMLButtonElement>("#collect")!.addEventListener(
      "click",
      () => {
        if (newCache.coins.length > 0) {
          const coin: Coin = newCache.coins.pop()!;
          popupDisplay.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            newCache.coins.length.toString();
          playerInventory.coins.push(coin);
          statusArea.innerHTML = `${playerInventory.coins.length} coins gained`;
          cacheTracker.set(newCache.key, newCache.toMemento());
          console.log(coinToString(coin));
        }
      },
    );

    popupDisplay.querySelector<HTMLButtonElement>("#deposit")!.addEventListener(
      "click",
      () => {
        if (playerInventory.coins.length > 0) {
          const coin: Coin = playerInventory.coins.pop()!;
          statusArea.innerHTML = `${playerInventory.coins.length} coins gained`;
          newCache.coins.push(coin);
          popupDisplay.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            newCache.coins.length.toString();
          cacheTracker.set(newCache.key, newCache.toMemento());
          console.log(coinToString(coin));
        }
      },
    );

    return popupDisplay;
  });
}

function wipeRectangles() {
  map.eachLayer((layer: leaflet.layer) => {
    if (layer === player || layer instanceof leaflet.TileLayer) {
      return;
    }
    map.removeLayer(layer);
  });
}

function generateNeighborhood(point: leaflet.LatLng) {
  wipeRectangles();
  const neighborhoodCells = globe.getCellsNearPoint(point);
  for (const cell of neighborhoodCells) {
    if (luck([cell.i, cell.j].toString()) < cacheSpawnChance) {
      makeCache(cell.i / tileDegrees, cell.j / tileDegrees);
    }
  }
}

generateNeighborhood(oakesLocation);

function movePlayer(latStep: number, lngStep: number) {
  const currentLatLng = player.getLatLng();
  player.setLatLng(
    leaflet.latLng(
      currentLatLng.lat + (tileDegrees * latStep),
      currentLatLng.lng + (tileDegrees * lngStep),
    ),
  );
  map.setView(
    leaflet.latLng(
      currentLatLng.lat + (tileDegrees * latStep),
      currentLatLng.lng + (tileDegrees * lngStep),
    ),
  );
  generateNeighborhood(
    leaflet.latLng(
      currentLatLng.lat + (tileDegrees * latStep),
      currentLatLng.lng + (tileDegrees * lngStep),
    ),
  );
}

const northButton = document.getElementById("north") as HTMLButtonElement;
northButton.addEventListener("click", () => {
  movePlayer(1, 0);
});

const southButton = document.getElementById("south") as HTMLButtonElement;
southButton.addEventListener("click", () => {
  movePlayer(-1, 0);
});

const eastButton = document.getElementById("east") as HTMLButtonElement;
eastButton.addEventListener("click", () => {
  movePlayer(0, 1);
});

const westButton = document.getElementById("west") as HTMLButtonElement;
westButton.addEventListener("click", () => {
  movePlayer(0, -1);
});
