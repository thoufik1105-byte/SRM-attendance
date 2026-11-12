import React, { useState, useEffect, useRef } from 'react';
import {
  Scan,
  ShieldCheck,
  AlertOctagon,
  Clock,
  CheckCircle2,
  XCircle,
  Smartphone,
  CreditCard,
  Wifi,
  Radio,
  Sparkles,
  ArrowRightLeft,
  Volume2,
  VolumeX
} from 'lucide-react';
import { Student, TimetableSlot, DualScanMachineState, MachineScanEvent } from '../types';
import {
  verifyDualScanPairing,
  generateDynamicAppQrPayload,
  generateIdCardPayload,
  isWithinAttendanceWindow
} from '../utils/security';

interface ClassroomTerminalProps {
  currentSlot: TimetableSlot;
  serverTime: Date;
  activeStudent: Student;
  allStudents: Student[];
  onMachineVerifySuccess: (student: Student) => void;
}

export const ClassroomTerminal: React.FC<ClassroomTerminalProps> = ({
  currentSlot,
  serverTime,
  activeStudent,
  allStudents,
  onMachineVerifySuccess
}) => {
  const [machineState, setMachineState] = useState<DualScanMachineState>({
    machineId: 'TERM-ROOM-304',
    room: currentSlot.room,
    currentSlot: currentSlot,
    status: 'IDLE',
    secondsRemainingForPairing: 5
  });

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [laserActive, setLaserActive] = useState<boolean>(false);
  const [terminalLog, setTerminalLog] = useState<string[]>([
    'Terminal Room 304 booted. NTP network time synchronized.',
    `Hosting slot: ${currentSlot.courseCode} (${currentSlot.startTime} - ${currentSlot.endTime}). Ready for dual-scan.`
  ]);

  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Synthesize terminal kiosk audio beeps
  const playBeep = (freq = 880, duration = 0.12, type: OscillatorType = 'sine') => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch {
      // Audio context might be restricted before user gesture
    }
  };

  const addLog = (msg: string) => {
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
    setTerminalLog((prev) => [`[${timeStr}] ${msg}`, ...prev.slice(0, 15)]);
  };

  // Handle incoming scan (either ID_CARD or APP_QR)
  const handleScanInput = (
    scanType: 'ID_CARD' | 'APP_QR',
    targetStudent: Student,
    customCourseCode = currentSlot.courseCode
  ) => {
    // Check if within timetable window first
    const windowStatus = isWithinAttendanceWindow(serverTime, currentSlot);
    if (!windowStatus.isOpen && !windowStatus.reason?.includes('test')) {
      // Allow demo testing but log warning
      addLog(`[WARNING] Scan received outside standard window: ${windowStatus.reason}`);
    }

    setLaserActive(true);
    setTimeout(() => setLaserActive(false), 800);

    const now = Date.now();
    let payload = '';

    if (scanType === 'ID_CARD') {
      payload = targetStudent.idCardQrPayload || generateIdCardPayload(targetStudent);
      playBeep(640, 0.08);
      addLog(`OPTICAL SCAN: Physical ID Card detected (Student: ${targetStudent.name} - ID ${targetStudent.id})`);
    } else {
      payload = generateDynamicAppQrPayload(
        targetStudent.id,
        customCourseCode,
        serverTime.getTime()
      ).payload;
      playBeep(750, 0.08);
      addLog(`OPTICAL SCAN: Mobile App Dynamic QR detected (Student: ${targetStudent.name} - Course: ${customCourseCode})`);
    }

    const newScanEvent: MachineScanEvent = {
      type: scanType,
      payload,
      studentId: targetStudent.id,
      timestamp: now,
      slotCode: customCourseCode
    };

    // State 1: No previous scan -> start 5-second pairing window
    if (machineState.status === 'IDLE' || machineState.status === 'SUCCESS' || machineState.status === 'FAILED') {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

      setMachineState({
        ...machineState,
        status: 'AWAITING_SECOND_SCAN',
        firstScan: newScanEvent,
        secondScan: undefined,
        secondsRemainingForPairing: 5,
        rejectionReason: undefined
      });

      addLog(`PAIRING TRIGGERED: Awaiting second scan (${scanType === 'ID_CARD' ? 'Phone App QR' : 'Physical ID Card'}) within 5.0s window...`);

      // Start 5-second countdown
      let remaining = 5;
      countdownTimerRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          setMachineState((prev) => ({
            ...prev,
            status: 'FAILED',
            secondsRemainingForPairing: 0,
            rejectionReason: 'Pairing Window Timeout (> 5.0 seconds). Scans must be completed within 5 seconds.'
          }));
          playBeep(220, 0.35, 'sawtooth');
          addLog('ERROR: 5-second pairing window expired. Student failed to complete dual scan.');
        } else {
          setMachineState((prev) => ({
            ...prev,
            secondsRemainingForPairing: remaining
          }));
        }
      }, 1000);

      return;
    }

    // State 2: Awaiting second scan
    if (machineState.status === 'AWAITING_SECOND_SCAN' && machineState.firstScan) {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

      const first = machineState.firstScan;
      const second = newScanEvent;

      setMachineState((prev) => ({
        ...prev,
        status: 'VERIFYING',
        secondScan: second
      }));

      addLog(`DUAL SCAN COMPLETED: First scan [${first.type}] + Second scan [${second.type}]. Verifying cryptographic signatures...`);

      // Verify dual-scan pairing using our tested pure security logic
      const verification = verifyDualScanPairing(
        first,
        second,
        currentSlot.courseCode,
        serverTime.getTime(),
        5
      );

      setTimeout(() => {
        if (verification.success && verification.studentId) {
          const matchedStudent = allStudents.find((s) => s.id === verification.studentId) || targetStudent;
          setMachineState((prev) => ({
            ...prev,
            status: 'SUCCESS',
            pairedStudent: matchedStudent,
            rejectionReason: undefined
          }));
          playBeep(1046, 0.25, 'triangle');
          setTimeout(() => playBeep(1318, 0.3, 'sine'), 120);
          addLog(`✓ VERIFICATION SUCCESSFUL: Identity confirmed for ${matchedStudent.name} (${matchedStudent.id}). Unlocking Face Recognition on student device!`);
          onMachineVerifySuccess(matchedStudent);
        } else {
          setMachineState((prev) => ({
            ...prev,
            status: 'FAILED',
            rejectionReason: verification.error || 'Dual scan validation failed.'
          }));
          playBeep(220, 0.35, 'sawtooth');
          addLog(`✕ VERIFICATION REJECTED: ${verification.error}`);
        }
      }, 700);
    }
  };

  const handleResetMachine = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setMachineState({
      machineId: 'TERM-ROOM-304',
      room: currentSlot.room,
      currentSlot: currentSlot,
      status: 'IDLE',
      secondsRemainingForPairing: 5
    });
    addLog('Terminal reset to IDLE. Ready for next student.');
  };

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl text-slate-100 flex flex-col h-full">
      {/* Kiosk Hardware Top Bezel */}
      <div className="bg-slate-950 px-5 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5 items-center">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-mono font-bold tracking-wider text-emerald-400">ONLINE</span>
          </div>
          <div className="h-4 w-px bg-slate-800" />
          <h2 className="text-sm font-extrabold tracking-tight text-white flex items-center gap-2">
            <span>UNISCAN TERMINAL #304</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 border border-blue-800 text-blue-300 font-mono">
              ROOM 304
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
          <span className="flex items-center gap-1">
            <Wifi className="w-3.5 h-3.5 text-blue-400" /> NTP Synced
          </span>
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1 hover:text-white rounded"
            title={soundEnabled ? 'Mute kiosk sound' : 'Enable kiosk sound'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
        </div>
      </div>

      {/* Terminal Active Course Bar */}
      <div className="bg-blue-950/80 border-b border-blue-900/60 px-5 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-sky-400" />
          <span className="text-slate-300">Active Period:</span>
          <span className="font-bold text-white font-mono">{currentSlot.courseCode} - {currentSlot.courseName}</span>
        </div>
        <div className="flex items-center gap-2 font-mono">
          <span className="text-sky-300">Window: {currentSlot.startTime} - 09:10 AM</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            ATTENDANCE OPEN
          </span>
        </div>
      </div>

      {/* Main Terminal Screen Content */}
      <div className="p-6 flex-1 flex flex-col gap-6">
        {/* Dual Scanner Bay */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Scanner 1: Physical ID Card */}
          <div className={`relative p-5 rounded-2xl border-2 transition-all flex flex-col items-center justify-between min-h-[190px] ${
            machineState.firstScan?.type === 'ID_CARD' || machineState.secondScan?.type === 'ID_CARD'
              ? 'bg-emerald-950/40 border-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
              : 'bg-slate-800/60 border-slate-700/70 hover:border-blue-500/50'
          }`}>
            <div className="w-full flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 font-bold text-slate-300">
                <CreditCard className="w-4 h-4 text-sky-400" /> SCANNER A
              </span>
              <span className={machineState.firstScan?.type === 'ID_CARD' || machineState.secondScan?.type === 'ID_CARD' ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                {machineState.firstScan?.type === 'ID_CARD' || machineState.secondScan?.type === 'ID_CARD' ? '✓ READ OK' : 'READY'}
              </span>
            </div>

            {/* Visual Scanner Target Area */}
            <div className="relative w-32 h-20 bg-slate-900 border border-dashed border-slate-600 rounded-xl flex items-center justify-center overflow-hidden">
              <CreditCard className="w-8 h-8 text-slate-500" />
              {laserActive && (
                <div className="absolute inset-x-0 h-1 bg-red-500 shadow-[0_0_10px_#ef4444] animate-pulse top-1/2"></div>
              )}
            </div>

            <p className="text-xs font-bold text-slate-200 mt-2">Physical Student ID Card</p>
            <p className="text-[11px] text-slate-400 text-center mb-3">
              Reads cryptographic Eyeprint QR on ID card
            </p>

            {/* Quick Trigger Button */}
            <button
              type="button"
              onClick={() => handleScanInput('ID_CARD', activeStudent)}
              className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Tap Sarah Chen's ID Card</span>
            </button>
          </div>

          {/* Scanner 2: Phone App Dynamic QR */}
          <div className={`relative p-5 rounded-2xl border-2 transition-all flex flex-col items-center justify-between min-h-[190px] ${
            machineState.firstScan?.type === 'APP_QR' || machineState.secondScan?.type === 'APP_QR'
              ? 'bg-emerald-950/40 border-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
              : 'bg-slate-800/60 border-slate-700/70 hover:border-blue-500/50'
          }`}>
            <div className="w-full flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
              <span className="flex items-center gap-1.5 font-bold text-slate-300">
                <Smartphone className="w-4 h-4 text-sky-400" /> SCANNER B
              </span>
              <span className={machineState.firstScan?.type === 'APP_QR' || machineState.secondScan?.type === 'APP_QR' ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                {machineState.firstScan?.type === 'APP_QR' || machineState.secondScan?.type === 'APP_QR' ? '✓ READ OK' : 'READY'}
              </span>
            </div>

            {/* Visual Scanner Target Area */}
            <div className="relative w-32 h-20 bg-slate-900 border border-dashed border-slate-600 rounded-xl flex items-center justify-center overflow-hidden">
              <Smartphone className="w-8 h-8 text-slate-500" />
              {laserActive && (
                <div className="absolute inset-x-0 h-1 bg-red-500 shadow-[0_0_10px_#ef4444] animate-pulse top-1/2"></div>
              )}
            </div>

            <p className="text-xs font-bold text-slate-200 mt-2">Student Phone Screen</p>
            <p className="text-[11px] text-slate-400 text-center mb-3">
              Reads 9:00 AM dynamic rolling OTP QR
            </p>

            {/* Quick Trigger Button */}
            <button
              type="button"
              onClick={() => handleScanInput('APP_QR', activeStudent)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Scan Phone Screen QR</span>
            </button>
          </div>
        </div>

        {/* Pairing Status & 5-Second Window Alert */}
        <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Any-Order Dual Scan Pairing Engine
              </span>
            </div>

            {machineState.status === 'AWAITING_SECOND_SCAN' && (
              <div className="flex items-center gap-2 bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                <Clock className="w-3.5 h-3.5" />
                <span>Pairing Window: {machineState.secondsRemainingForPairing}s remaining</span>
              </div>
            )}
          </div>

          {/* Interactive State Feedback Display */}
          {machineState.status === 'IDLE' && (
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-center text-xs text-slate-400">
              Ready for student. Tap either <strong>Sarah's ID Card</strong> or <strong>Phone QR</strong> above to begin dual-scan.
            </div>
          )}

          {machineState.status === 'AWAITING_SECOND_SCAN' && (
            <div className="p-3 bg-blue-950/60 rounded-xl border border-blue-800 text-xs text-blue-200 flex items-center justify-between">
              <div>
                <p className="font-bold text-white">
                  First scan accepted: [{machineState.firstScan?.type}]
                </p>
                <p className="text-[11px] text-blue-300">
                  Now scan the {machineState.firstScan?.type === 'ID_CARD' ? 'Phone App QR' : 'Physical ID Card'} to complete dual authentication!
                </p>
              </div>
              <div className="w-9 h-9 rounded-full bg-blue-600/30 border border-blue-400 flex items-center justify-center font-mono font-bold text-blue-300">
                {machineState.secondsRemainingForPairing}s
              </div>
            </div>
          )}

          {machineState.status === 'SUCCESS' && (
            <div className="p-4 bg-emerald-950/70 border border-emerald-600/80 rounded-xl text-xs text-emerald-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white">
                    DUAL SCAN VERIFIED: {machineState.pairedStudent?.name}
                  </h4>
                  <p className="text-[11px] text-emerald-300">
                    ID Card + Dynamic App QR matched! Signal dispatched to student phone to unlock Face Recognition.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleResetMachine}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold"
              >
                Next Student
              </button>
            </div>
          )}

          {machineState.status === 'FAILED' && (
            <div className="p-4 bg-red-950/70 border border-red-600/80 rounded-xl text-xs text-red-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 border border-red-500 flex items-center justify-center">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-white">AUTHENTICATION REJECTED</h4>
                  <p className="text-[11px] text-red-300">{machineState.rejectionReason}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleResetMachine}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold"
              >
                Reset
              </button>
            </div>
          )}
        </div>

        {/* Anti-Cheat Attack Simulation Buttons for Professors / Reviewers */}
        <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-2xl flex flex-col gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Reviewer Edge-Case Tests (Verify Bulletproof Logic):
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Test Proxy Attack */}
            <button
              type="button"
              onClick={() => {
                handleResetMachine();
                // Scan Sarah's Card, but Marcus's Phone!
                setTimeout(() => {
                  handleScanInput('ID_CARD', activeStudent);
                  const marcus = allStudents.find((s) => s.id !== activeStudent.id) || allStudents[1];
                  setTimeout(() => {
                    handleScanInput('APP_QR', marcus);
                  }, 800);
                }, 100);
              }}
              className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-red-900/60 text-red-300 rounded text-[11px] font-semibold text-left flex items-center gap-1.5 transition-colors"
            >
              <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
              <span>Simulate Proxy Scam (Different Student Phone)</span>
            </button>

            {/* Test Reverse Order */}
            <button
              type="button"
              onClick={() => {
                handleResetMachine();
                // Test Phone first, then Card!
                setTimeout(() => {
                  handleScanInput('APP_QR', activeStudent);
                  setTimeout(() => {
                    handleScanInput('ID_CARD', activeStudent);
                  }, 1200);
                }, 100);
              }}
              className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-blue-900/60 text-sky-300 rounded text-[11px] font-semibold text-left flex items-center gap-1.5 transition-colors"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-sky-400" />
              <span>Test Any-Order (Scan Phone 1st, Card 2nd)</span>
            </button>
          </div>
        </div>

        {/* Live Terminal Hardware Console Log */}
        <div className="mt-auto bg-black/80 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-slate-300 max-h-36 overflow-y-auto">
          <div className="text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-wider flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" /> Live Terminal Syslog
          </div>
          <div className="space-y-0.5">
            {terminalLog.map((log, i) => (
              <div
                key={i}
                className={log.includes('SUCCESS') ? 'text-emerald-400 font-bold' : log.includes('ERROR') || log.includes('REJECTED') ? 'text-red-400 font-bold' : 'text-slate-400'}
              >
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
