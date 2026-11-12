import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateEyeprintVector,
  generateIdCardPayload,
  parseIdCardPayload,
  generateDynamicAppQrPayload,
  parseDynamicAppQrPayload,
  verifyNtpDrift,
  verifyDualScanPairing,
  calculateFacialMatchConfidence,
  isWithinAttendanceWindow
} from './security';
import { TimetableSlot, MachineScanEvent } from '../types';

test('generateEyeprintVector creates deterministic 16-element vector and hash', () => {
  const eye1 = generateEyeprintVector('SARAH_CHEN_2110432');
  const eye2 = generateEyeprintVector('SARAH_CHEN_2110432');
  assert.equal(eye1.vector.length, 16);
  assert.equal(eye1.hash, eye2.hash);
  assert.deepEqual(eye1.vector, eye2.vector);
});

test('generateIdCardPayload and parseIdCardPayload validates genuine checksum and rejects tampering', () => {
  const student = {
    id: '2110432',
    rollNumber: 'CS-2024-0432',
    eyeprintHash: 'EYE-A89F12-SARA'
  };
  const payload = generateIdCardPayload(student);
  const parsed = parseIdCardPayload(payload);
  assert.equal(parsed.valid, true);
  assert.equal(parsed.studentId, '2110432');
  assert.equal(parsed.rollNumber, 'CS-2024-0432');

  // Tampered payload checksum should fail
  const tamperedPayload = payload.replace('2110432', '9999999');
  const tamperedParsed = parseIdCardPayload(tamperedPayload);
  assert.equal(tamperedParsed.valid, false);
});

test('generateDynamicAppQrPayload produces rolling OTP that verifies for current time step', () => {
  const fixedNow = 1730106000000; // Monday 9:00:00 AM UTC
  const appQr = generateDynamicAppQrPayload('2110432', 'CS 301', fixedNow, 30);
  assert.ok(appQr.rollingOtp.length === 6);

  const parsed = parseDynamicAppQrPayload(appQr.payload, fixedNow, 30);
  assert.equal(parsed.valid, true);
  assert.equal(parsed.studentId, '2110432');
  assert.equal(parsed.courseCode, 'CS 301');

  // Past timestamp (> 2 steps) should fail
  const oldParsed = parseDynamicAppQrPayload(appQr.payload, fixedNow + 90000, 30);
  assert.equal(oldParsed.valid, false);
});

test('verifyNtpDrift detects device clock tampering', () => {
  const serverTime = 1730106000000;
  // 50ms normal network drift: OK
  const normalCheck = verifyNtpDrift(serverTime + 50, serverTime);
  assert.equal(normalCheck.synced, true);

  // 10 minutes manual clock forward (600,000ms): Detected!
  const hackedCheck = verifyNtpDrift(serverTime + 600000, serverTime);
  assert.equal(hackedCheck.synced, false);
  assert.ok(hackedCheck.message.includes('Anti-Clock-Hack'));
});

test('verifyDualScanPairing accepts any-order scans within 5s window for same student', () => {
  const now = 1730106010000;
  const student = {
    id: '2110432',
    rollNumber: 'CS-2024-0432',
    eyeprintHash: 'EYE-A89F12-SARA'
  };
  const cardPayload = generateIdCardPayload(student);
  const appPayload = generateDynamicAppQrPayload('2110432', 'CS 301', now).payload;

  const cardScan: MachineScanEvent = {
    type: 'ID_CARD',
    payload: cardPayload,
    studentId: '2110432',
    timestamp: now,
    slotCode: 'CS 301'
  };

  const appScan: MachineScanEvent = {
    type: 'APP_QR',
    payload: appPayload,
    studentId: '2110432',
    timestamp: now + 2500, // 2.5 seconds later: within 5s window
    slotCode: 'CS 301'
  };

  // Order A: Card first, then Phone
  const resOrderA = verifyDualScanPairing(cardScan, appScan, 'CS 301', now);
  assert.equal(resOrderA.success, true);
  assert.equal(resOrderA.studentId, '2110432');

  // Order B: Phone first, then Card (Any-order test)
  const resOrderB = verifyDualScanPairing(appScan, cardScan, 'CS 301', now);
  assert.equal(resOrderB.success, true);
  assert.equal(resOrderB.studentId, '2110432');

  // Timeout test: > 5s apart (appScan is at now + 2500, slowCardScan is at now + 9000 -> delta = 6500ms)
  const slowCardScan: MachineScanEvent = { ...cardScan, timestamp: now + 9000 };
  const resTimeout = verifyDualScanPairing(appScan, slowCardScan, 'CS 301', now);
  assert.equal(resTimeout.success, false);
  assert.ok(resTimeout.error?.includes('timeout'));

  // Proxy test: Different student ID
  const fakeCardPayload = generateIdCardPayload({
    id: '9998888',
    rollNumber: 'CS-2024-9999',
    eyeprintHash: 'EYE-DIFF-XXXX'
  });
  const fakeCardScan: MachineScanEvent = {
    type: 'ID_CARD',
    payload: fakeCardPayload,
    studentId: '9998888',
    timestamp: now + 1000,
    slotCode: 'CS 301'
  };
  const resProxy = verifyDualScanPairing(fakeCardScan, appScan, 'CS 301', now);
  assert.equal(resProxy.success, false);
  assert.ok(resProxy.error?.includes('Proxy'));
});

test('calculateFacialMatchConfidence evaluates matching biometric vectors', () => {
  const enrolled = [0.8, 0.45, 0.9, 0.3, 0.12, 0.77];
  const detected = [0.81, 0.44, 0.89, 0.31, 0.13, 0.76]; // slight camera noise
  const result = calculateFacialMatchConfidence(enrolled, detected);
  assert.equal(result.passed, true);
  assert.ok(result.matchPercent >= 95);
});

test('isWithinAttendanceWindow enforces 10-minute slot cutoff', () => {
  const slot: TimetableSlot = {
    id: 'slot-1',
    courseCode: 'CS 301',
    courseName: 'Data Structures',
    instructor: 'Dr. Robert Miller',
    room: 'Room 304',
    startTime: '09:00',
    endTime: '09:50',
    windowMinutes: 10,
    dayOfWeek: 'Monday'
  };

  // Exactly 9:02 AM -> open with ~8 mins remaining
  const dateDuring = new Date('2026-10-28T09:02:00');
  const resDuring = isWithinAttendanceWindow(dateDuring, slot);
  assert.equal(resDuring.isOpen, true);
  assert.ok(resDuring.secondsRemaining > 0);

  // 9:15 AM -> closed (late cutoff passed)
  const dateLate = new Date('2026-10-28T09:15:00');
  const resLate = isWithinAttendanceWindow(dateLate, slot);
  assert.equal(resLate.isOpen, false);
  assert.ok(resLate.reason?.includes('closed'));
});
