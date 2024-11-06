// todo
import "./style.css";
import "leaflet/dist/leaflet.css";
import leaflet from "leaflet";
import "./leafletWorkaround.ts";
import luck from "./luck.ts";
import { Board } from "./board.ts";

const oakesLat = 36.98949379578401;
const oakesLng = -122.06277128548504;
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

const playerInventory: Cache = { coins: [] };
const playerCoins = 0;
const statusArea = document.querySelector<HTMLDivElement>("#statusArea")!;
statusArea.innerHTML = `${playerCoins} coins gained`;

const globe = new Board(tileDegrees, neighborhoodSize);

interface Cache {
  coins: Coin[];
}

interface Coin {
  i: number;
  j: number;
  serial: number;
}

function coinToString(coin: Coin): string {
  return `${coin.i}:${coin.j}#${coin.serial}`;
}

function makeCache(i: number, j: number) {
  const thisCell = globe.getCellForPoint(leaflet.latLng(i, j));
  const thisCellBounds = globe.getCellBounds(thisCell);
  const newCache: Cache = { coins: [] };
  for (
    let serial = 0;
    serial < Math.floor(luck([i, j, "initialValue"].toString()) * 100);
    serial++
  ) {
    newCache.coins.push({ i: i, j: j, serial: serial });
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
          console.log(coinToString(coin));
        }
      },
    );

    return popupDisplay;
  });
}

const startingZone = globe.getCellsNearPoint(oakesLocation);
for (const cell of startingZone) {
  if (luck([cell.i, cell.j].toString()) < cacheSpawnChance) {
    makeCache(cell.i / tileDegrees, cell.j / tileDegrees);
  }
}
