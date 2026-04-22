import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Bus, Reporte, Station } from "@/lib/api/types";

// Fix de iconos por defecto Leaflet en bundlers
delete (L.Icon.Default.prototype as unknown as { _getIconUrl: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface Props {
  buses: Bus[];
  stations: Station[];
  reportesByBus: Record<string, Reporte[]>;
  height?: string;
  selectedBusId?: string | null;
  onSelectBus?: (id: string) => void;
}

function busColor(occPct: number) {
  if (occPct >= 85) return "hsl(0 84% 50%)";
  if (occPct >= 60) return "hsl(38 95% 50%)";
  return "hsl(142 70% 40%)";
}

function busIcon(codigo: string, occPct: number) {
  const color = busColor(occPct);
  return L.divIcon({
    className: "",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    html: `
      <div style="position:relative;">
        <div style="
          width:34px;height:34px;border-radius:50%;
          background:${color};
          border:3px solid white;
          box-shadow:0 4px 10px rgba(0,0,0,0.3);
          display:flex;align-items:center;justify-content:center;
          color:white;font-weight:700;font-size:10px;font-family:Inter,sans-serif;">
          ${codigo.split("-")[0].slice(0, 3)}
        </div>
        <div style="
          position:absolute;inset:-6px;border-radius:50%;
          border:2px solid ${color};opacity:0.4;
          animation:metroPulse 2s infinite;"></div>
      </div>
    `,
  });
}

const stationIcon = L.divIcon({
  className: "",
  iconSize: [12, 12],
  iconAnchor: [6, 6],
  html: `<div style="width:12px;height:12px;border-radius:50%;background:hsl(354 78% 46%);border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
});

export const FleetMap = ({ buses, stations, reportesByBus, height = "560px", selectedBusId, onSelectBus }: Props) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<{ buses: L.LayerGroup; stations: L.LayerGroup } | null>(null);

  // init map
  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return;

    // inyectar keyframes una sola vez
    if (!document.getElementById("metro-pulse-style")) {
      const style = document.createElement("style");
      style.id = "metro-pulse-style";
      style.innerHTML = `@keyframes metroPulse {
        0% { transform: scale(1); opacity: 0.5; }
        100% { transform: scale(1.8); opacity: 0; }
      }`;
      document.head.appendChild(style);
    }

    const map = L.map(mapRef.current, {
      center: [-12.07, -77.04],
      zoom: 12,
      zoomControl: true,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    layersRef.current = {
      buses: L.layerGroup().addTo(map),
      stations: L.layerGroup().addTo(map),
    };
    leafletMapRef.current = map;

    return () => {
      map.remove();
      leafletMapRef.current = null;
      layersRef.current = null;
    };
  }, []);

  // estaciones
  useEffect(() => {
    if (!layersRef.current) return;
    layersRef.current.stations.clearLayers();
    stations.forEach((st) => {
      L.marker([st.lat, st.lng], { icon: stationIcon })
        .bindPopup(`<strong>${st.name}</strong><br/><span style="opacity:.7">${st.district}</span>`)
        .addTo(layersRef.current!.stations);
    });
  }, [stations]);

  // buses
  const positions = useMemo(() => {
    return buses.map((b) => {
      const last = reportesByBus[b.id]?.[0];
      return {
        bus: b,
        lat: last?.latitud,
        lng: last?.longitud,
        occ: last?.ocupacionPct ?? 0,
        last,
      };
    }).filter((p) => p.lat !== undefined && p.lng !== undefined);
  }, [buses, reportesByBus]);

  useEffect(() => {
    if (!layersRef.current) return;
    layersRef.current.buses.clearLayers();
    positions.forEach(({ bus, lat, lng, occ, last }) => {
      const marker = L.marker([lat!, lng!], { icon: busIcon(bus.codigo, occ) });
      marker.bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:180px">
          <div style="font-weight:700;font-size:14px">${bus.codigo}</div>
          <div style="font-size:11px;opacity:.7;margin-bottom:6px">Placa ${bus.plate}</div>
          <div style="font-size:12px">Pasajeros: <b>${last?.cantidadPasajeros ?? 0}/${bus.capacidad}</b></div>
          <div style="font-size:12px">Ocupación: <b>${occ}%</b></div>
          <div style="font-size:12px">Velocidad: <b>${last?.velocidadKmh ?? 0} km/h</b></div>
          <div style="font-size:11px;opacity:.6;margin-top:4px">${last ? new Date(last.timestamp).toLocaleTimeString("es-PE") : ""}</div>
        </div>
      `);
      if (onSelectBus) marker.on("click", () => onSelectBus(bus.id));
      if (bus.id === selectedBusId) marker.openPopup();
      marker.addTo(layersRef.current!.buses);
    });
  }, [positions, selectedBusId, onSelectBus]);

  // centrar al bus seleccionado
  useEffect(() => {
    if (!leafletMapRef.current || !selectedBusId) return;
    const p = positions.find((p) => p.bus.id === selectedBusId);
    if (p) leafletMapRef.current.setView([p.lat!, p.lng!], 14, { animate: true });
  }, [selectedBusId, positions]);

  return <div ref={mapRef} style={{ height, width: "100%" }} className="rounded-2xl overflow-hidden border border-border shadow-card z-0" />;
};
