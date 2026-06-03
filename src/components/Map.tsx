"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

interface LocationData {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  expectedWeightKg: number;
  contactPhone?: string | null;
}

interface RouteData {
  vehicleId: string;
  vehicleName: string;
  points: LocationData[];
  totalWeightKg: number;
  distanceMeters: number;
  durationSeconds: number;
}

interface MapProps {
  locations: LocationData[];
  routes?: RouteData[];
}

const DEPOT = { latitude: 13.7563, longitude: 100.5018 }; // Bangkok Center
const ROUTE_COLORS = ["#10b981", "#3b82f6", "#ef4444", "#a855f7", "#f59e0b"]; // Emerald, Blue, Red, Purple, Amber

export default function MapComponent({ locations, routes = [] }: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);

  useEffect(() => {
    let isMounted = true;

    // Dynamically load Leaflet on client-side only
    import("leaflet").then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Fix default marker icon issues in Next.js builds
      const DefaultIcon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      
      const DepotIcon = L.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      L.Marker.prototype.options.icon = DefaultIcon;

      // Create map instance if not already created
      if (!mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapContainerRef.current).setView([DEPOT.latitude, DEPOT.longitude], 11);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mapInstanceRef.current);
      }

      const map = mapInstanceRef.current;

      // Remove old markers & polylines
      markersRef.current.forEach((m) => map.removeLayer(m));
      markersRef.current = [];

      polylinesRef.current.forEach((p) => map.removeLayer(p));
      polylinesRef.current = [];

      const bounds: [number, number][] = [];

      // 1. Add Depot marker
      const depotMarker = L.marker([DEPOT.latitude, DEPOT.longitude], { icon: DepotIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: sans-serif; color: #1f2937;">
            <h4 style="margin: 0; font-weight: bold; font-size: 14px; color: #b45309;">📍 สถานีส่วนกลาง (Depot)</h4>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #4b5563;">จุดเริ่มต้นและจุดสิ้นสุดของรถเก็บขยะทุกคัน</p>
          </div>
        `);
      markersRef.current.push(depotMarker);
      bounds.push([DEPOT.latitude, DEPOT.longitude]);

      // 2. Add location markers
      locations.forEach((loc) => {
        const marker = L.marker([loc.latitude, loc.longitude])
          .addTo(map)
          .bindPopup(`
            <div style="font-family: sans-serif; color: #1f2937;">
              <h4 style="margin: 0 0 4px 0; font-weight: bold; font-size: 14px;">${loc.name}</h4>
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #4b5563;">${loc.address}</p>
              ${loc.contactPhone ? `<p style="margin: 0 0 4px 0; font-size: 11px; color: #10b981;">☎ ${loc.contactPhone}</p>` : ''}
              <p style="margin: 0; font-size: 11px; color: #4b5563; font-weight: bold;">คาดการณ์ปริมาณขยะ: <span style="color: #ef4444;">${loc.expectedWeightKg} กก.</span></p>
            </div>
          `);
        
        markersRef.current.push(marker);
        bounds.push([loc.latitude, loc.longitude]);
      });

      // 3. Draw routes if available
      if (routes && routes.length > 0) {
        routes.forEach((route, routeIdx) => {
          const color = ROUTE_COLORS[routeIdx % ROUTE_COLORS.length];
          const pathPoints: [number, number][] = [
            [DEPOT.latitude, DEPOT.longitude], // Start at depot
            ...route.points.map((pt) => [pt.latitude, pt.longitude] as [number, number]),
            [DEPOT.latitude, DEPOT.longitude]  // Return to depot
          ];

          // Draw polyline
          const polyline = L.polyline(pathPoints, {
            color: color,
            weight: 4,
            opacity: 0.8,
            dashArray: '5, 10'
          }).addTo(map);

          polyline.bindPopup(`
            <div style="font-family: sans-serif; color: #1f2937; min-width: 150px;">
              <h4 style="margin: 0 0 4px 0; font-weight: bold; font-size: 13px; color: ${color};">${route.vehicleName}</h4>
              <p style="margin: 0 0 2px 0; font-size: 11px; color: #4b5563;">น้ำหนักขยะรวม: <b>${route.totalWeightKg} กก.</b></p>
              <p style="margin: 0 0 2px 0; font-size: 11px; color: #4b5563;">ระยะทางวิ่ง: <b>${(route.distanceMeters / 1000).toFixed(2)} กม.</b></p>
              <p style="margin: 0; font-size: 11px; color: #4b5563;">เวลาเดินทาง: <b>${Math.round(route.durationSeconds / 60)} นาที</b></p>
            </div>
          `);

          polylinesRef.current.push(polyline);
        });
      }

      // Adjust map bounds to fit everything (depot, locations, routes)
      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [40, 40] });
      } else {
        map.setView([DEPOT.latitude, DEPOT.longitude], 11);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [locations, routes]);

  // Secondary cleanup on final page unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div 
      ref={mapContainerRef} 
      className="w-full h-full min-h-[400px] z-0 rounded-2xl overflow-hidden" 
      style={{ background: "#18181b" }}
    />
  );
}
