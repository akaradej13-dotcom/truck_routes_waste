import Link from "next/link";
import { Truck, Map, ShieldAlert, ArrowRight, Recycle } from "lucide-react";

export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-zinc-950 text-zinc-100 selection:bg-emerald-500 selection:text-black overflow-hidden">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Navigation */}
      <header className="relative z-10 border-b border-zinc-800/80 bg-zinc-950/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Recycle className="h-6 w-6 text-emerald-500 animate-spin-slow" />
            <span className="font-semibold text-lg tracking-wider text-emerald-400 bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              RECYCLE ROUTE
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 bg-zinc-900/80 px-3 py-1.5 rounded-full border border-zinc-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            INTERNAL USE ONLY
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
            ระบบจัดการและวางแผนเส้นทางวิ่ง
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed">
            เพิ่มประสิทธิภาพการเก็บขยะรีไซเคิลด้วยการคำนวณเส้นทางอัจฉริยะ (Route Optimization) 
            ลดการวิ่งซ้ำซ้อน จัดสรรจุดรับงานตามความจุรถได้รวดเร็วและแม่นยำ
          </p>
        </div>

        {/* Portals Grid */}
        <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
          {/* Dispatcher Dashboard Card */}
          <Link href="/dispatcher" className="group relative block p-8 bg-zinc-900/40 rounded-3xl border border-zinc-850 hover:border-emerald-500/30 transition-all duration-300 backdrop-blur-sm overflow-hidden hover:shadow-2xl hover:shadow-emerald-950/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all duration-300" />
            <div className="flex items-center justify-between mb-6">
              <div className="p-4 bg-emerald-950/50 rounded-2xl border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                <Map className="h-8 w-8" />
              </div>
              <ArrowRight className="h-5 w-5 text-zinc-500 group-hover:translate-x-1 group-hover:text-emerald-400 transition-all duration-300" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-100 mb-2 group-hover:text-emerald-400 transition-colors duration-300">
              Dispatcher Dashboard
            </h2>
            <p className="text-zinc-400 text-sm leading-relaxed mb-4">
              ระบบหลังบ้านสำหรับผู้ดูแลการจัดคิวรถ อิมพอร์ตพิกัดจุดเก็บขยะผ่าน Excel คำนวณเส้นทางและติดตามความคืบหน้าการทำงานของรถทุกคันแบบเรียลไทม์
            </p>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-850">
              <span className="text-xs px-2.5 py-1 bg-zinc-950 rounded-md text-zinc-500 border border-zinc-850">Import Excel/CSV</span>
              <span className="text-xs px-2.5 py-1 bg-zinc-950 rounded-md text-zinc-500 border border-zinc-850">Route Optimization</span>
              <span className="text-xs px-2.5 py-1 bg-zinc-950 rounded-md text-zinc-500 border border-zinc-850">Real-time Map</span>
            </div>
          </Link>

          {/* Driver Portal Card */}
          <Link href="/driver" className="group relative block p-8 bg-zinc-900/40 rounded-3xl border border-zinc-850 hover:border-teal-500/30 transition-all duration-300 backdrop-blur-sm overflow-hidden hover:shadow-2xl hover:shadow-teal-950/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-2xl group-hover:bg-teal-500/10 transition-all duration-300" />
            <div className="flex items-center justify-between mb-6">
              <div className="p-4 bg-teal-950/50 rounded-2xl border border-teal-500/20 text-teal-400 group-hover:scale-110 transition-transform duration-300">
                <Truck className="h-8 w-8" />
              </div>
              <ArrowRight className="h-5 w-5 text-zinc-500 group-hover:translate-x-1 group-hover:text-teal-400 transition-all duration-300" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-100 mb-2 group-hover:text-teal-400 transition-colors duration-300">
              Driver Portal (LINE LIFF)
            </h2>
            <p className="text-zinc-400 text-sm leading-relaxed mb-4">
              แอปพลิเคชันฝั่งคนขับในแชต LINE ดูรายการงานประจำวันตามลำดับนำทางอัจฉริยะ ลิงก์แผนที่นำทางภายนอก และรายงานสถานะการรับขยะแบบออฟไลน์
            </p>
            <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-850">
              <span className="text-xs px-2.5 py-1 bg-zinc-950 rounded-md text-zinc-500 border border-zinc-850">LINE LIFF</span>
              <span className="text-xs px-2.5 py-1 bg-zinc-950 rounded-md text-zinc-500 border border-zinc-850">External Navigation</span>
              <span className="text-xs px-2.5 py-1 bg-zinc-950 rounded-md text-zinc-500 border border-zinc-850">Offline Sync</span>
            </div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-900 bg-zinc-950/40 text-center py-6 text-zinc-650 text-xs">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Recycle Route Optimizer. All rights reserved.</p>
          <div className="flex items-center gap-2 text-zinc-600">
            <ShieldAlert className="h-4 w-4" />
            <span>สงวนสิทธิ์การใช้งานเฉพาะพนักงานภายในเท่านั้น</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
