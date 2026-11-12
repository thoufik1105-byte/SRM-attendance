import React from 'react';
import {
  ShieldAlert,
  Clock,
  Wifi,
  Smartphone,
  CheckCircle,
  AlertTriangle,
  Radio,
  Timer,
  Lock,
  RotateCcw
} from 'lucide-react';
import { TimetableSlot } from '../types';
import { verifyNtpDrift, isWithinAttendanceWindow } from '../utils/security';

interface AntiCheatInspectorProps {
  serverTime: Date;
  onUpdateServerTime: (newTime: Date) => void;
  deviceClockOffsetMs: number;
  onUpdateDeviceOffset: (offsetMs: number) => void;
  activeSlot: TimetableSlot;
  onSelectSlot: (slot: TimetableSlot) => void;
  allSlots: TimetableSlot[];
}

export const AntiCheatInspector: React.FC<AntiCheatInspectorProps> = ({
  serverTime,
  onUpdateServerTime,
  deviceClockOffsetMs,
  onUpdateDeviceOffset,
  activeSlot,
  onSelectSlot,
  allSlots
}) => {
  const simulatedDeviceTime = new Date(serverTime.getTime() + deviceClockOffsetMs);
  const ntpCheck = verifyNtpDrift(simulatedDeviceTime.getTime(), serverTime.getTime());
  const windowCheck = isWithinAttendanceWindow(serverTime, activeSlot);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-slate-100 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/40">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">
              Anti-Cheat Engine & Security Verification Hub
            </h3>
            <p className="text-xs text-slate-400">
              Simulate attacks and inspect the three bulletproof mechanisms implemented for college defense.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            NTP Server: <strong className="text-white">pool.ntp.org</strong>
          </span>
        </div>
      </div>

      {/* Grid of the 3 Key Defenses */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Defense 1: Timetable-Based Attendance Windows */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> Defense 1: Timetable Window
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  windowCheck.isOpen
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-red-500/20 text-red-300 border border-red-500/40'
                }`}
              >
                {windowCheck.isOpen ? 'WINDOW OPEN' : 'WINDOW CLOSED'}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
              QR triggers only during the first 10-minute window of each timetable period ({activeSlot.startTime}–09:10 AM) and auto-expires immediately once late cutoff passes.
            </p>

            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-xs space-y-1 mb-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Current Slot:</span>
                <span className="font-bold text-white font-mono">{activeSlot.courseCode} ({activeSlot.room})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Class Hours:</span>
                <span className="text-slate-300 font-mono">{activeSlot.startTime} - {activeSlot.endTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className={windowCheck.isOpen ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                  {windowCheck.isOpen ? `Active (${Math.floor(windowCheck.secondsRemaining / 60)}m ${windowCheck.secondsRemaining % 60}s left)` : windowCheck.reason}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Slot / Time Test Presets */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Test Time Scenarios:</span>
            <div className="grid grid-cols-3 gap-1 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  const d = new Date(serverTime);
                  d.setHours(8, 55, 0, 0);
                  onUpdateServerTime(d);
                }}
                className="py-1 px-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-slate-300 text-center font-mono"
              >
                08:55 AM (Early)
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date(serverTime);
                  d.setHours(9, 2, 0, 0);
                  onUpdateServerTime(d);
                }}
                className="py-1 px-1.5 bg-blue-900/60 hover:bg-blue-800 border border-blue-700 rounded text-blue-200 text-center font-mono font-bold"
              >
                09:02 AM (Open)
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date(serverTime);
                  d.setHours(9, 18, 0, 0);
                  onUpdateServerTime(d);
                }}
                className="py-1 px-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-slate-300 text-center font-mono"
              >
                09:18 AM (Late)
              </button>
            </div>
          </div>
        </div>

        {/* Defense 2: Network Time Sync (Anti-Clock-Hack) */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                <Wifi className="w-4 h-4" /> Defense 2: Anti-Clock-Hack
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  ntpCheck.synced
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-red-500/20 text-red-300 border border-red-500/40'
                }`}
              >
                {ntpCheck.synced ? 'NTP SYNCED' : 'CLOCK HACK DETECTED'}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
              If a student tries manually advancing their phone clock to 9:00 AM early, the app validates against NTP server time and rejects generation.
            </p>

            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-xs space-y-1 mb-3 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">NTP Server Time:</span>
                <span className="text-white font-bold">
                  {serverTime.toLocaleTimeString('en-US', { hour12: true })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Device Clock:</span>
                <span className={ntpCheck.synced ? 'text-slate-200' : 'text-red-400 font-bold'}>
                  {simulatedDeviceTime.toLocaleTimeString('en-US', { hour12: true })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Drift Offset:</span>
                <span className={ntpCheck.synced ? 'text-emerald-400' : 'text-red-400 font-bold'}>
                  {deviceClockOffsetMs >= 0 ? '+' : ''}{Math.round(deviceClockOffsetMs / 1000)}s
                </span>
              </div>
            </div>
          </div>

          {/* Test Manual Clock Hack Trigger */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Simulate Student Tamper:</span>
            <div className="grid grid-cols-2 gap-1 text-[11px]">
              <button
                type="button"
                onClick={() => onUpdateDeviceOffset(10 * 60 * 1000)} // +10 minutes forward hack
                className="py-1 px-2 bg-red-950/60 hover:bg-red-900 border border-red-800 rounded text-red-300 text-center font-semibold"
              >
                Forward Clock +10m
              </button>
              <button
                type="button"
                onClick={() => onUpdateDeviceOffset(0)} // Reset to synchronized
                className="py-1 px-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-emerald-300 text-center font-semibold flex items-center justify-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Reset NTP Sync
              </button>
            </div>
          </div>
        </div>

        {/* Defense 3: Any-Order Dual Scan & 5-Second Window */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                <Timer className="w-4 h-4" /> Defense 3: 5s Any-Order Dual Scan
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-sky-300 border border-blue-500/40">
                DOOR ENGINE
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
              During morning rush, students can scan ID card first or phone first. The classroom terminal pairs both scans within 5 seconds to prevent line congestion and block proxy attendance.
            </p>

            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-xs space-y-1 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Order Supported:</span>
                <span className="text-emerald-400 font-bold">Any Order (ID ↔ Phone)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Pairing Window:</span>
                <span className="text-white font-mono font-bold">5.0 Seconds Strict</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Biometric Unlock:</span>
                <span className="text-sky-300 font-semibold">Immediate on Match</span>
              </div>
            </div>
          </div>

          <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800 text-[10px] text-slate-400 text-center">
            Tested & Verified: Prevents passing phone screenshots to friends outside class.
          </div>
        </div>
      </div>
    </div>
  );
};
