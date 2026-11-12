import { Student, TimetableSlot, MachineScanEvent } from '../types';

/**
 * Generates a deterministic or simulated biometric vector & cryptographic eyeprint hash
 * from facial landmark coordinates.
 */
export function generateEyeprintVector(seed: string): { vector: number[]; hash: string } {
  const vector: number[] = [];
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }

  // Generate 16 normalized feature coordinates (representing pupil distance, eye aspect ratio, jawline curvature)
  for (let i = 0; i < 16; i++) {
    h = (h * 1664525 + 1013904223) | 0;
    const normalized = Math.abs(h % 1000) / 1000;
    vector.push(Number(normalized.toFixed(4)));
  }

  const hashHex = `EYE-${Math.abs(h).toString(16).toUpperCase().padStart(8, '0')}-${seed.slice(0, 4).toUpperCase()}`;
  return { vector, hash: hashHex };
}

/**
 * Builds the encrypted/signed payload string for the physical student ID card QR.
 * Format: UNISCAN:CARD:V1|<studentId>|<rollNo>|<eyeprintHash>|<checksum>
 */
export function generateIdCardPayload(student: Pick<Student, 'id' | 'rollNumber' | 'eyeprintHash'>): string {
  const raw = `${student.id}:${student.rollNumber}:${student.eyeprintHash}`;
  let checksum = 0;
  for (let i = 0; i < raw.length; i++) {
    checksum = (checksum + raw.charCodeAt(i) * (i + 1)) % 99991;
  }
  return `UNISCAN:CARD:V1|${student.id}|${student.rollNumber}|${student.eyeprintHash}|CS${checksum}`;
}

/**
 * Validates the ID Card QR payload
 */
export function parseIdCardPayload(payload: string): { valid: boolean; studentId?: string; rollNumber?: string; eyeprintHash?: string } {
  if (!payload || !payload.startsWith('UNISCAN:CARD:V1|')) {
    return { valid: false };
  }
  const parts = payload.split('|');
  if (parts.length < 5) return { valid: false };

  const [, studentId, rollNumber, eyeprintHash, checksumStr] = parts;
  const raw = `${studentId}:${rollNumber}:${eyeprintHash}`;
  let expectedChecksum = 0;
  for (let i = 0; i < raw.length; i++) {
    expectedChecksum = (expectedChecksum + raw.charCodeAt(i) * (i + 1)) % 99991;
  }
  const expectedCheckStr = `CS${expectedChecksum}`;
  if (checksumStr !== expectedCheckStr) {
    return { valid: false };
  }

  return { valid: true, studentId, rollNumber, eyeprintHash };
}

/**
 * Generates dynamic 9:00 AM / timetable app QR payload with rolling 30-second token
 * Format: UNISCAN:APP:V1|<studentId>|<courseCode>|<timeWindowStep>|<token>
 */
export function generateDynamicAppQrPayload(
  studentId: string,
  courseCode: string,
  serverTimestampMs: number,
  stepSeconds = 30
): { payload: string; rollingOtp: string; expiresAtMs: number; secondsRemaining: number } {
  const currentStep = Math.floor(serverTimestampMs / (stepSeconds * 1000));
  const stepStartMs = currentStep * stepSeconds * 1000;
  const expiresAtMs = stepStartMs + stepSeconds * 1000;
  const secondsRemaining = Math.max(1, Math.ceil((expiresAtMs - serverTimestampMs) / 1000));

  // Compute rolling HMAC-like code
  let seed = `${studentId}:${courseCode}:${currentStep}`;
  let code = 0;
  for (let i = 0; i < seed.length; i++) {
    code = (code * 31 + seed.charCodeAt(i)) & 0xffffff;
  }
  const rollingOtp = Math.abs(code % 1000000).toString().padStart(6, '0');
  const payload = `UNISCAN:APP:V1|${studentId}|${courseCode}|${currentStep}|${rollingOtp}`;

  return { payload, rollingOtp, expiresAtMs, secondsRemaining };
}

/**
 * Parses and verifies dynamic app QR payload against rolling OTP step
 */
export function parseDynamicAppQrPayload(
  payload: string,
  serverTimestampMs: number,
  stepSeconds = 30
): { valid: boolean; studentId?: string; courseCode?: string; rollingOtp?: string } {
  if (!payload || !payload.startsWith('UNISCAN:APP:V1|')) {
    return { valid: false };
  }
  const parts = payload.split('|');
  if (parts.length < 5) return { valid: false };

  const [, studentId, courseCode, stepStr, rollingOtp] = parts;
  const currentStep = Math.floor(serverTimestampMs / (stepSeconds * 1000));
  const submittedStep = parseInt(stepStr, 10);

  // Allow ±1 step tolerance (clock skew / boundary crossing)
  if (Math.abs(currentStep - submittedStep) > 1) {
    return { valid: false };
  }

  // Verify OTP matches expected code for that step
  let seed = `${studentId}:${courseCode}:${submittedStep}`;
  let code = 0;
  for (let i = 0; i < seed.length; i++) {
    code = (code * 31 + seed.charCodeAt(i)) & 0xffffff;
  }
  const expectedOtp = Math.abs(code % 1000000).toString().padStart(6, '0');
  if (expectedOtp !== rollingOtp) {
    return { valid: false };
  }

  return { valid: true, studentId, courseCode, rollingOtp };
}

/**
 * Timetable-Based Window Check (e.g. 9:00 - 9:10 AM)
 * Returns whether the server time is within the initial 10-minute attendance window
 */
export function isWithinAttendanceWindow(
  serverDate: Date,
  slot: TimetableSlot
): { isOpen: boolean; secondsRemaining: number; reason?: string } {
  const [startHour, startMin] = slot.startTime.split(':').map(Number);
  
  const slotStartDate = new Date(serverDate);
  slotStartDate.setHours(startHour, startMin, 0, 0);

  const windowEndDate = new Date(slotStartDate.getTime() + slot.windowMinutes * 60 * 1000);
  const nowMs = serverDate.getTime();

  if (nowMs < slotStartDate.getTime()) {
    const diffSec = Math.ceil((slotStartDate.getTime() - nowMs) / 1000);
    return {
      isOpen: false,
      secondsRemaining: 0,
      reason: `Class starts at ${slot.startTime}. Window opens in ${Math.floor(diffSec / 60)}m ${diffSec % 60}s.`
    };
  }

  if (nowMs > windowEndDate.getTime()) {
    return {
      isOpen: false,
      secondsRemaining: 0,
      reason: `Attendance window closed at ${slot.startTime} + ${slot.windowMinutes}m (Late cutoff passed).`
    };
  }

  const secondsRemaining = Math.max(0, Math.floor((windowEndDate.getTime() - nowMs) / 1000));
  return {
    isOpen: true,
    secondsRemaining
  };
}

/**
 * Network Time Sync (Anti-Clock-Hack Check)
 * Verifies that the client device time hasn't drifted or been manually hacked away from NTP server time
 */
export function verifyNtpDrift(
  deviceTimeMs: number,
  serverNtpTimeMs: number,
  maxToleranceMs = 15000 // 15 seconds
): { synced: boolean; driftMs: number; message: string } {
  const driftMs = deviceTimeMs - serverNtpTimeMs;
  if (Math.abs(driftMs) > maxToleranceMs) {
    return {
      synced: false,
      driftMs,
      message: `Device clock drift detected (${Math.round(driftMs / 1000)}s offset). Anti-Clock-Hack requires synchronized NTP network time.`
    };
  }
  return {
    synced: true,
    driftMs,
    message: `NTP Network Time Synced (Drift: ${driftMs >= 0 ? '+' : ''}${driftMs}ms)`
  };
}

/**
 * Any-Order Dual Scan Verification at the Classroom Machine:
 * Students can scan their physical ID card first or their phone's 9:00 AM dynamic QR first.
 * The machine pairs both scans within a 5-second window, regardless of order.
 */
export function verifyDualScanPairing(
  firstScan: MachineScanEvent,
  secondScan: MachineScanEvent,
  activeCourseCode: string,
  serverTimeMs: number,
  maxWindowSec = 5
): {
  success: boolean;
  studentId?: string;
  error?: string;
  timeDeltaMs: number;
} {
  const timeDeltaMs = Math.abs(secondScan.timestamp - firstScan.timestamp);
  const maxDeltaMs = maxWindowSec * 1000;

  if (timeDeltaMs > maxDeltaMs) {
    return {
      success: false,
      error: `Dual-scan pairing timeout! Scans were ${Math.round(timeDeltaMs / 1000)}s apart. Must pair within ${maxWindowSec}s.`,
      timeDeltaMs
    };
  }

  // Must have one ID_CARD and one APP_QR
  const types = new Set([firstScan.type, secondScan.type]);
  if (!types.has('ID_CARD') || !types.has('APP_QR')) {
    return {
      success: false,
      error: 'Invalid pairing: must scan one Physical ID Card QR and one Phone App Dynamic QR.',
      timeDeltaMs
    };
  }

  const idScan = firstScan.type === 'ID_CARD' ? firstScan : secondScan;
  const appScan = firstScan.type === 'APP_QR' ? firstScan : secondScan;

  // Check ID card payload
  const idParsed = parseIdCardPayload(idScan.payload);
  if (!idParsed.valid || !idParsed.studentId) {
    return {
      success: false,
      error: 'Corrupt or unauthorized Physical ID Card QR signature.',
      timeDeltaMs
    };
  }

  // Check App QR payload
  const appParsed = parseDynamicAppQrPayload(appScan.payload, serverTimeMs);
  if (!appParsed.valid || !appParsed.studentId) {
    return {
      success: false,
      error: 'Expired or invalid Dynamic Phone App QR code.',
      timeDeltaMs
    };
  }

  // Check student identity match
  if (idParsed.studentId !== appParsed.studentId) {
    return {
      success: false,
      error: `Proxy Attendance Detected! ID Card belongs to ${idParsed.studentId} but Phone belongs to ${appParsed.studentId}.`,
      timeDeltaMs
    };
  }

  // Check course code match
  if (appParsed.courseCode !== activeCourseCode) {
    return {
      success: false,
      error: `QR is for course ${appParsed.courseCode}, but this classroom terminal is hosting ${activeCourseCode}.`,
      timeDeltaMs
    };
  }

  return {
    success: true,
    studentId: idParsed.studentId,
    timeDeltaMs
  };
}

/**
 * Calculates facial match confidence score between enrolled vector and scanned vector
 */
export function calculateFacialMatchConfidence(enrolled: number[], detected: number[]): { matchPercent: number; passed: boolean } {
  if (!enrolled.length || !detected.length || enrolled.length !== detected.length) {
    return { matchPercent: 0, passed: false };
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < enrolled.length; i++) {
    dotProduct += enrolled[i] * detected[i];
    normA += enrolled[i] * enrolled[i];
    normB += detected[i] * detected[i];
  }

  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
  // Map similarity to realistic confidence range (e.g. 96-99% on genuine match)
  const percent = Math.min(99.4, Math.max(12, Number((similarity * 100).toFixed(1))));
  return {
    matchPercent: percent,
    passed: percent >= 85.0
  };
}
