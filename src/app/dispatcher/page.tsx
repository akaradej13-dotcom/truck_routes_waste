"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { 
  ArrowLeft, 
  Upload, 
  MapPin, 
  Users, 
  Play, 
  Calendar, 
  Download, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle,
  Truck,
  Weight,
  Navigation,
  Clock,
  ChevronRight
} from "lucide-react";

// Dynamically import Leaflet Map Component with SSR disabled to prevent server-side window errors
const LeafletMap = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-500 font-medium gap-2">
      <MapPin className="h-8 w-8 animate-bounce text-zinc-650" />
      <span>กำลังโหลดแผนที่...</span>
    </div>
  )
});

interface LocationData {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  expectedWeightKg: number;
  contactPhone?: string | null;
}

interface DriverData {
  id: string;
  name: string;
}

interface VehicleData {
  id: string;
  name: string;
  plateNumber: string;
  capacityKg: number;
  status: "ACTIVE" | "MAINTENANCE" | "INACTIVE";
  driver?: DriverData | null;
}

interface RouteData {
  vehicleId: string;
  vehicleName: string;
  points: LocationData[];
  totalWeightKg: number;
  distanceMeters: number;
  durationSeconds: number;
}

export default function DispatcherPage() {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      const [locsRes, vehsRes, routesRes] = await Promise.all([
        fetch("/api/locations"),
        fetch("/api/vehicles"),
        fetch("/api/routes")
      ]);
      
      if (!locsRes.ok || !vehsRes.ok || !routesRes.ok) {
        throw new Error("ล้มเหลวในการเชื่อมต่อข้อมูลเซิร์ฟเวอร์");
      }

      const locsData = await locsRes.json();
      const vehsData = await vehsRes.json();
      const routesData = await routesRes.json();
      
      setLocations(locsData);
      setVehicles(vehsData);
      setRoutes(routesData);
    } catch (e: any) {
      setError(e.message || "เกิดข้อผิดพลาดในการโหลดข้อมูล");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(null);
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/locations/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "เกิดข้อผิดพลาดในการอิมพอร์ตข้อมูล");
      }

      setSuccess(result.message || "อิมพอร์ตข้อมูลเรียบร้อยแล้ว");
      setRoutes([]); // Clear routes since locations changed
      fetchData();
    } catch (e: any) {
      setError(e.message || "เกิดข้อผิดพลาดในการอัปโหลด");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleOptimize = async () => {
    setError(null);
    setSuccess(null);
    setCalculating(true);

    try {
      const response = await fetch("/api/optimize", {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "การวางแผนเส้นทางล้มเหลว");
      }

      setSuccess(result.message || "จัดเส้นทางเก็บขยะสำเร็จเรียบร้อย");
      fetchData(); // Reload routes and map
    } catch (e: any) {
      setError(e.message || "เกิดข้อผิดพลาดในการประมวลผล");
    } finally {
      setCalculating(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-emerald-500 selection:text-black">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-zinc-800 rounded-xl transition-colors">
              <ArrowLeft className="h-5 w-5 text-zinc-400" />
            </Link>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>Dispatcher Dashboard</span>
              <span className="text-xs px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-900 rounded font-semibold">
                PHASE 3
              </span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-400 flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
              <Calendar className="h-4 w-4 text-emerald-500" />
              {new Date().toLocaleDateString("th-TH", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid lg:grid-cols-3 gap-6">
        
        {/* Left Side: Upload & Control Panel */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          
          {/* Statistics Box */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800">
              <div className="text-zinc-500 text-xs font-semibold mb-1 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                จุดเก็บทั้งหมด
              </div>
              <div className="text-2xl font-bold text-white">{locations.length} จุด</div>
            </div>
            <div className="p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800">
              <div className="text-zinc-500 text-xs font-semibold mb-1 flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-emerald-500" />
                รถเก็บขยะ (Active)
              </div>
              <div className="text-2xl font-bold text-white">
                {vehicles.filter(v => v.status === "ACTIVE").length}/{vehicles.length} คัน
              </div>
            </div>
          </div>
          
          {/* Upload Card */}
          <div className="p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800 backdrop-blur-sm">
            <h2 className="text-lg font-bold text-zinc-200 mb-4 flex items-center gap-2">
              <Upload className="h-5 w-5 text-emerald-500" />
              อัปโหลดจุดเก็บขยะ (Import)
            </h2>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx, .xls, .csv"
              className="hidden"
            />

            <div 
              onClick={triggerFileInput}
              className="border-2 border-dashed border-zinc-850 hover:border-emerald-500/40 rounded-xl p-8 text-center cursor-pointer transition-all duration-300 bg-zinc-950/40 group"
            >
              <FileSpreadsheet className="h-10 w-10 text-zinc-500 group-hover:text-emerald-400 mx-auto mb-3 transition-colors duration-300" />
              <p className="text-sm text-zinc-300 font-medium mb-1">
                {uploading ? "กำลังนำเข้าข้อมูล..." : "คลิกเพื่ออัปโหลดแผนการวิ่ง"}
              </p>
              <p className="text-xs text-zinc-500">รองรับ .xlsx, .xls, .csv</p>
            </div>

            <div className="mt-4 pt-4 border-t border-zinc-850 flex justify-between items-center text-xs">
              <span className="text-zinc-500">ไม่มีไฟล์ตารางขยะ?</span>
              <a 
                href="/sample_locations.xlsx" 
                download
                className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-350 font-semibold"
              >
                <Download className="h-3.5 w-3.5" />
                ดาวน์โหลดไฟล์ตัวอย่าง
              </a>
            </div>
          </div>

          {/* Route Optimization Control Card */}
          <div className="p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800 backdrop-blur-sm">
            <h2 className="text-lg font-bold text-zinc-200 mb-4 flex items-center gap-2">
              <Play className="h-5 w-5 text-emerald-500" />
              จัดคิววิ่งอัจฉริยะ (Optimize)
            </h2>
            <div className="flex flex-col gap-3 text-sm text-zinc-450 mb-5">
              <div className="flex justify-between py-2 border-b border-zinc-850">
                <span>จำนวนจุดรอคิวเก็บขยะ:</span>
                <span className="font-bold text-white">{locations.length} จุด</span>
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-850">
                <span>ปริมาณขยะคาดการณ์รวม:</span>
                <span className="font-bold text-emerald-400">
                  {locations.reduce((sum, l) => sum + l.expectedWeightKg, 0)} กก.
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-850">
                <span>คิวที่จัดแล้ว:</span>
                <span className="font-bold text-white">{routes.length} เส้นทาง</span>
              </div>
            </div>
            
            <button 
              onClick={handleOptimize}
              disabled={calculating || locations.length === 0}
              className={`w-full py-2.5 font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 ${
                calculating 
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" 
                  : locations.length === 0 
                    ? "bg-zinc-900 text-zinc-650 cursor-not-allowed border border-zinc-850" 
                    : "bg-emerald-600 hover:bg-emerald-500 text-black shadow-lg shadow-emerald-950/20 active:scale-[0.98]"
              }`}
            >
              <Play className="h-4 w-4" />
              {calculating ? "กำลังประมวลผลระบบ OSRM..." : "คำนวณเส้นทาง (Run CVRP)"}
            </button>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="p-4 bg-red-950/30 border border-red-500/20 text-red-400 rounded-xl flex items-start gap-2.5 text-sm">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 bg-emerald-950/30 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-start gap-2.5 text-sm">
              <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

        </div>

        {/* Right Side: Map Canvas and Live Location Table */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Map Preview Area */}
          <div className="h-[420px] bg-zinc-900/30 rounded-2xl border border-zinc-800 relative overflow-hidden">
            <LeafletMap locations={locations} routes={routes} />
          </div>

          {/* Planned Routes Breakdown (if calculated) */}
          {routes.length > 0 && (
            <div className="p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800 backdrop-blur-sm">
              <h2 className="text-lg font-bold text-zinc-200 mb-4 flex items-center gap-2">
                <Truck className="h-5 w-5 text-emerald-500" />
                แผนการเดินรถประจำวัน (Daily Route Plans)
              </h2>
              
              <div className="space-y-4">
                {routes.map((route, routeIdx) => (
                  <div key={route.vehicleId} className="p-4 bg-zinc-950/60 rounded-xl border border-zinc-850">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-850 pb-3 mb-3 gap-2">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ background: ROUTE_COLORS[routeIdx % ROUTE_COLORS.length] }} />
                        <h4 className="font-bold text-white">{route.vehicleName}</h4>
                      </div>
                      
                      <div className="flex flex-wrap gap-4 text-xs font-mono text-zinc-450">
                        <span className="flex items-center gap-1">
                          <Weight className="h-3.5 w-3.5 text-emerald-500" />
                          {route.totalWeightKg} กก.
                        </span>
                        <span className="flex items-center gap-1">
                          <Navigation className="h-3.5 w-3.5 text-emerald-500" />
                          {(route.distanceMeters / 1000).toFixed(2)} กม.
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-emerald-500" />
                          {Math.round(route.durationSeconds / 60)} นาที
                        </span>
                      </div>
                    </div>

                    {/* Step-by-Step Points */}
                    <div className="flex flex-wrap items-center gap-y-2 text-xs">
                      <span className="px-2.5 py-1 bg-zinc-900 rounded text-amber-500 font-semibold border border-zinc-800">📍 Depot</span>
                      {route.points.map((pt, index) => (
                        <div key={pt.id} className="flex items-center">
                          <ChevronRight className="h-4 w-4 text-zinc-650 mx-1.5" />
                          <div className="px-2.5 py-1 bg-zinc-900 rounded text-zinc-300 border border-zinc-850 flex items-center gap-1.5">
                            <span className="font-bold text-emerald-500 font-mono">{index + 1}</span>
                            <span>{pt.name}</span>
                            <span className="text-[10px] text-zinc-500">({pt.expectedWeightKg} กก.)</span>
                          </div>
                        </div>
                      ))}
                      <ChevronRight className="h-4 w-4 text-zinc-650 mx-1.5" />
                      <span className="px-2.5 py-1 bg-zinc-900 rounded text-amber-500 font-semibold border border-zinc-800">📍 Depot</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Locations Table */}
          <div className="p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800 backdrop-blur-sm flex flex-col flex-1">
            <h2 className="text-lg font-bold text-zinc-200 mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-emerald-500" />
              จุดพิกัดรอคิวเก็บขยะ ({locations.length} จุด)
            </h2>
            
            {loading ? (
              <div className="text-center py-12 text-zinc-500 text-sm">กำลังโหลดข้อมูลสถานที่...</div>
            ) : locations.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/10 flex-1 flex flex-col items-center justify-center">
                <FileSpreadsheet className="h-10 w-10 text-zinc-650 mb-2" />
                <p className="font-semibold text-zinc-450">ไม่มีข้อมูลพิกัดในระบบ</p>
                <p className="text-xs text-zinc-550 max-w-xs mt-1">
                  กรุณาอัปโหลดไฟล์ Excel เพื่อเพิ่มพิกัดการเก็บขยะประจำวัน
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto flex-1 max-h-[300px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-450 font-bold">
                      <th className="py-2 px-3">ชื่อจุดเก็บ</th>
                      <th className="py-2 px-3">ที่อยู่</th>
                      <th className="py-2 px-3 text-right">น้ำหนักขยะ</th>
                      <th className="py-2 px-3">พิกัด Lat, Lng</th>
                      <th className="py-2 px-3 text-right">เบอร์โทร</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locations.map((loc) => (
                      <tr key={loc.id} className="border-b border-zinc-850 hover:bg-zinc-900/20 text-zinc-300">
                        <td className="py-3 px-3 font-semibold text-white">{loc.name}</td>
                        <td className="py-3 px-3 text-zinc-450 truncate max-w-xs">{loc.address}</td>
                        <td className="py-3 px-3 text-right text-emerald-400 font-semibold font-mono">
                          {loc.expectedWeightKg} กก.
                        </td>
                        <td className="py-3 px-3 font-mono text-xs text-zinc-500">
                          {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                        </td>
                        <td className="py-3 px-3 text-right text-zinc-450">
                          {loc.contactPhone || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </main>
    </div>
  );
}
const ROUTE_COLORS = ["#10b981", "#3b82f6", "#ef4444", "#a855f7", "#f59e0b"];
