/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Layers,
  Award,
  ShieldCheck,
  FileSpreadsheet,
  Clock,
  Sparkles,
  Columns,
  Eye,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Radio,
  ExternalLink
} from 'lucide-react';
import { Student, TimetableSlot, AttendanceRecord } from './types';
import { INITIAL_STUDENTS, TIMETABLE_SLOTS, INITIAL_ATTENDANCE_RECORDS } from './data/mockData';
import { StudentMobileApp } from './components/StudentMobileApp';
import { ClassroomTerminal } from './components/ClassroomTerminal';
import { FacultyEnrollment } from './components/FacultyEnrollment';
import { AntiCheatInspector } from './components/AntiCheatInspector';
import { AttendanceLedger } from './components/AttendanceLedger';

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'student_app' | 'terminal' | 'split_live' | 'showcase_3screens' | 'faculty' | 'anticheat' | 'ledger'
  >('split_live');

  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [activeStudent, setActiveStudent] = useState<Student>(INITIAL_STUDENTS[0]); // Sarah Chen
  const [activeSlot, setActiveSlot] = useState<TimetableSlot>(TIMETABLE_SLOTS[0]); // CS 301
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(INITIAL_ATTENDANCE_RECORDS);

  // Synchronized Server NTP Time (default set to 09:02:15 AM on Monday matching 9:00 AM slot)
  const [serverTime, setServerTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(9, 2, 15, 0);
    return d;
  });

  const [deviceClockOffsetMs, setDeviceClockOffsetMs] = useState<number>(0);
  const [isMachineVerified, setIsMachineVerified] = useState<boolean>(false);
  const [showQuickGuide, setShowQuickGuide] = useState<boolean>(false);

  // Live ticking NTP server clock
  useEffect(() => {
    const timer = setInterval(() => {
      setServerTime((prev) => new Date(prev.getTime() + 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAttendanceMarked = (newRecord: AttendanceRecord) => {
    setAttendanceRecords((prev) => [newRecord, ...prev]);
  };

  const handleMachineVerifySuccess = (verifiedStudent: Student) => {
    setIsMachineVerified(true);
    setActiveStudent(verifiedStudent);
  };

  const handleStudentEnrolled = (newStudent: Student) => {
    setStudents((prev) => [newStudent, ...prev]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Enterprise Navigation Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-900/40 font-black text-lg">
              <Eye className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                  UniScan Attendance
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950 border border-blue-700/80 text-sky-400">
                  ANTI-CHEAT V3.4
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Dual-Factor QR + Eyeprint Face Recognition College Attendance System
              </p>
            </div>
          </div>

          {/* Real-time Status Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            {/* NTP Server Time Indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>NTP Time:</span>
              <strong className="text-white">
                {serverTime.toLocaleTimeString('en-US', { hour12: true })}
              </strong>
            </div>

            {/* Active Class Window */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-950/70 border border-blue-900/80 text-sky-300">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>Active Slot:</span>
              <strong className="text-white">{activeSlot.courseCode} ({activeSlot.room})</strong>
            </div>

            {/* Quick Guide Trigger */}
            <button
              type="button"
              onClick={() => setShowQuickGuide(!showQuickGuide)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
              title="How this system works"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* System Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="flex space-x-1 overflow-x-auto py-1 scrollbar-none text-xs font-bold border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setActiveTab('split_live')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'split_live'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Columns className="w-4 h-4 text-sky-300" />
              <span>Interactive Dual-Scan Simulator (Recommended)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('showcase_3screens')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'showcase_3screens'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-4 h-4 text-sky-300" />
              <span>3-Screen App Showcase (Photo Match)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('student_app')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'student_app'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Smartphone className="w-4 h-4 text-sky-300" />
              <span>Student Mobile Phone</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('terminal')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'terminal'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-sky-300" />
              <span>Classroom Machine #304</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('faculty')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'faculty'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Award className="w-4 h-4 text-sky-300" />
              <span>STEP 1: Faculty Enrollment</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('anticheat')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'anticheat'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Clock className="w-4 h-4 text-sky-300" />
              <span>Anti-Cheat Lab & Clock Sync</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'ledger'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-sky-300" />
              <span>Attendance Ledger ({attendanceRecords.length})</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Quick Architecture Guide Drawer */}
      {showQuickGuide && (
        <div className="bg-blue-950/90 border-b border-blue-900 p-4 text-xs text-blue-200 animate-fade-in">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/80 p-3 rounded-xl border border-blue-800">
              <h4 className="font-bold text-white mb-1">Step 1: College Faculty Enrollment</h4>
              <p className="text-[11px] text-slate-300">
                Student's facial eyeprint vector is enrolled by college faculty and compiled into a cryptographic QR attached to their physical university ID card badge.
              </p>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-blue-800">
              <h4 className="font-bold text-white mb-1">Step 2: 9:00 AM Dual-Scan at Door</h4>
              <p className="text-[11px] text-slate-300">
                At 9:00 AM, the app auto-triggers the dynamic anti-screenshot QR. Classroom machine pairs physical card QR + phone QR in any order within 5s.
              </p>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-blue-800">
              <h4 className="font-bold text-white mb-1">Step 3: Face Recognition Unlocks</h4>
              <p className="text-[11px] text-slate-300">
                Only after machine verification passes does the phone enable the Face Recognition button to mark attendance with 98% biometric match!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {/* VIEW 1: INTERACTIVE SPLIT-SCREEN SIMULATOR */}
        {activeTab === 'split_live' && (
          <div className="space-y-6">
            {/* Context Notice */}
            <div className="bg-gradient-to-r from-blue-900/40 via-indigo-950/40 to-slate-900/40 border border-blue-800/60 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500 text-sky-300 flex items-center justify-center font-bold">
                  ⚡
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">
                    Live Dual-Scan Interaction Lab
                  </h3>
                  <p className="text-slate-300 text-[11px]">
                    Use the Classroom Terminal on the right to scan Sarah Chen's ID Card and Phone QR. Watch the Phone on the left immediately unlock Face Recognition!
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMachineVerified(true)}
                  className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] flex items-center gap-1.5 shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Instant Unlock Face Scan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsMachineVerified(false)}
                  className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold text-[11px]"
                >
                  Reset Lock
                </button>
              </div>
            </div>

            {/* Side-by-Side: Student Mobile App + Classroom Machine */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Student Mobile Phone */}
              <div className="lg:col-span-5 flex flex-col items-center">
                <div className="mb-2 text-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                    Student Mobile Device (Sarah Chen)
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Protected by FLAG_SECURE & 30s Dynamic Rolling OTP
                  </p>
                </div>

                <StudentMobileApp
                  student={activeStudent}
                  activeSlot={activeSlot}
                  serverTime={serverTime}
                  onAttendanceMarked={handleAttendanceMarked}
                  isMachineVerified={isMachineVerified}
                  attendanceRecords={attendanceRecords}
                />
              </div>

              {/* Right Column: Classroom Terminal #304 */}
              <div className="lg:col-span-7 flex flex-col">
                <div className="mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Classroom Door Dual-Scan Terminal (Room 304)
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Hardware Scanner: Validates ID Card + Phone QR within 5-second pairing window
                  </p>
                </div>

                <ClassroomTerminal
                  currentSlot={activeSlot}
                  serverTime={serverTime}
                  activeStudent={activeStudent}
                  allStudents={students}
                  onMachineVerifySuccess={handleMachineVerifySuccess}
                />
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: 3-SCREEN APP SHOWCASE (MATCHING USER REFERENCE PHOTO EXACTLY) */}
        {activeTab === 'showcase_3screens' && (
          <div className="space-y-6">
            <div className="text-center max-w-2xl mx-auto space-y-1">
              <span className="text-xs font-bold text-sky-400 uppercase tracking-widest">
                Pixel-Perfect Mobile UI Reconstruction
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                UniScan Attendance: 3-Stage Verification Workflow
              </h2>
              <p className="text-xs text-slate-400">
                Faithful implementation of the reference architecture: 1) Dynamic 9:00 AM Scan QR, 2) Classroom Verification in Progress, and 3) Ocular Face Scan with Biometric Mesh.
              </p>
            </div>

            {/* Collegiate Table Surface with the 3 Phones */}
            <div className="relative p-6 sm:p-10 rounded-3xl bg-gradient-to-b from-[#2d241e] via-[#1f1915] to-[#120f0d] border border-amber-950/40 shadow-2xl overflow-x-auto">
              {/* Subtle table reflections */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-600/10 via-transparent to-transparent pointer-events-none"></div>

              <div className="relative min-w-[1100px] flex items-center justify-center gap-8">
                {/* Screen 1: Scan QR */}
                <div className="flex flex-col items-center">
                  <span className="text-sm font-bold text-amber-200/90 mb-3 uppercase tracking-wider">
                    Scan QR
                  </span>
                  <StudentMobileApp
                    student={activeStudent}
                    activeSlot={activeSlot}
                    serverTime={serverTime}
                    onAttendanceMarked={handleAttendanceMarked}
                    isMachineVerified={false}
                    attendanceRecords={attendanceRecords}
                    initialScreen="SCAN_QR"
                  />
                </div>

                {/* Screen 2: Verifying */}
                <div className="flex flex-col items-center">
                  <span className="text-sm font-bold text-amber-200/90 mb-3 uppercase tracking-wider">
                    Verifying
                  </span>
                  <StudentMobileApp
                    student={activeStudent}
                    activeSlot={activeSlot}
                    serverTime={serverTime}
                    onAttendanceMarked={handleAttendanceMarked}
                    isMachineVerified={true}
                    attendanceRecords={attendanceRecords}
                    initialScreen="VERIFYING"
                  />
                </div>

                {/* Screen 3: Face Scan */}
                <div className="flex flex-col items-center">
                  <span className="text-sm font-bold text-amber-200/90 mb-3 uppercase tracking-wider">
                    Face Scan
                  </span>
                  <StudentMobileApp
                    student={activeStudent}
                    activeSlot={activeSlot}
                    serverTime={serverTime}
                    onAttendanceMarked={handleAttendanceMarked}
                    isMachineVerified={true}
                    attendanceRecords={attendanceRecords}
                    initialScreen="FACE_SCAN"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: STUDENT MOBILE APP DEDICATED */}
        {activeTab === 'student_app' && (
          <div className="flex flex-col items-center justify-center py-4">
            <div className="mb-4 text-center">
              <h2 className="text-lg font-bold text-white">Student Mobile Application</h2>
              <p className="text-xs text-slate-400">
                Interactive standalone mobile screen. Toggle tabs at the bottom to explore History & Profile.
              </p>
            </div>
            <StudentMobileApp
              student={activeStudent}
              activeSlot={activeSlot}
              serverTime={serverTime}
              onAttendanceMarked={handleAttendanceMarked}
              isMachineVerified={isMachineVerified}
              attendanceRecords={attendanceRecords}
            />
          </div>
        )}

        {/* VIEW 4: CLASSROOM TERMINAL DEDICATED */}
        {activeTab === 'terminal' && (
          <div className="max-w-4xl mx-auto py-2">
            <ClassroomTerminal
              currentSlot={activeSlot}
              serverTime={serverTime}
              activeStudent={activeStudent}
              allStudents={students}
              onMachineVerifySuccess={handleMachineVerifySuccess}
            />
          </div>
        )}

        {/* VIEW 5: STEP 1 - FACULTY ENROLLMENT */}
        {activeTab === 'faculty' && (
          <FacultyEnrollment
            onStudentEnrolled={handleStudentEnrolled}
            enrolledStudents={students}
            onSelectActiveStudent={setActiveStudent}
            activeStudentId={activeStudent.id}
          />
        )}

        {/* VIEW 6: ANTI-CHEAT LAB */}
        {activeTab === 'anticheat' && (
          <AntiCheatInspector
            serverTime={serverTime}
            onUpdateServerTime={setServerTime}
            deviceClockOffsetMs={deviceClockOffsetMs}
            onUpdateDeviceOffset={setDeviceClockOffsetMs}
            activeSlot={activeSlot}
            onSelectSlot={setActiveSlot}
            allSlots={TIMETABLE_SLOTS}
          />
        )}

        {/* VIEW 7: ATTENDANCE LEDGER */}
        {activeTab === 'ledger' && (
          <AttendanceLedger records={attendanceRecords} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-4 px-6 text-center text-xs text-slate-500">
        <p>
          UniScan Attendance &bull; Metropolitan University of Technology &bull; Ocular Biometric Anti-Proxy Attendance Protocol
        </p>
      </footer>
    </div>
  );
}
