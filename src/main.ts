// todo
import "./style.css";
import luck from "./luck.ts";
import { Board } from "./board.ts";
import { MapManager } from "./MapManager.ts";

const oakesLat = 36.9894;
const oakesLng = -122.0627;

const zoomLevel = 19;
const tileDegrees = 1e-4;
const neighborhoodSize = 8;
const cacheSpawnChance = 0.1;

const mapManager = new MapManager(oakesLat, oakesLng, zoomLevel);

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
mapManager.addPlayerMovementPolyline(playerMovementHistory);

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
      mapManager.setView(coin.i * tileDegrees, coin.j * tileDegrees);
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

function makeCache(mapManager: MapManager, i: number, j: number) {
  i = Math.round(i);
  j = Math.round(j);

  const thisCell = globe.getCellForPoint(i, j);
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

  mapManager.drawCache(
    i,
    j,
    thisCellBounds,
    () => newCache.coins.length,
    (action: string, updateValue: (newValue: number) => void) => {
      if (action === "collect" && newCache.coins.length > 0) {
        const coin: Coin = newCache.coins.pop()!;
        cacheTracker.set(newCache.key, newCache.toMemento());
        saveCacheTracker(cacheTracker);
        playerInventory.coins.push(coin);
        updateStatusArea();
        updateCoinDisplay();
        localStorage.setItem("playerInventory", playerInventory.toMemento());
        updateValue(newCache.coins.length);
      } else if (action === "deposit" && playerInventory.coins.length > 0) {
        const coin: Coin = playerInventory.coins.pop()!;
        localStorage.setItem("playerInventory", playerInventory.toMemento());
        updateStatusArea();
        updateCoinDisplay();
        newCache.coins.push(coin);
        cacheTracker.set(newCache.key, newCache.toMemento());
        saveCacheTracker(cacheTracker);
        updateValue(newCache.coins.length);
      }
    },
  );
}

mapManager.bindPopupEvents(
  () => {
    if (geoLocationOn) {
      navigator.geolocation.clearWatch(watcher);
    }
  },
  () => {
    if (geoLocationOn) {
      watcher = navigator.geolocation.watchPosition(success);
    }
  },
);

function generateNeighborhood(i: number, j: number) {
  mapManager.wipeOverlays();
  const neighborhoodCells = globe.getCellsNearPoint(i, j);
  for (const cell of neighborhoodCells) {
    if (luck([cell.i, cell.j].toString()) < cacheSpawnChance) {
      makeCache(mapManager, cell.i / tileDegrees, cell.j / tileDegrees);
    }
  }
  mapManager.addPlayerMovementPolyline(playerMovementHistory);
}

generateNeighborhood(oakesLat, oakesLng);

let geoLocationOn = false;

function success(_pos: GeolocationPosition) {
  playerMovement(0, 0);
}

let watcher = navigator.geolocation.watchPosition(success, undefined, {
  enableHighAccuracy: true,
  maximumAge: 0,
});
navigator.geolocation.clearWatch(watcher);

const northButton = document.getElementById("north") as HTMLButtonElement;
northButton.addEventListener("click", () => {
  if (!geoLocationOn) {
    playerMovement(1, 0);
  }
});

const southButton = document.getElementById("south") as HTMLButtonElement;
southButton.addEventListener("click", () => {
  if (!geoLocationOn) {
    playerMovement(-1, 0);
  }
});

const eastButton = document.getElementById("east") as HTMLButtonElement;
eastButton.addEventListener("click", () => {
  if (!geoLocationOn) {
    playerMovement(0, 1);
  }
});

const westButton = document.getElementById("west") as HTMLButtonElement;
westButton.addEventListener("click", () => {
  if (!geoLocationOn) {
    playerMovement(0, -1);
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
    playerMovement(0, 0);
    updateStatusArea();
    updateCoinDisplay();
  }
});

function playerMovement(latStep: number, lngStep: number) {
  mapManager.movePlayer(latStep, lngStep, tileDegrees);
  playerMovementHistory.push(mapManager.getPlayerLocation());
  const [playerLat, playerLng] = mapManager.getPlayerLocation();
  generateNeighborhood(playerLat, playerLng);
  localStorage.setItem(
    "playerMovementHistory",
    JSON.stringify(playerMovementHistory),
  );
}
