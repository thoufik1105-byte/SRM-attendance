import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Lock,
  CheckCircle,
  HelpCircle,
  Clock,
  Home,
  Scan,
  User,
  History,
  Camera,
  AlertTriangle,
  RotateCw,
  Eye,
  Check,
  RefreshCw,
  Sparkles,
  Settings
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Student, TimetableSlot, AttendanceRecord, MobileScreen } from '../types';
import { QRCodeCanvas } from './QRCodeCanvas';
import { generateDynamicAppQrPayload, calculateFacialMatchConfidence } from '../utils/security';

interface StudentMobileAppProps {
  student: Student;
  activeSlot: TimetableSlot;
  serverTime: Date;
  onAttendanceMarked: (record: AttendanceRecord) => void;
  // External triggers from classroom machine
  isMachineVerified: boolean;
  onNavigateTab?: (tab: string) => void;
  attendanceRecords: AttendanceRecord[];
  initialScreen?: MobileScreen;
}

export const StudentMobileApp: React.FC<StudentMobileAppProps> = ({
  student,
  activeSlot,
  serverTime,
  onAttendanceMarked,
  isMachineVerified,
  attendanceRecords,
  initialScreen = 'SCAN_QR'
}) => {
  const [currentScreen, setCurrentScreen] = useState<MobileScreen>(initialScreen);
  const [activeNavTab, setActiveNavTab] = useState<'home' | 'scan' | 'history' | 'profile'>('scan');
  const [screenshotAttempted, setScreenshotAttempted] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [isVerifyingFace, setIsVerifyingFace] = useState(false);
  const [faceMatchScore, setFaceMatchScore] = useState<number>(0);
  const [faceScanSuccess, setFaceScanSuccess] = useState(false);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState(41);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [useRealWebcam, setUseRealWebcam] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Generate dynamic QR code matching 9:00 AM auto-trigger with rolling OTP
  const dynamicQr = generateDynamicAppQrPayload(
    student.id,
    activeSlot.courseCode,
    serverTime.getTime(),
    30
  );

  // Automatically advance to 'VERIFYING' screen when classroom machine verifies both QRs!
  useEffect(() => {
    if (isMachineVerified && currentScreen === 'SCAN_QR') {
      setCurrentScreen('VERIFYING');
    }
  }, [isMachineVerified, currentScreen]);

  // Live countdown timer matching "Time Remaining: 00:41"
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemainingSeconds((prev) => {
        if (prev <= 1) return 41; // rolling cycle
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // FLAG_SECURE Simulation: Listen for screenshot keyboard events (PrintScreen, Meta+Shift+3/4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'PrintScreen' ||
        (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === 's'))
      ) {
        e.preventDefault();
        triggerFlagSecureAlert();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const triggerFlagSecureAlert = () => {
    setScreenshotAttempted(true);
    setTimeout(() => {
      setScreenshotAttempted(false);
    }, 3500);
  };

  // Start real camera if allowed, or fallback to simulated video feed
  const startCamera = async () => {
    setIsVerifyingFace(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } }
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setUseRealWebcam(true);
    } catch {
      // Fallback to high-quality simulated camera
      setUseRealWebcam(false);
    }
    setCameraActive(true);

    // Run facial biometric matching simulation
    let progress = 35;
    const interval = setInterval(() => {
      progress += 15;
      if (progress >= 98) {
        clearInterval(interval);
        const matchResult = calculateFacialMatchConfidence(
          student.eyeprintVector,
          student.eyeprintVector.map((v) => v * (0.98 + Math.random() * 0.04))
        );
        setFaceMatchScore(matchResult.matchPercent);
        setIsVerifyingFace(false);
        setFaceScanSuccess(true);

        // Confetti celebration
        try {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.7 }
          });
        } catch {
          // ignore if canvas-confetti issues
        }

        // Record attendance
        const record: AttendanceRecord = {
          id: `att-${Date.now()}`,
          studentId: student.id,
          studentName: student.name,
          rollNumber: student.rollNumber,
          courseCode: activeSlot.courseCode,
          room: activeSlot.room,
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          status: 'PRESENT',
          dualScanTimeDeltaMs: 1840,
          idScanTimestamp: '09:00:14',
          appScanTimestamp: '09:00:16',
          facialMatchPercent: matchResult.matchPercent,
          ntpVerified: true,
          securityChecks: {
            antiScreenshot: true,
            rollingOtpValid: true,
            dualScanPaired: true,
            biometricEyeprintMatched: true,
            ntpClockTamperChecked: true
          }
        };
        onAttendanceMarked(record);
      } else {
        setFaceMatchScore(progress);
      }
    }, 600);
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleProceedToFaceScan = () => {
    setCurrentScreen('FACE_SCAN');
    startCamera();
  };

  const handleResetWorkflow = () => {
    stopCamera();
    setFaceScanSuccess(false);
    setIsVerifyingFace(false);
    setFaceMatchScore(0);
    setCurrentScreen('SCAN_QR');
  };

  return (
    <div className="relative mx-auto flex flex-col items-center">
      {/* Mobile Device Frame */}
      <div className="relative w-[380px] h-[780px] bg-slate-900 rounded-[48px] p-3 shadow-2xl ring-1 ring-slate-700/50 flex flex-col overflow-hidden">
        {/* Phone Speaker Notch / Dynamic Island */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-40 flex items-center justify-between px-3">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
          <div className="w-2 h-2 rounded-full bg-blue-900/60 ring-1 ring-blue-500/30" />
        </div>

        {/* FLAG_SECURE Blackout Overlay (Triggered on Screenshot Attempt) */}
        {screenshotAttempted && (
          <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 text-center text-white animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-4 ring-2 ring-red-500">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-red-400 mb-2">FLAG_SECURE ACTIVATED</h3>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Screenshot & screen capture are blocked by UniScan security policy to prevent attendance proxy sharing.
            </p>
            <span className="px-3 py-1 bg-red-950/80 border border-red-800/60 rounded text-[11px] font-mono text-red-300">
              Anti-Capture Layer Active (Android / iOS)
            </span>
          </div>
        )}

        {/* Inner Screen Content */}
        <div className="relative flex-1 bg-white rounded-[38px] overflow-hidden flex flex-col select-none text-slate-800">
          {/* iOS / Android Status Bar */}
          <div className="h-10 pt-2 px-6 flex justify-between items-center text-xs font-semibold text-slate-800 bg-white z-20">
            <span className="font-mono text-[13px]">9:41</span>
            <div className="flex items-center gap-1.5 text-slate-700">
              <div className="flex gap-0.5 items-end h-2.5">
                <span className="w-0.5 h-1 bg-current rounded-sm"></span>
                <span className="w-0.5 h-1.5 bg-current rounded-sm"></span>
                <span className="w-0.5 h-2 bg-current rounded-sm"></span>
                <span className="w-0.5 h-2.5 bg-current rounded-sm"></span>
              </div>
              <span className="text-[11px] font-bold">5G</span>
              <div className="w-5 h-2.5 border border-slate-700 rounded-sm p-0.5 flex items-center">
                <div className="h-full w-full bg-slate-800 rounded-xs"></div>
              </div>
            </div>
          </div>

          {/* SCREEN 1: SCAN QR (Exact match to reference photo screen 1) */}
          {currentScreen === 'SCAN_QR' && activeNavTab === 'scan' && (
            <div className="flex-1 flex flex-col justify-between overflow-y-auto">
              {/* App Bar */}
              <div className="bg-[#0b5cbf] px-4 py-2.5 text-white flex items-center justify-between shadow-sm">
                <h1 className="text-base font-bold tracking-tight">UniScan Attendance</h1>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(true)}
                  aria-label="Settings"
                  className="p-1 hover:bg-blue-600/50 rounded-full transition-colors"
                >
                  <Settings className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Course Subheader Bar */}
              <div className="bg-[#1976d2] px-3 py-1.5 text-center text-white text-[12px] font-medium tracking-wide">
                Course: {activeSlot.courseCode}&nbsp;&nbsp;9:00 AM (Mon, Oct 28)
              </div>

              {/* Main Content Area */}
              <div className="px-4 py-3 flex-1 flex flex-col items-center">
                {/* Attendance Open Card */}
                <div className="w-full bg-[#f8fafc] border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-[#0a4b9c] text-white text-center py-1.5 text-[13px] font-extrabold tracking-wider">
                    ATTENDANCE OPEN
                  </div>
                  <div className="p-3 flex flex-col items-center">
                    <div className="text-[13px] font-bold text-slate-800 mb-2">
                      Time Remaining:{' '}
                      <span className="font-mono text-red-600 font-extrabold">
                        00:{timeRemainingSeconds.toString().padStart(2, '0')}
                      </span>
                    </div>

                    {/* QR Code Container with Left Shield Badge (Pixel perfect to reference) */}
                    <div className="relative flex items-center justify-center my-1">
                      {/* Floating Screenshot Protected Shield Badge */}
                      <div className="absolute -left-7 z-10 flex flex-col items-center filter drop-shadow-md">
                        <div className="w-20 bg-gradient-to-b from-[#0284c7] to-[#0369a1] text-white p-1 rounded-t-lg border border-sky-400/40 text-center shadow-lg">
                          <p className="text-[8px] font-black uppercase tracking-tight leading-tight">
                            Screenshot
                          </p>
                          <p className="text-[7.5px] font-bold uppercase tracking-tight leading-tight">
                            Protected
                          </p>
                        </div>
                        {/* Padlock Icon Center */}
                        <div className="w-12 h-12 -my-1 rounded-full bg-[#0a4b9c] border-2 border-white flex items-center justify-center text-white shadow-md z-10">
                          <Lock className="w-6 h-6 stroke-[2.5]" />
                        </div>
                        {/* Dynamic Code Bottom Badge */}
                        <div className="w-20 bg-[#0284c7] text-white py-0.5 px-1 rounded-b-lg border border-sky-400/40 text-center shadow-lg -mt-1">
                          <p className="text-[7.5px] font-black uppercase tracking-tight">
                            Dynamic Code
                          </p>
                        </div>
                      </div>

                      {/* QR Canvas */}
                      <div className="bg-white p-2.5 rounded-xl border-2 border-slate-300 shadow-sm ml-6">
                        <QRCodeCanvas
                          value={dynamicQr.payload}
                          size={168}
                          includeLogo={true}
                        />
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 mt-2 font-medium text-center">
                      Scan this code at classroom terminal
                    </p>
                  </div>
                </div>

                {/* Verification Status */}
                <div className="w-full mt-3 bg-slate-100 border border-slate-200 rounded-lg py-2 px-3 text-center">
                  <span className="text-[12px] text-slate-700 font-medium">
                    Verification Status:{' '}
                    <span className="font-bold text-amber-700">Pending Scan</span>
                  </span>
                </div>

                {/* Action Buttons: View History & Help */}
                <div className="w-full grid grid-cols-2 gap-2 mt-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveNavTab('history')}
                    className="py-1.5 px-2 bg-white border border-[#1976d2] text-[#1976d2] rounded-lg text-xs font-semibold hover:bg-blue-50 transition-colors shadow-2xs text-center"
                  >
                    View History
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowHelpModal(true)}
                    className="py-1.5 px-2 bg-white border border-[#1976d2] text-[#1976d2] rounded-lg text-xs font-semibold hover:bg-blue-50 transition-colors shadow-2xs text-center"
                  >
                    Help
                  </button>
                </div>

                {/* Gray Locked Face Recognition Button */}
                <div className="w-full mt-2.5">
                  <button
                    type="button"
                    disabled
                    className="w-full py-2.5 px-4 bg-slate-300 text-slate-600 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-not-allowed shadow-xs"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Face Recognition (Locked)</span>
                  </button>
                  <p className="text-[10px] text-slate-600 mt-1 text-center italic">
                    Unlocks after classroom terminal dual-scan
                  </p>
                </div>

                {/* Anti-Screenshot Test Button for Reviewer */}
                <div className="w-full mt-auto pt-2">
                  <button
                    type="button"
                    onClick={triggerFlagSecureAlert}
                    className="w-full py-1 text-[10px] text-slate-600 hover:text-slate-700 bg-slate-50 border border-dashed border-slate-300 rounded flex items-center justify-center gap-1"
                  >
                    <Shield className="w-3 h-3 text-sky-600" />
                    <span>Simulate Screenshot Attempt (Test FLAG_SECURE)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SCREEN 2: VERIFYING (Exact match to reference photo screen 2) */}
          {currentScreen === 'VERIFYING' && activeNavTab === 'scan' && (
            <div className="flex-1 flex flex-col justify-between overflow-y-auto">
              {/* Header */}
              <div>
                <div className="bg-[#0b5cbf] px-4 py-2.5 text-white flex items-center justify-between shadow-sm">
                  <h1 className="text-base font-bold tracking-tight">UniScan Verification</h1>
                  <span className="w-5" />
                </div>
                {/* Horizontal Progress Bar */}
                <div className="w-full bg-blue-900/30 h-1.5">
                  <div className="bg-sky-400 h-1.5 w-3/5 transition-all duration-700"></div>
                </div>
              </div>

              {/* Main Content Card */}
              <div className="px-4 py-4 flex-1 flex flex-col items-center">
                <div className="w-full bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  {/* Card Title */}
                  <div className="bg-[#0a4b9c] text-white text-center py-2 text-[13px] font-bold tracking-wide">
                    Verification in Progress ({activeSlot.courseCode})
                  </div>

                  <div className="p-4 flex flex-col items-center">
                    {/* Student Identity */}
                    <div className="text-[15px] font-extrabold text-slate-900 mb-3 text-center">
                      {student.name} (ID: {student.id})
                    </div>

                    {/* Dual Scan Checklist */}
                    <div className="w-full space-y-2 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">1. Scan ID Card QR:</span>
                        <span className="font-bold text-emerald-600 flex items-center gap-1">
                          Verified <CheckCircle className="w-4 h-4 text-emerald-600 fill-emerald-50" />
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">2. Scan App QR:</span>
                        <span className="font-bold text-emerald-600 flex items-center gap-1">
                          Verified <CheckCircle className="w-4 h-4 text-emerald-600 fill-emerald-50" />
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 text-center mb-6 leading-relaxed">
                      Verification of QR codes successful at {activeSlot.room}. Proceed to Face Recognition.
                    </p>

                    {/* Animated Processing Spinner */}
                    <div className="flex flex-col items-center justify-center my-2">
                      <div className="relative w-12 h-12 flex items-center justify-center">
                        <div className="w-10 h-10 border-4 border-sky-100 border-t-[#0a4b9c] rounded-full animate-spin"></div>
                      </div>
                      <span className="text-[11px] font-bold tracking-widest text-slate-700 mt-2">
                        PROCESSING...
                      </span>
                    </div>
                  </div>
                </div>

                {/* Big Blue Action Button: PROCEED TO FACE SCAN */}
                <div className="w-full mt-auto pt-4">
                  <button
                    type="button"
                    onClick={handleProceedToFaceScan}
                    className="w-full py-3 px-4 bg-[#0a4b9c] hover:bg-[#083b7c] text-white rounded-xl text-[13px] font-extrabold tracking-wide flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
                  >
                    <Eye className="w-4 h-4" />
                    <span>PROCEED TO FACE SCAN</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SCREEN 3: FACE SCAN (Exact match to reference photo screen 3) */}
          {currentScreen === 'FACE_SCAN' && activeNavTab === 'scan' && (
            <div className="flex-1 flex flex-col justify-between overflow-hidden relative bg-black">
              {/* Header */}
              <div className="bg-[#0b5cbf] px-4 py-2 text-white flex items-center justify-between shadow-sm z-30">
                <h1 className="text-base font-bold tracking-tight">UniScan Attendance</h1>
                <span className="w-5" />
              </div>

              {/* Subheader */}
              <div className="bg-[#1976d2] px-3 py-1.5 text-center text-white text-[12px] font-medium tracking-wide z-30">
                Face Recognition ({activeSlot.courseCode})
              </div>

              {/* Camera Viewfinder Area */}
              <div className="relative flex-1 bg-slate-950 overflow-hidden flex items-center justify-center">
                {/* Live video feed if permitted, otherwise student reference photo */}
                {useRealWebcam ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={student.photoUrl}
                    alt={student.name}
                    className="absolute inset-0 w-full h-full object-cover filter brightness-90"
                  />
                )}

                {/* Cyan Biometric Face Mesh Overlay (Cyberpunk / High-tech AI look) */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
                  {/* Outer corner target brackets */}
                  <div className="relative w-56 h-72">
                    <div className="absolute top-0 left-0 w-7 h-7 border-t-3 border-l-3 border-cyan-400"></div>
                    <div className="absolute top-0 right-0 w-7 h-7 border-t-3 border-r-3 border-cyan-400"></div>
                    <div className="absolute bottom-0 left-0 w-7 h-7 border-b-3 border-l-3 border-cyan-400"></div>
                    <div className="absolute bottom-0 right-0 w-7 h-7 border-b-3 border-r-3 border-cyan-400"></div>

                    {/* Animated Scanning Bar */}
                    <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_12px_#22d3ee] animate-pulse top-1/2"></div>

                    {/* SVG Mesh Wireframe overlay */}
                    <svg className="absolute inset-0 w-full h-full text-cyan-400/70" viewBox="0 0 200 260">
                      {/* Face contour polygon */}
                      <polygon
                        points="100,25 135,45 160,85 165,130 150,185 125,225 100,240 75,225 50,185 35,130 40,85 65,45"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                      />
                      {/* Eye reticles */}
                      <circle cx="75" cy="105" r="14" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
                      <circle cx="75" cy="105" r="3" fill="#38bdf8" />
                      <circle cx="125" cy="105" r="14" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
                      <circle cx="125" cy="105" r="3" fill="#38bdf8" />

                      {/* Bridge & Nose */}
                      <line x1="100" y1="95" x2="100" y2="145" stroke="#38bdf8" strokeWidth="1.2" />
                      <line x1="90" y1="145" x2="110" y2="145" stroke="#38bdf8" strokeWidth="1.2" />

                      {/* Mouth landmark wireframe */}
                      <polygon
                        points="78,175 100,168 122,175 100,188"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="1.2"
                      />

                      {/* Inter-pupillary distance measurement line */}
                      <line x1="75" y1="105" x2="125" y2="105" stroke="#a5f3fc" strokeWidth="1" strokeDasharray="2 2" />

                      {/* Connecting triangulation network nodes */}
                      <line x1="75" y1="105" x2="100" y2="70" stroke="#06b6d4" strokeWidth="0.8" opacity="0.6" />
                      <line x1="125" y1="105" x2="100" y2="70" stroke="#06b6d4" strokeWidth="0.8" opacity="0.6" />
                      <line x1="75" y1="105" x2="100" y2="145" stroke="#06b6d4" strokeWidth="0.8" opacity="0.6" />
                      <line x1="125" y1="105" x2="100" y2="145" stroke="#06b6d4" strokeWidth="0.8" opacity="0.6" />
                      <line x1="100" y1="145" x2="100" y2="168" stroke="#06b6d4" strokeWidth="0.8" opacity="0.6" />
                      <line x1="78" y1="175" x2="100" y2="240" stroke="#06b6d4" strokeWidth="0.8" opacity="0.6" />
                      <line x1="122" y1="175" x2="100" y2="240" stroke="#06b6d4" strokeWidth="0.8" opacity="0.6" />
                    </svg>

                    {/* Centered Align Face Instructions */}
                    <div className="absolute -bottom-8 left-0 right-0 text-center">
                      <p className="text-[13px] font-bold text-white drop-shadow-md">
                        {faceScanSuccess ? 'Identity Verified!' : 'Verifying...'}
                      </p>
                      <p className="text-[11px] text-cyan-200 drop-shadow-sm">
                        {faceScanSuccess ? 'Attendance Marked Confirmed' : 'Align face in the circle'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Floating ID Card Thumbnail on Bottom Left (Exact match to reference photo screen 3) */}
                <div className="absolute bottom-16 left-3 z-20 flex items-center gap-2 bg-black/60 backdrop-blur-md p-1.5 rounded-lg border border-white/20 text-white shadow-lg">
                  <img
                    src={student.photoUrl}
                    alt={student.name}
                    className="w-10 h-11 object-cover rounded border border-white/40"
                  />
                  <div className="pr-1 text-left">
                    <p className="text-[11px] font-bold leading-tight">{student.name}</p>
                    <p className="text-[9.5px] text-slate-300 font-mono">({student.id})</p>
                  </div>
                </div>

                {/* Lower Facial Match Banner (Exact match to reference) */}
                <div className="absolute bottom-0 inset-x-0 bg-[#0a4b9c] text-white py-2 px-4 z-20 flex items-center justify-center gap-1.5 shadow-lg">
                  <span className="text-[13px] font-bold">
                    Facial Match: {faceMatchScore || 98}%
                  </span>
                  <CheckCircle className="w-4 h-4 text-emerald-400 fill-emerald-950" />
                </div>
              </div>

              {/* Bottom Subtext Banner */}
              <div className="bg-white py-2 text-center text-slate-800 text-[11px] font-semibold tracking-wide border-t border-slate-200 z-30">
                {faceScanSuccess ? (
                  <span className="text-emerald-600 font-bold flex items-center justify-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Attendance Confirmed at {activeSlot.room}!
                  </span>
                ) : (
                  'Verifying Identity... Please wait'
                )}
              </div>

              {/* Action when completed */}
              {faceScanSuccess && (
                <div className="p-3 bg-slate-50 border-t border-slate-200 z-30 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveNavTab('history')}
                    className="flex-1 py-1.5 bg-[#0a4b9c] text-white rounded text-xs font-bold text-center"
                  >
                    View Attendance Slip
                  </button>
                  <button
                    type="button"
                    onClick={handleResetWorkflow}
                    className="py-1.5 px-3 bg-slate-200 text-slate-700 rounded text-xs font-semibold"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB: HISTORY */}
          {activeNavTab === 'history' && (
            <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto">
              <div className="bg-[#0b5cbf] px-4 py-2.5 text-white flex items-center justify-between shadow-sm">
                <h1 className="text-base font-bold tracking-tight">Attendance History</h1>
                <button
                  type="button"
                  onClick={() => setActiveNavTab('scan')}
                  className="text-xs font-bold text-sky-200 hover:text-white"
                >
                  Close
                </button>
              </div>

              <div className="p-3 space-y-2.5">
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900">CS 301 - Data Structures</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      PRESENT
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 space-y-0.5">
                    <p>Classroom: Room 304 | Slot: 09:00 AM</p>
                    <p>Verified with: Dual-Scan QR + Face Biometrics</p>
                    <p className="font-mono text-[10px] text-slate-400">Timestamp: Today, 09:02:18 AM</p>
                  </div>
                </div>

                {attendanceRecords.map((rec) => (
                  <div key={rec.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">{rec.courseCode}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {rec.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 space-y-0.5">
                      <p>Room: {rec.room} | Match: {rec.facialMatchPercent}%</p>
                      <p className="font-mono text-[10px] text-slate-400">Time: {rec.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: PROFILE */}
          {activeNavTab === 'profile' && (
            <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto">
              <div className="bg-[#0b5cbf] px-4 py-2.5 text-white flex items-center justify-between shadow-sm">
                <h1 className="text-base font-bold tracking-tight">Student Profile</h1>
                <button
                  type="button"
                  onClick={() => setActiveNavTab('scan')}
                  className="text-xs font-bold text-sky-200 hover:text-white"
                >
                  Close
                </button>
              </div>

              <div className="p-4 flex flex-col items-center">
                <div className="w-20 h-20 rounded-full overflow-hidden border-3 border-blue-600 shadow-md mb-2">
                  <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
                </div>
                <h2 className="text-base font-bold text-slate-900">{student.name}</h2>
                <p className="text-xs text-slate-500 font-mono">ID: {student.id} | {student.rollNumber}</p>
                <div className="mt-4 w-full bg-white rounded-xl border border-slate-200 p-3 space-y-2 text-xs">
                  <div className="flex justify-between border-b pb-1.5 text-slate-700">
                    <span className="text-slate-500">Department</span>
                    <span className="font-semibold text-right">{student.department}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1.5 text-slate-700">
                    <span className="text-slate-500">Course</span>
                    <span className="font-semibold">{student.course}</span>
                  </div>
                  <div className="flex justify-between border-b pb-1.5 text-slate-700">
                    <span className="text-slate-500">Eyeprint Hash</span>
                    <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">
                      {student.eyeprintHash}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span className="text-slate-500">Physical ID Card</span>
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Issued
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: HOME */}
          {activeNavTab === 'home' && (
            <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto">
              <div className="bg-[#0b5cbf] px-4 py-2.5 text-white flex items-center justify-between shadow-sm">
                <h1 className="text-base font-bold tracking-tight">UniScan Home</h1>
                <span className="w-5" />
              </div>

              <div className="p-4 space-y-3">
                <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white p-4 rounded-xl shadow-sm">
                  <p className="text-xs text-blue-200">Welcome back,</p>
                  <h3 className="text-lg font-extrabold">{student.name}</h3>
                  <p className="text-xs mt-1 text-blue-100">
                    Next Period: <span className="font-bold">{activeSlot.courseCode} ({activeSlot.room})</span>
                  </p>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800">Attendance Status</span>
                    <span className="text-xs font-bold text-blue-600">9:00 AM Slot Active</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mb-3">
                    Your dynamic anti-screenshot QR code is active. Proceed to {activeSlot.room} and scan both your ID card and phone.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveNavTab('scan')}
                    className="w-full py-2 bg-[#0b5cbf] hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
                  >
                    Open Attendance QR Screen
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Navigation Bar (Exact match to reference photo: Home, Scan, History, Profile) */}
          <div className="h-14 bg-white border-t border-slate-200 px-4 flex items-center justify-around z-30">
            <button
              type="button"
              onClick={() => setActiveNavTab('home')}
              className={`flex flex-col items-center gap-0.5 ${
                activeNavTab === 'home' ? 'text-[#0b5cbf]' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-[10px] font-semibold">Home</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveNavTab('scan')}
              className={`flex flex-col items-center gap-0.5 ${
                activeNavTab === 'scan' ? 'text-[#0b5cbf]' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Scan className="w-5 h-5 stroke-[2.2]" />
              <span className="text-[10px] font-bold">Scan</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveNavTab('history')}
              className={`flex flex-col items-center gap-0.5 ${
                activeNavTab === 'history' ? 'text-[#0b5cbf]' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <History className="w-5 h-5" />
              <span className="text-[10px] font-semibold">History</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveNavTab('profile')}
              className={`flex flex-col items-center gap-0.5 ${
                activeNavTab === 'profile' ? 'text-[#0b5cbf]' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <User className="w-5 h-5" />
              <span className="text-[10px] font-semibold">Profile</span>
            </button>
          </div>

          {/* iOS Bottom Home Indicator Bar */}
          <div className="h-4 bg-white flex items-center justify-center pb-1">
            <div className="w-28 h-1 bg-slate-900 rounded-full" />
          </div>
        </div>
      </div>

      {/* Helper Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-600" /> Attendance Instructions
            </h3>
            <ol className="text-xs text-slate-600 space-y-2 list-decimal pl-4 mb-4">
              <li>Walk to classroom terminal outside <strong>{activeSlot.room}</strong>.</li>
              <li>Scan your physical ID card QR and this dynamic mobile screen QR on the terminal in any order within 5 seconds.</li>
              <li>Once verified on the terminal, your mobile phone unlocks the <strong>Face Recognition</strong> button.</li>
              <li>Align your face with the camera mesh to mark your attendance!</li>
            </ol>
            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-bold"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" /> App Settings
            </h3>
            <div className="space-y-3 text-xs text-slate-600 mb-4">
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <span>FLAG_SECURE Anti-Capture</span>
                <span className="text-emerald-600 font-bold">Enabled</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <span>NTP Server Time Sync</span>
                <span className="text-emerald-600 font-bold">Synced (0ms drift)</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <span>Biometric Hardware Check</span>
                <span className="text-emerald-600 font-bold">Operational</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSettingsModal(false)}
              className="w-full py-2 bg-slate-800 text-white rounded-lg text-xs font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
