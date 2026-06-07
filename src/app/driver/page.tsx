"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  CheckCircle, 
  Navigation, 
  AlertCircle, 
  Wifi, 
  WifiOff,
  MessageSquare, 
  Check, 
  Truck, 
  User, 
  Weight, 
  Loader2,
  RefreshCw,
  X
} from "lucide-react";

interface LocationData {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  expectedWeightKg: number;
  contactPhone?: string | null;
}

interface RoutePoint {
  id: string;
  sequenceOrder: number;
  expectedWeightKg: number;
  actualWeightKg: number | null;
  status: "PENDING" | "COLLECTED" | "SKIPPED" | "ISSUE";
  failureReason: string | null;
  notes: string | null;
  location: LocationData;
}

interface RouteData {
  id: string;
  vehicleId: string;
  totalWeightKg: number;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  routePoints: RoutePoint[];
}

interface DriverData {
  id: string;
  name: string;
  username?: string | null;
  lineUserId?: string | null;
}

interface VehicleData {
  id: string;
  name: string;
  plateNumber: string;
  capacityKg: number;
}

interface OfflineTask {
  routePointId: string;
  status: "COLLECTED" | "SKIPPED" | "ISSUE";
  actualWeightKg?: number;
  failureReason?: string;
  notes?: string;
}

export default function DriverPage() {
  const [drivers, setDrivers] = useState<DriverData[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [driverProfile, setDriverProfile] = useState<DriverData | null>(null);
  const [vehicle, setVehicle] = useState<VehicleData | null>(null);
  const [route, setRoute] = useState<RouteData | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [networkStatus, setNetworkStatus] = useState<"online" | "offline">("online");
  const [offlineQueue, setOfflineQueue] = useState<OfflineTask[]>([]);
  
  // Modals
  const [activeConfirmPoint, setActiveConfirmPoint] = useState<RoutePoint | null>(null);
  const [activeIssuePoint, setActiveIssuePoint] = useState<RoutePoint | null>(null);
  const [actualWeight, setActualWeight] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [failureReason, setFailureReason] = useState<string>("ขยะเต็มรถก่อนกำหนด");

  // LIFF states
  const [isLiff, setIsLiff] = useState(false);
  const [lineProfile, setLineProfile] = useState<{ displayName: string; pictureUrl?: string; userId: string } | null>(null);
  const [isBinding, setIsBinding] = useState(false);
  const [bindDriverId, setBindDriverId] = useState("");
  const [bindError, setBindError] = useState("");
  const [bindSuccess, setBindSuccess] = useState(false);

  // 1. Fetch available drivers for simulation dropdown
  useEffect(() => {
    const loadDrivers = async () => {
      try {
        const res = await fetch("/api/drivers");
        if (res.ok) {
          const data = await res.json();
          setDrivers(data);
        }
      } catch (e) {
        console.error("Failed to load drivers", e);
      } finally {
        setLoadingDrivers(false);
      }
    };
    loadDrivers();
  }, []);

  // 2. LINE LIFF initialization & network listener
  useEffect(() => {
    // Detect connection status
    setNetworkStatus(navigator.onLine ? "online" : "offline");
    
    const handleOnline = () => {
      setNetworkStatus("online");
      syncOfflineQueue();
    };
    const handleOffline = () => setNetworkStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Load offline queue from localStorage
    const savedQueue = localStorage.getItem("liff_offline_queue");
    if (savedQueue) {
      setOfflineQueue(JSON.parse(savedQueue));
    }

    // Try initializing LIFF (only runs in browser, checking if window/liff exists)
    import("@line/liff").then(async (liffModule) => {
      const liff = liffModule.default;
      try {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID || "mock-liff-id" });
        setIsLiff(true);
        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          setLineProfile({
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl,
            userId: profile.userId
          });
          // Authenticate driver using lineUserId
          loadDriverRoute(null, profile.userId);
        } else {
          // If running inside LINE app, auto login
          if (liff.isInClient()) {
            liff.login();
          }
        }
      } catch (err) {
        console.log("LINE LIFF not initialized (Normal browser mode / Dev simulation enabled)", err);
      }
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // 3. Fetch route for selected driver
  const loadDriverRoute = async (driverId: string | null, lineUserId?: string) => {
    setLoading(true);
    try {
      let url = "/api/driver/route";
      if (lineUserId) {
        url += `?lineUserId=${lineUserId}`;
      } else if (driverId) {
        url += `?driverId=${driverId}`;
      }
      
      const res = await fetch(url);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการโหลดงาน");
      }

      setDriverProfile(data.driver);
      setVehicle(data.vehicle);
      setRoute(data.route);
    } catch (e: any) {
      alert(e.message || "ล้มเหลวในการเชื่อมต่อข้อมูลเส้นทาง");
      setDriverProfile(null);
      setVehicle(null);
      setRoute(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDriverSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedDriverId(val);
    if (val) {
      loadDriverRoute(val);
    } else {
      setDriverProfile(null);
      setVehicle(null);
      setRoute(null);
    }
  };

  // 4. Submit Job Status (handles both online & offline states)
  const submitJobStatus = async (
    routePointId: string,
    status: "COLLECTED" | "SKIPPED" | "ISSUE",
    payload: { actualWeightKg?: number; failureReason?: string; notes?: string }
  ) => {
    if (networkStatus === "offline") {
      // OFFLINE MODE: Queue in localStorage and update UI locally (Optimistic Update)
      const newQueueItem: OfflineTask = {
        routePointId,
        status,
        ...payload
      };

      const updatedQueue = [...offlineQueue, newQueueItem];
      setOfflineQueue(updatedQueue);
      localStorage.setItem("liff_offline_queue", JSON.stringify(updatedQueue));

      // Update UI state locally
      if (route) {
        const updatedPoints = route.routePoints.map((pt) => {
          if (pt.id === routePointId) {
            return {
              ...pt,
              status,
              actualWeightKg: payload.actualWeightKg ?? null,
              failureReason: payload.failureReason ?? null,
              notes: payload.notes ?? null,
            };
          }
          return pt;
        });
        setRoute({ ...route, routePoints: updatedPoints });
      }
      
      alert("สัญญาณออฟไลน์: บันทึกข้อมูลคิวงานเก็บขยะในเครื่องชั่วคราวแล้ว ระบบจะซิงก์เมื่อเน็ตเชื่อมต่อ");
      return;
    }

    // ONLINE MODE: Direct API upload
    try {
      setLoading(true);
      const res = await fetch("/api/driver/route-point", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routePointId,
          status,
          ...payload
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "เกิดข้อผิดพลาดในการบันทึก");
      }

      // Reload route info from server
      if (driverProfile) {
        if (lineProfile) {
          loadDriverRoute(null, lineProfile.userId);
        } else {
          loadDriverRoute(driverProfile.id);
        }
      }
    } catch (e: any) {
      alert(e.message || "บันทึกสถานะงานไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  // 5. Synchronize offline queue to server
  const syncOfflineQueue = async () => {
    const queue = localStorage.getItem("liff_offline_queue");
    if (!queue) return;

    const items: OfflineTask[] = JSON.parse(queue);
    if (items.length === 0) return;

    console.log("Syncing", items.length, "offline updates...");
    
    try {
      for (const item of items) {
        const res = await fetch("/api/driver/route-point", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });

        if (!res.ok) {
          throw new Error("ล้มเหลวในการซิงก์ข้อมูลออฟไลน์บางแถว");
        }
      }

      // Clear local storage queue
      localStorage.removeItem("liff_offline_queue");
      setOfflineQueue([]);
      
      // Reload route from database
      if (driverProfile) {
        if (lineProfile) {
          loadDriverRoute(null, lineProfile.userId);
        } else {
          loadDriverRoute(driverProfile.id);
        }
      }
      alert("ซิงก์คิวงานออฟไลน์เสร็จสมบูรณ์เรียบร้อยแล้ว!");
    } catch (e) {
      console.error("Offline sync failed", e);
    }
  };

  // 5.5 Bind LINE account to database driver
  const handleBindAccount = async () => {
    if (!bindDriverId || !lineProfile) return;
    setIsBinding(true);
    setBindError("");
    try {
      const res = await fetch("/api/driver/bind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverId: bindDriverId,
          lineUserId: lineProfile.userId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "ผูกบัญชีไม่สำเร็จ");
      }
      
      setBindSuccess(true);
      await loadDriverRoute(null, lineProfile.userId);
    } catch (e: any) {
      setBindError(e.message || "เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setIsBinding(false);
    }
  };

  // Modal Actions
  const handleConfirmSubmit = () => {
    if (!activeConfirmPoint) return;
    const parsedWeight = parseFloat(actualWeight);
    submitJobStatus(activeConfirmPoint.id, "COLLECTED", {
      actualWeightKg: isNaN(parsedWeight) ? undefined : parsedWeight,
      notes: notes
    });
    // Reset and close
    setActiveConfirmPoint(null);
    setActualWeight("");
    setNotes("");
  };

  const handleIssueSubmit = () => {
    if (!activeIssuePoint) return;
    submitJobStatus(activeIssuePoint.id, "ISSUE", {
      failureReason,
      notes
    });
    // Reset and close
    setActiveIssuePoint(null);
    setNotes("");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-0 sm:p-4 selection:bg-emerald-500 selection:text-black">
      
      {/* Simulation Bar - Only visible in browser/testing mode (non-LIFF) */}
      {!isLiff && (
        <div className="w-full max-w-md bg-zinc-900 border-x-0 sm:border border-zinc-800 rounded-none sm:rounded-2xl p-4 mb-4 flex items-center justify-between text-xs gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <User className="h-4 w-4 text-emerald-400" />
            <span className="font-semibold text-zinc-400">พรีวิว/ทดสอบคนขับ:</span>
          </div>
          {loadingDrivers ? (
            <div className="flex items-center gap-1 text-zinc-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              กำลังโหลดรายชื่อคนขับ...
            </div>
          ) : (
            <select
              value={selectedDriverId}
              onChange={handleDriverSelectChange}
              className="flex-1 bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="">-- กรุณาเลือกคนขับเพื่อทดสอบ --</option>
              {drivers.map((drv) => (
                <option key={drv.id} value={drv.id}>
                  {drv.name} (คิวงาน)
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Simulated LINE In-App Webview Frame */}
      <div className="w-full sm:max-w-md bg-zinc-900 border-x-0 sm:border border-zinc-850 rounded-none sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col h-screen sm:h-[700px] relative">
        
        {/* LINE Webview Header */}
        <header className="bg-zinc-850 px-4 py-3 flex items-center justify-between border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <Link href="/" className="p-1 hover:bg-zinc-800 rounded-lg transition-colors shrink-0">
              <ArrowLeft className="h-4 w-4 text-zinc-400" />
            </Link>
            
            {lineProfile && (
              <div className="relative shrink-0">
                {lineProfile.pictureUrl ? (
                  <img 
                    src={lineProfile.pictureUrl} 
                    alt={lineProfile.displayName} 
                    className="h-7 w-7 rounded-full border border-emerald-500"
                  />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white">
                    {lineProfile.displayName.charAt(0)}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 border border-zinc-850" />
              </div>
            )}

            <div className="flex flex-col min-w-0">
              <span className="font-bold text-xs text-white truncate">RECYCLE ROUTE (LINE LIFF)</span>
              <span className="text-[10px] text-zinc-400 truncate">
                {driverProfile ? `${driverProfile.name}` : lineProfile ? `LINE: ${lineProfile.displayName}` : "รอยืนยันตัวตนคนขับ"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {networkStatus === "online" ? (
              <span className="text-[10px] bg-emerald-950/40 text-emerald-400 border border-emerald-900/40 px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
                <Wifi className="h-3 w-3" />
                ONLINE
              </span>
            ) : (
              <span className="text-[10px] bg-red-950/40 text-red-400 border border-red-900/40 px-1.5 py-0.5 rounded font-mono flex items-center gap-1 animate-pulse">
                <WifiOff className="h-3 w-3" />
                OFFLINE
              </span>
            )}
          </div>
        </header>

        {/* Offline Queue Bar */}
        {offlineQueue.length > 0 && (
          <div className="bg-amber-950/40 border-b border-amber-900/30 px-4 py-2 text-xs flex items-center justify-between text-amber-400 font-semibold shrink-0">
            <div className="flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>ตรวจพบงานรอซิงก์ออฟไลน์ ({offlineQueue.length} รายการ)</span>
            </div>
            {networkStatus === "online" && (
              <button 
                onClick={syncOfflineQueue}
                className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-black rounded text-[10px] font-bold"
              >
                กดซิงก์ข้อมูล
              </button>
            )}
          </div>
        )}

        {/* Main Body Section */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {loading ? (
            <div className="h-full flex items-center justify-center flex-col text-zinc-500 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
              <span className="text-sm">กำลังอัปเดตระบบเส้นทาง...</span>
            </div>
          ) : !driverProfile ? (
            /* Unlogged State or LINE Binding State */
            lineProfile ? (
              /* LINE Logged in but not bound to any Driver in DB */
              <div className="h-full flex flex-col items-center justify-center p-4">
                <div className="w-full bg-zinc-950 border border-zinc-850 rounded-2xl p-5 space-y-4 shadow-xl">
                  <div className="text-center space-y-2">
                    {lineProfile.pictureUrl ? (
                      <img 
                        src={lineProfile.pictureUrl} 
                        alt={lineProfile.displayName} 
                        className="h-14 w-14 rounded-full mx-auto border border-emerald-500"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center mx-auto text-emerald-400 font-bold text-lg">
                        {lineProfile.displayName.charAt(0)}
                      </div>
                    )}
                    <h3 className="font-bold text-sm text-zinc-200">สวัสดีคุณ {lineProfile.displayName}</h3>
                    <p className="text-[11px] text-zinc-400">
                      บัญชี LINE ของคุณยังไม่ได้ผูกเข้ากับคนขับในระบบ
                    </p>
                  </div>

                  <hr className="border-zinc-850" />

                  <div className="space-y-3">
                    <label className="block text-[11px] font-semibold text-zinc-400">
                      กรุณาเลือกคนขับที่ต้องการผูกข้อมูลเพื่อเริ่มงาน:
                    </label>
                    {loadingDrivers ? (
                      <div className="text-xs text-zinc-500 flex items-center gap-1.5 justify-center py-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />
                        กำลังโหลดคนขับ...
                      </div>
                    ) : (
                      <select
                        value={bindDriverId}
                        onChange={(e) => {
                          setBindDriverId(e.target.value);
                          setBindError("");
                        }}
                        className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="">-- เลือกคนขับในระบบ --</option>
                        {drivers.map((drv) => (
                          <option key={drv.id} value={drv.id}>
                            {drv.name}
                          </option>
                        ))}
                      </select>
                    )}

                    {bindError && (
                      <p className="text-[10px] text-red-400 flex items-center gap-1 bg-red-950/30 border border-red-900/30 px-2 py-1.5 rounded-lg">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        {bindError}
                      </p>
                    )}

                    <button
                      onClick={handleBindAccount}
                      disabled={isBinding || !bindDriverId}
                      className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-850 disabled:text-zinc-600 disabled:cursor-not-allowed text-black font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                    >
                      {isBinding ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          กำลังผูกบัญชี...
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          ผูกบัญชีและเริ่มทำงาน
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Unlogged State (Waiting selection / LINE auth in normal browser) */
              <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-3">
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-zinc-500">
                  <Truck className="h-12 w-12 text-zinc-700 mx-auto" />
                </div>
                <h3 className="font-bold text-zinc-350">กรุณาเข้าสู่ระบบผ่านแอป LINE</h3>
                <p className="text-xs text-zinc-550 max-w-xs">
                  หากทดลองในเบราว์เซอร์ปกติ กรุณาใช้แถบจำลอง **"พรีวิวคนขับ"** ทางด้านบน เพื่อทดสอบระบบได้ทันที
                </p>
              </div>
            )
          ) : !route ? (
            /* Logged in but No Route planned for today */
            <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-3">
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-emerald-500">
                <Truck className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="font-bold text-zinc-250">ยังไม่มีแผนการเดินรถสำหรับวันนี้</h3>
              <p className="text-xs text-zinc-500 max-w-xs">
                ผู้จัดคิวรถ (Dispatcher) ยังไม่ได้คำนวณหรือจัดจัดสรรคิววิ่งให้รถของคุณทะเบียน **{vehicle?.plateNumber}** ในวันนี้
              </p>
            </div>
          ) : (
            /* Active Route checklist view */
            <>
              {/* Profile Card banner */}
              <div className="p-4 bg-zinc-950/60 border border-zinc-850 rounded-2xl flex items-start gap-3">
                <div className="p-2.5 bg-zinc-900 border border-zinc-800 text-emerald-400 rounded-xl">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-200">{driverProfile.name}</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed mt-0.5">
                    รถทะเบียน: <span className="font-bold text-zinc-300 font-mono">{vehicle?.plateNumber}</span> • 
                    บรรทุกแล้ว: <span className="text-emerald-400 font-bold">{route.totalWeightKg}</span>/{vehicle?.capacityKg} กก.
                  </p>
                </div>
              </div>

              {/* Status Header */}
              <div className="flex items-center justify-between pt-2 text-xs">
                <span className="font-bold text-zinc-500 tracking-wider uppercase">ลำดับงานรับขยะวันนี้</span>
                <span className="text-zinc-400 font-bold font-mono">
                  เสร็จสิ้น {route.routePoints.filter(p => p.status !== "PENDING").length}/{route.routePoints.length} จุด
                </span>
              </div>

              {/* Sequence Checklist */}
              <div className="space-y-3 pb-8">
                {route.routePoints.map((point, index) => {
                  const isCompleted = point.status === "COLLECTED";
                  const isSkipped = point.status === "SKIPPED";
                  const isIssue = point.status === "ISSUE";
                  const isPending = point.status === "PENDING";
                  
                  return (
                    <div 
                      key={point.id} 
                      className={`p-4 rounded-2xl border transition-all duration-150 ${
                        isPending 
                          ? "bg-zinc-950 border-zinc-850" 
                          : isCompleted 
                            ? "bg-zinc-950/40 border-zinc-900 opacity-60" 
                            : "bg-zinc-950/40 border-zinc-900 opacity-70"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {/* Circle Icon Badge */}
                          <div className={`px-2 py-1 rounded-lg text-xs font-bold font-mono mt-0.5 ${
                            isCompleted 
                              ? "bg-emerald-950/30 text-emerald-400 border border-emerald-900/20" 
                              : isIssue || isSkipped 
                                ? "bg-red-950/30 text-red-400 border border-red-900/20"
                                : "bg-zinc-900 border border-zinc-800 text-zinc-400"
                          }`}>
                            {index + 1 < 10 ? `0${index + 1}` : index + 1}
                          </div>
                          
                          <div>
                            <h4 className={`font-bold text-sm ${isCompleted ? "line-through text-zinc-500" : "text-zinc-200"}`}>
                              {point.location.name}
                            </h4>
                            <p className="text-xs text-zinc-500 mt-1">ที่อยู่: {point.location.address}</p>
                            
                            {/* Point sub-metrics details */}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] font-semibold text-zinc-400">
                              <span className="flex items-center gap-1">
                                <Weight className="h-3 w-3 text-emerald-500" />
                                ขยะเป้าหมาย: {point.expectedWeightKg} กก.
                              </span>
                              {isCompleted && (
                                <span className="flex items-center gap-1 text-emerald-400 font-mono">
                                  <Check className="h-3 w-3" />
                                  จริง: {point.actualWeightKg !== null ? `${point.actualWeightKg} กก.` : `ไม่ได้ชั่ง (คาดการณ์ ${point.expectedWeightKg} กก.)`}
                                </span>
                              )}
                              {isIssue && (
                                <span className="flex items-center gap-1 text-red-400">
                                  <AlertCircle className="h-3 w-3" />
                                  {point.failureReason || "พบปัญหาหน้างาน"}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status Label on top right */}
                        {!isPending && (
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                            isCompleted 
                              ? "bg-emerald-950/20 text-emerald-400 border-emerald-900/10" 
                              : "bg-red-950/20 text-red-400 border-red-900/10"
                          }`}>
                            {isCompleted ? "เก็บสำเร็จ" : "มีปัญหา/ข้าม"}
                          </span>
                        )}
                      </div>

                      {/* Active Actions (Only when pending) */}
                      {isPending && (
                        <div className="grid grid-cols-3 gap-2.5 pt-4 border-t border-zinc-900 mt-4">
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${point.location.latitude},${point.location.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1 py-2 bg-zinc-900 hover:bg-zinc-850 hover:text-white border border-zinc-850 rounded-xl text-xs font-bold text-zinc-350 transition-colors"
                          >
                            <Navigation className="h-3.5 w-3.5 text-zinc-400" />
                            นำทาง
                          </a>
                          
                          <button
                            onClick={() => setActiveConfirmPoint(point)}
                            className="flex items-center justify-center gap-1 py-2 bg-red-950/20 border border-red-900/25 hover:border-red-950 hover:bg-red-950/30 rounded-xl text-xs font-bold text-red-400 transition-colors"
                          >
                            <AlertCircle className="h-3.5 w-3.5" />
                            พบปัญหา
                          </button>
                          
                          <button
                            onClick={() => {
                              setActiveConfirmPoint(point);
                              setActualWeight("");
                            }}
                            className="flex items-center justify-center gap-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-black rounded-xl text-xs font-extrabold transition-all duration-155 active:scale-[0.97]"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            รับขยะ
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

        </div>

        {/* Modal: Weight Confirmation Dialog */}
        {activeConfirmPoint && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end justify-center p-4">
            <div className="w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4 max-w-sm animate-slide-up">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg text-white">บันทึกปริมาณขยะเก็บจริง</h3>
                <button 
                  onClick={() => setActiveConfirmPoint(null)}
                  className="p-1 hover:bg-zinc-800 rounded-lg"
                >
                  <X className="h-5 w-5 text-zinc-400" />
                </button>
              </div>
              
              <div className="space-y-3.5 text-sm text-zinc-400">
                <p>สถานที่: <b className="text-white">{activeConfirmPoint.location.name}</b></p>
                
                {/* weight input field */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-450 block">น้ำหนักขยะที่เก็บได้ (กิโลกรัม):</label>
                  <input
                    type="number"
                    value={actualWeight}
                    onChange={(e) => setActualWeight(e.target.value)}
                    placeholder={`เช่น ${activeConfirmPoint.expectedWeightKg}`}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold text-lg focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-zinc-400 font-medium">*สามารถเว้นว่างได้หากไม่ได้ชั่งน้ำหนักหน้างาน (ระบบจะใช้ค่าน้ำหนักคาดการณ์ {activeConfirmPoint.expectedWeightKg} กก. แทน)</p>
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-450 block">บันทึกเพิ่มเติม (ถ้ามี):</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="เช่น ขยะแยกแก้วปะปนกระดาษ"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-200 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Action grid */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => {
                    // Turn to issue sub-form
                    setActiveIssuePoint(activeConfirmPoint);
                    setActiveConfirmPoint(null);
                  }}
                  className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-850 text-red-400 border border-zinc-800 rounded-xl text-xs font-bold transition-all duration-200"
                >
                  รายงานรถเต็ม / ปัญหา
                </button>
                <button
                  onClick={handleConfirmSubmit}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-black font-extrabold rounded-xl text-xs transition-all duration-200"
                >
                  ยืนยันอัปเดตงาน
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Issue Reporting Dialog */}
        {activeIssuePoint && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end justify-center p-4">
            <div className="w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4 max-w-sm animate-slide-up">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-lg text-white text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="h-5 w-5" />
                  รายงานปัญหาหน้างาน
                </h3>
                <button 
                  onClick={() => setActiveIssuePoint(null)}
                  className="p-1 hover:bg-zinc-800 rounded-lg"
                >
                  <X className="h-5 w-5 text-zinc-400" />
                </button>
              </div>
              
              <div className="space-y-3.5 text-sm text-zinc-400">
                <p>สถานที่: <b className="text-white">{activeIssuePoint.location.name}</b></p>
                
                {/* failure dropdown selection */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-450 block">ระบุสาเหตุปัญหา:</label>
                  <select
                    value={failureReason}
                    onChange={(e) => setFailureReason(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-200 text-sm focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="ขยะเต็มรถก่อนกำหนด">ขยะล้น/รถเต็มก่อนกำหนด</option>
                    <option value="ทางเข้าปิด / ถนนแคบเข้าไม่ได้">ทางเข้าปิด / ถนนแคบเข้าไม่ได้</option>
                    <option value="ไม่มีผู้รับตัวตนในจุดเก็บ">ติดต่อไม่ได้ / ไม่มีใครอยู่</option>
                    <option value="สภาพจราจร / ยานพาหนะขัดข้อง">รถเสียกลางคัน / สภาพการจราจรติดขัด</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-450 block">อธิบายรายละเอียดเพิ่มเติม:</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="เช่น ยางรั่วตรงแยกไฟแดง"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-200 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setActiveIssuePoint(null)}
                  className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-850 text-zinc-450 border border-zinc-800 rounded-xl text-xs font-bold transition-all duration-200"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleIssueSubmit}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-extrabold rounded-xl text-xs transition-all duration-200"
                >
                  ส่งรายงานปัญหา
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LINE Chat-like simulated footer */}
        <footer className="bg-zinc-850 border-t border-zinc-800 px-4 py-3 flex items-center justify-between text-zinc-500 text-[10px] shrink-0">
          <span>ระบบติดตามงานภายในคนขับรถ</span>
          <span>LIFF v2.21</span>
        </footer>

      </div>
    </div>
  );
}
export const dynamic = 'force-dynamic';
