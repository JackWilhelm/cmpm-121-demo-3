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

let playerMovementHistory: number[][] = [];
const playerMovementHistoryString = localStorage.getItem(
  "playerMovementHistory",
);
if (playerMovementHistoryString !== null) {
  playerMovementHistory = JSON.parse(playerMovementHistoryString);
}
playerMovementHistory.push([oakesLat, oakesLng]);
localStorage.setItem(
  "playerMovementHistory",
  JSON.stringify(playerMovementHistory),
);

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

function saveCacheTracker(cacheTracker: Map<string, string>) {
  const cacheTrackerArray = Array.from(cacheTracker.entries());
  const cacheTrackerString = JSON.stringify(cacheTrackerArray);
  localStorage.setItem("cacheTracker", cacheTrackerString);
}

let cacheTracker: Map<string, string> = new Map<string, string>();

const cacheTrackerString = localStorage.getItem("cacheTracker");
if (cacheTrackerString !== null) {
  const cacheTrackerArray: [string, string][] = JSON.parse(cacheTrackerString);
  if (Array.isArray(cacheTrackerArray)) {
    cacheTracker = new Map<string, string>(cacheTrackerArray);
  }
}

let playerInventory: Cache = new Cache();
const playerInventoryString = localStorage.getItem("playerInventory");
if (playerInventoryString !== null) {
  playerInventory.fromMemento(playerInventoryString);
}

const statusArea = document.querySelector<HTMLDivElement>("#statusArea")!;

function updateStatusArea() {
  statusArea.innerHTML = `${playerInventory.coins.length} coins gained`;
}

const coinDisplay = document.querySelector<HTMLDivElement>("#coinDisplay")!;

function updateCoinDisplay() {
  coinDisplay.innerHTML = "Coins:";
  playerInventory.coins.forEach((coin) => {
    const coinText = document.createElement("span");
    coinText.innerText = "[" + coinToString(coin) + "]";
    coinText.style.cursor = "pointer";

    coinText.addEventListener("click", () => {
      map.setView(
        leaflet.latLng(
          coin.i * tileDegrees,
          coin.j * tileDegrees,
        ),
      );
    });

    coinDisplay.appendChild(coinText);
    coinDisplay.appendChild(document.createTextNode(" "));
  });
}

updateCoinDisplay();
updateStatusArea();

interface Coin {
  i: number;
  j: number;
  serial: number;
}

function coinToString(coin: Coin): string {
  return `${coin.i}:${coin.j}#${coin.serial}`;
}

function movePlayer(
  currentLatLng: leaflet.LatLng,
  latStep: number,
  lngStep: number,
) {
  playerMovementHistory.push([
    currentLatLng.lat + (tileDegrees * latStep),
    currentLatLng.lng + (tileDegrees * lngStep),
  ]);
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
  localStorage.setItem(
    "playerMovementHistory",
    JSON.stringify(playerMovementHistory),
  );
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
    saveCacheTracker(cacheTracker);
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
          cacheTracker.set(newCache.key, newCache.toMemento());
          saveCacheTracker(cacheTracker);
          popupDisplay.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            newCache.coins.length.toString();
          playerInventory.coins.push(coin);
          updateStatusArea();
          updateCoinDisplay();
          localStorage.setItem("playerInventory", playerInventory.toMemento());
        }
      },
    );

    popupDisplay.querySelector<HTMLButtonElement>("#deposit")!.addEventListener(
      "click",
      () => {
        if (playerInventory.coins.length > 0) {
          const coin: Coin = playerInventory.coins.pop()!;
          localStorage.setItem("playerInventory", playerInventory.toMemento());
          updateStatusArea();
          updateCoinDisplay();
          newCache.coins.push(coin);
          popupDisplay.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            newCache.coins.length.toString();
          cacheTracker.set(newCache.key, newCache.toMemento());
          saveCacheTracker(cacheTracker);
        }
      },
    );

    return popupDisplay;
  });
}

map.on("popupopen", () => {
  if (geoLocationOn) {
    navigator.geolocation.clearWatch(watcher);
  }
});

map.on("popupclose", () => {
  if (geoLocationOn) {
    watcher = navigator.geolocation.watchPosition(success);
  }
});

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
  leaflet.polyline(playerMovementHistory, { color: "red" }).addTo(map);
}

generateNeighborhood(oakesLocation);

let geoLocationOn = false;

function success(pos: GeolocationPosition) {
  movePlayer(leaflet.latLng(pos.coords.latitude, pos.coords.longitude), 0, 0);
}

let watcher = navigator.geolocation.watchPosition(success, undefined, {
  enableHighAccuracy: true,
  maximumAge: 0,
});
navigator.geolocation.clearWatch(watcher);

const northButton = document.getElementById("north") as HTMLButtonElement;
northButton.addEventListener("click", () => {
  if (!geoLocationOn) {
    movePlayer(player.getLatLng(), 1, 0);
  }
});

const southButton = document.getElementById("south") as HTMLButtonElement;
southButton.addEventListener("click", () => {
  if (!geoLocationOn) {
    movePlayer(player.getLatLng(), -1, 0);
  }
});

const eastButton = document.getElementById("east") as HTMLButtonElement;
eastButton.addEventListener("click", () => {
  if (!geoLocationOn) {
    movePlayer(player.getLatLng(), 0, 1);
  }
});

const westButton = document.getElementById("west") as HTMLButtonElement;
westButton.addEventListener("click", () => {
  if (!geoLocationOn) {
    movePlayer(player.getLatLng(), 0, -1);
  }
});

const sensorButton = document.getElementById("sensor") as HTMLButtonElement;
sensorButton.addEventListener("click", () => {
  if (geoLocationOn) {
    geoLocationOn = false;
    navigator.geolocation.clearWatch(watcher);
  } else {
    geoLocationOn = true;
    navigator.geolocation.getCurrentPosition(success);
    watcher = navigator.geolocation.watchPosition(success);
  }
});

const resetButton = document.getElementById("reset") as HTMLButtonElement;
resetButton.addEventListener("click", () => {
  const confirmReset = prompt("Are you sure you want to reset the game?", "Y");
  if (confirmReset == "Y") {
    localStorage.clear();
    playerInventory = new Cache();
    cacheTracker = new Map<string, string>();
    playerMovementHistory = [];
    movePlayer(player.getLatLng(), 0, 0);
    updateStatusArea();
    updateCoinDisplay();
  }
});
