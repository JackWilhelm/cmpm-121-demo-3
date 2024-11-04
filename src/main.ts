// todo
import "./style.css";
import "leaflet/dist/leaflet.css";
import leaflet from "leaflet";
import "./leafletWorkaround.ts";
import luck from "./luck.ts";

const initialLng = 36.98949379578401;
const initialLat = -122.06277128548504;
const initialLocation = leaflet.latLng(initialLng, initialLat);

const zoomLevel = 19;
const tileDegrees = 1e-4;
const neighborhoodSize = 8;
const cacheSpawnChance = 0.1;

const map = leaflet.map(document.getElementById("map")!, {
  center: initialLocation,
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

const player = leaflet.marker(initialLocation);
player.bindTooltip("Here you are!");
player.addTo(map);

let playerCoins = 0;
const statusArea = document.querySelector<HTMLDivElement>("#statusArea")!;
statusArea.innerHTML = `${playerCoins} coins gained`;

interface Cache {
  i: number;
  j: number;
}

function cacheToString(cache: Cache) {
  return `i:${cache.i}, j:${cache.j}`;
}

const cacheMap: Map<string, number> = new Map<string, number>();

function updateMapNumberElement(
  map: Map<string, number>,
  cacheString: string,
  change: number,
): number {
  let returnable: number | undefined = map.get(cacheString);
  if (returnable === undefined) {
    map.set(cacheString, change);
    returnable = map.get(cacheString);
  } else {
    map.set(cacheString, returnable + change);
    returnable = map.get(cacheString);
  }
  if (returnable === undefined) {
    returnable = 0;
  }
  return returnable;
}

function makeCache(i: number, j: number) {
  const origin = initialLocation;
  const boundaries = leaflet.latLngBounds([
    [origin.lat + i * tileDegrees, origin.lng + j * tileDegrees],
    [origin.lat + (i + 1) * tileDegrees, origin.lng + (j + 1) * tileDegrees],
  ]);

  const rect = leaflet.rectangle(boundaries);
  rect.addTo(map);

  rect.bindPopup(() => {
    const newCache: string = cacheToString({ i: i, j: j });
    let cacheCoins: number = 0;
    if (cacheMap.get(newCache) === undefined) {
      cacheCoins = updateMapNumberElement(
        cacheMap,
        newCache,
        Math.floor(luck([i, j, "initialValue"].toString()) * 100),
      );
    } else {
      cacheCoins = updateMapNumberElement(cacheMap, newCache, 0);
    }

    const popupDisplay = document.createElement("div");
    popupDisplay.innerHTML =
      `<div>Cache at "${i},${j}" with a value of <span id="value">${cacheCoins}</span>.</div><button id="collect">collect</button></span>.</div><button id="deposit">deposit</button>`;

    popupDisplay.querySelector<HTMLButtonElement>("#collect")!.addEventListener(
      "click",
      () => {
        if (cacheCoins > 0) {
          cacheCoins = updateMapNumberElement(cacheMap, newCache, -1);
          popupDisplay.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            cacheCoins.toString();
          playerCoins++;
          statusArea.innerHTML = `${playerCoins} coins gained`;
        }
      },
    );

    popupDisplay.querySelector<HTMLButtonElement>("#deposit")!.addEventListener(
      "click",
      () => {
        if (playerCoins > 0) {
          cacheCoins = updateMapNumberElement(cacheMap, newCache, 1);
          popupDisplay.querySelector<HTMLSpanElement>("#value")!.innerHTML =
            cacheCoins.toString();
          playerCoins--;
          statusArea.innerHTML = `${playerCoins} coins gained`;
        }
      },
    );

    return popupDisplay;
  });
}

for (let i = -neighborhoodSize; i < neighborhoodSize; i++) {
  for (let j = -neighborhoodSize; j < neighborhoodSize; j++) {
    if (luck([i, j, initialLng, initialLat].toString()) < cacheSpawnChance) {
      makeCache(i, j);
    }
  }
}
