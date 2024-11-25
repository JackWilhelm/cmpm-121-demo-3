import "leaflet/dist/leaflet.css";
import leaflet from "leaflet";
import "./leafletWorkaround.ts";

export class MapManager {
  private map: leaflet.Map;
  private playerMarker: leaflet.Marker;

  constructor(initialLocation: leaflet.LatLng, zoomLevel: number) {
    this.map = leaflet.map(document.getElementById("map")!, {
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
    }).addTo(this.map);

    this.playerMarker = leaflet.marker(initialLocation).addTo(this.map);
    this.playerMarker.bindTooltip("You are here!");
  }

  movePlayer(latStep: number, lngStep: number, tileDegrees: number): void {
    const currentPos = this.playerMarker.getLatLng();
    const newLatLng = leaflet.latLng(
      currentPos.lat + (tileDegrees * latStep),
      currentPos.lng + (tileDegrees * lngStep),
    );
    this.playerMarker.setLatLng(newLatLng);
    this.map.setView(newLatLng);
  }

  wipeOverlays(): void {
    this.map.eachLayer((layer: leaflet.Layer) => {
      if (
        layer !== this.playerMarker && !(layer instanceof leaflet.TileLayer)
      ) {
        this.map.removeLayer(layer);
      }
    });
  }

  setView(lat: number, lng: number) {
    this.map.setView(leaflet.latLng(
      lat,
      lng,
    ));
  }

  getPlayerLocation() {
    const playerPos = this.playerMarker.getLatLng();
    return [playerPos.lat, playerPos.lng];
  }

  drawCache(
    i: number,
    j: number,
    bounds: leaflet.LatLngBounds,
    getCurrentValue: () => number,
    popupCallback: (
      action: string,
      updateValue: (newValue: number) => void,
    ) => void,
  ): void {
    const rect = leaflet.rectangle(bounds);
    rect.addTo(this.map);

    rect.bindPopup(() => {
      const popupDisplay = document.createElement("div");
      const currentValue = getCurrentValue();
      popupDisplay.innerHTML = `
            <div>Cache at "${i},${j}" with a value of <span id="value">${currentValue}</span>.</div>
            <button id="collect">collect</button>
            <button id="deposit">deposit</button>
          `;

      const valueSpan = popupDisplay.querySelector<HTMLSpanElement>("#value")!;

      const updateValue = (newValue: number) => {
        valueSpan.innerHTML = newValue.toString();
      };

      popupDisplay.querySelector<HTMLButtonElement>("#collect")!
        .addEventListener(
          "click",
          () => popupCallback("collect", updateValue),
        );
      popupDisplay.querySelector<HTMLButtonElement>("#deposit")!
        .addEventListener(
          "click",
          () => popupCallback("deposit", updateValue),
        );

      return popupDisplay;
    });
  }
}
