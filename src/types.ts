export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  department: string;
  course: string;
  email: string;
  photoUrl: string;
  bloodGroup: string;
  validUntil: string;
  enrolledAt: string;
  eyeprintVector: number[];
  eyeprintHash: string;
  idCardQrPayload: string;
  idCardIssued: boolean;
}

export interface TimetableSlot {
  id: string;
  courseCode: string;
  courseName: string;
  room: string;
  instructor: string;
  startTime: string; // "09:00"
  endTime: string;   // "09:50"
  windowMinutes: number; // e.g. 10 minutes (9:00 - 9:10)
  dayOfWeek: string; // "Monday"
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  courseCode: string;
  room: string;
  timestamp: string;
  status: 'PRESENT' | 'LATE' | 'REJECTED';
  dualScanTimeDeltaMs: number;
  idScanTimestamp: string;
  appScanTimestamp: string;
  facialMatchPercent: number;
  ntpVerified: boolean;
  securityChecks: {
    antiScreenshot: boolean;
    rollingOtpValid: boolean;
    dualScanPaired: boolean;
    biometricEyeprintMatched: boolean;
    ntpClockTamperChecked: boolean;
  };
}

export interface MachineScanEvent {
  type: 'ID_CARD' | 'APP_QR';
  payload: string;
  studentId: string;
  timestamp: number;
  slotCode: string;
}

export interface DualScanMachineState {
  machineId: string;
  room: string;
  currentSlot: TimetableSlot;
  status: 'IDLE' | 'AWAITING_SECOND_SCAN' | 'VERIFYING' | 'SUCCESS' | 'FAILED';
  firstScan?: MachineScanEvent;
  secondScan?: MachineScanEvent;
  pairedStudent?: Student;
  secondsRemainingForPairing: number;
  lastVerifiedRecord?: AttendanceRecord;
  rejectionReason?: string;
}

export type MobileScreen = 'SCAN_QR' | 'VERIFYING' | 'FACE_SCAN' | 'SUCCESS' | 'HISTORY' | 'PROFILE';
