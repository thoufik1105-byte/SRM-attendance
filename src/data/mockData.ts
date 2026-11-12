import { Student, TimetableSlot, AttendanceRecord } from '../types';
import { generateEyeprintVector, generateIdCardPayload } from '../utils/security';

const sarahEyeprint = generateEyeprintVector('SARAH_CHEN_2110432');
const marcusEyeprint = generateEyeprintVector('MARCUS_VANCE_2110488');
const aishaEyeprint = generateEyeprintVector('AISHA_PATEL_2110512');
const davidEyeprint = generateEyeprintVector('DAVID_KIM_2110603');

export const INITIAL_STUDENTS: Student[] = [
  {
    id: '2110432',
    name: 'Sarah Chen',
    rollNumber: 'CS-2024-0432',
    department: 'Computer Science & Engineering',
    course: 'B.Tech Computer Science',
    email: 'sarah.chen@university.edu',
    // Realistic university student portrait matching the reference image
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    bloodGroup: 'O+',
    validUntil: 'Jun 2028',
    enrolledAt: '2024-08-15',
    eyeprintVector: sarahEyeprint.vector,
    eyeprintHash: sarahEyeprint.hash,
    idCardQrPayload: '',
    idCardIssued: true
  },
  {
    id: '2110488',
    name: 'Marcus Vance',
    rollNumber: 'EE-2024-0488',
    department: 'Electrical & Electronics',
    course: 'B.Tech Electrical Engineering',
    email: 'marcus.v@university.edu',
    photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80',
    bloodGroup: 'A+',
    validUntil: 'Jun 2028',
    enrolledAt: '2024-08-15',
    eyeprintVector: marcusEyeprint.vector,
    eyeprintHash: marcusEyeprint.hash,
    idCardQrPayload: '',
    idCardIssued: true
  },
  {
    id: '2110512',
    name: 'Aisha Patel',
    rollNumber: 'AI-2024-0512',
    department: 'Artificial Intelligence & Data Science',
    course: 'B.Tech AI & Data Science',
    email: 'aisha.p@university.edu',
    photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    bloodGroup: 'B+',
    validUntil: 'Jun 2028',
    enrolledAt: '2024-08-16',
    eyeprintVector: aishaEyeprint.vector,
    eyeprintHash: aishaEyeprint.hash,
    idCardQrPayload: '',
    idCardIssued: true
  },
  {
    id: '2110603',
    name: 'David Kim',
    rollNumber: 'CS-2024-0603',
    department: 'Computer Science & Engineering',
    course: 'B.Tech Computer Science',
    email: 'david.kim@university.edu',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    bloodGroup: 'AB+',
    validUntil: 'Jun 2028',
    enrolledAt: '2024-08-16',
    eyeprintVector: davidEyeprint.vector,
    eyeprintHash: davidEyeprint.hash,
    idCardQrPayload: '',
    idCardIssued: true
  }
].map(student => ({
  ...student,
  idCardQrPayload: generateIdCardPayload(student)
}));

export const TIMETABLE_SLOTS: TimetableSlot[] = [
  {
    id: 'slot-1',
    courseCode: 'CS 301',
    courseName: 'Data Structures & Algorithms',
    room: 'Room 304',
    instructor: 'Dr. Robert Miller',
    startTime: '09:00',
    endTime: '09:50',
    windowMinutes: 10,
    dayOfWeek: 'Monday'
  },
  {
    id: 'slot-2',
    courseCode: 'EE 204',
    courseName: 'Digital Logic Circuits',
    room: 'Room 201',
    instructor: 'Prof. Eleanor Wright',
    startTime: '10:00',
    endTime: '10:50',
    windowMinutes: 10,
    dayOfWeek: 'Monday'
  },
  {
    id: 'slot-3',
    courseCode: 'AI 402',
    courseName: 'Computer Vision & Biometrics',
    room: 'Lab 4',
    instructor: 'Dr. Alan Zhou',
    startTime: '11:15',
    endTime: '12:05',
    windowMinutes: 10,
    dayOfWeek: 'Monday'
  }
];

export const INITIAL_ATTENDANCE_RECORDS: AttendanceRecord[] = [
  {
    id: 'att-101',
    studentId: '2110488',
    studentName: 'Marcus Vance',
    rollNumber: 'EE-2024-0488',
    courseCode: 'CS 301',
    room: 'Room 304',
    timestamp: '2026-10-28 09:02:18',
    status: 'PRESENT',
    dualScanTimeDeltaMs: 1420,
    idScanTimestamp: '09:02:16',
    appScanTimestamp: '09:02:18',
    facialMatchPercent: 97.8,
    ntpVerified: true,
    securityChecks: {
      antiScreenshot: true,
      rollingOtpValid: true,
      dualScanPaired: true,
      biometricEyeprintMatched: true,
      ntpClockTamperChecked: true
    }
  },
  {
    id: 'att-102',
    studentId: '2110512',
    studentName: 'Aisha Patel',
    rollNumber: 'AI-2024-0512',
    courseCode: 'CS 301',
    room: 'Room 304',
    timestamp: '2026-10-28 09:04:45',
    status: 'PRESENT',
    dualScanTimeDeltaMs: 2150,
    idScanTimestamp: '09:04:43',
    appScanTimestamp: '09:04:45',
    facialMatchPercent: 98.6,
    ntpVerified: true,
    securityChecks: {
      antiScreenshot: true,
      rollingOtpValid: true,
      dualScanPaired: true,
      biometricEyeprintMatched: true,
      ntpClockTamperChecked: true
    }
  }
];
