import React, { useState, useRef } from 'react';
import {
  UserPlus,
  Eye,
  Camera,
  QrCode,
  CreditCard,
  CheckCircle,
  Printer,
  Sparkles,
  Download,
  RotateCw,
  Award,
  Shield,
  Layers,
  ChevronRight
} from 'lucide-react';
import { Student } from '../types';
import { QRCodeCanvas } from './QRCodeCanvas';
import { generateEyeprintVector, generateIdCardPayload } from '../utils/security';

interface FacultyEnrollmentProps {
  onStudentEnrolled: (student: Student) => void;
  enrolledStudents: Student[];
  onSelectActiveStudent: (student: Student) => void;
  activeStudentId: string;
}

export const FacultyEnrollment: React.FC<FacultyEnrollmentProps> = ({
  onStudentEnrolled,
  enrolledStudents,
  onSelectActiveStudent,
  activeStudentId
}) => {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [formData, setFormData] = useState({
    name: 'Elena Rostova',
    rollNumber: 'CS-2024-0749',
    department: 'Computer Science & Engineering',
    course: 'B.Tech Computer Science',
    email: 'elena.r@university.edu',
    bloodGroup: 'B+',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80'
  });

  const [eyeprintEnrolled, setEyeprintEnrolled] = useState(false);
  const [eyeprintVector, setEyeprintVector] = useState<number[]>([]);
  const [eyeprintHash, setEyeprintHash] = useState('');
  const [cardFlipped, setCardFlipped] = useState(false);
  const [useLiveCam, setUseLiveCam] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Trigger Eyeprint biometric extraction
  const handleEnrollEyeprint = async () => {
    const seed = `${formData.name}_${formData.rollNumber}`;
    const result = generateEyeprintVector(seed);
    setEyeprintVector(result.vector);
    setEyeprintHash(result.hash);
    setEyeprintEnrolled(true);
    setActiveStep(3);
  };

  const handleStartLiveCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } }
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setUseLiveCam(true);
    } catch {
      alert('Camera access denied or unavailable. Using sample biometric photo.');
    }
  };

  const handleCaptureFromCamera = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 400;
      canvas.height = videoRef.current.videoHeight || 400;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setFormData((prev) => ({ ...prev, photoUrl: dataUrl }));
      }
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setUseLiveCam(false);
  };

  // Complete Enrollment & Issue Card
  const handleFinishEnrollment = () => {
    const newStudent: Student = {
      id: Math.floor(2000000 + Math.random() * 900000).toString(),
      name: formData.name,
      rollNumber: formData.rollNumber,
      department: formData.department,
      course: formData.course,
      email: formData.email,
      photoUrl: formData.photoUrl,
      bloodGroup: formData.bloodGroup,
      validUntil: 'Jun 2028',
      enrolledAt: new Date().toISOString().split('T')[0],
      eyeprintVector,
      eyeprintHash,
      idCardQrPayload: '',
      idCardIssued: true
    };

    newStudent.idCardQrPayload = generateIdCardPayload(newStudent);
    onStudentEnrolled(newStudent);
    onSelectActiveStudent(newStudent);
    alert(`Student ${newStudent.name} successfully enrolled! Face-Recognized ID Card generated.`);
  };

  const currentPreviewPayload = eyeprintHash
    ? generateIdCardPayload({
        id: '2110432',
        rollNumber: formData.rollNumber,
        eyeprintHash
      })
    : '';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Award className="w-4 h-4" /> STEP 1: College Faculty Biometric Enrollment Center
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">
            Student Eyeprint Enrollment & ID Card Station
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Faculty officers capture the student's facial eyeprint vector, embed it securely into a cryptographic QR code, and print the official university physical ID card badge.
          </p>
        </div>

        {/* Existing Students Switcher */}
        <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20 text-xs">
          <label className="block text-slate-300 font-bold mb-1">Active Enrolled Student:</label>
          <select
            value={activeStudentId}
            onChange={(e) => {
              const selected = enrolledStudents.find((s) => s.id === e.target.value);
              if (selected) onSelectActiveStudent(selected);
            }}
            className="w-full bg-slate-800 text-white font-medium py-1.5 px-2.5 rounded-lg border border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-sky-400"
          >
            {enrolledStudents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.id} - {s.course.slice(0, 15)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3-Step Wizard Navigation */}
      <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1.5 rounded-2xl text-xs font-bold text-slate-600">
        <button
          type="button"
          onClick={() => setActiveStep(1)}
          className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeStep === 1 ? 'bg-white text-blue-900 shadow-sm' : 'hover:text-slate-900'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px]">1</span>
          <span>1. Student Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveStep(2)}
          className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeStep === 2 ? 'bg-white text-blue-900 shadow-sm' : 'hover:text-slate-900'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px]">2</span>
          <span>2. Eyeprint Biometrics</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveStep(3)}
          className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeStep === 3 ? 'bg-white text-blue-900 shadow-sm' : 'hover:text-slate-900'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px]">3</span>
          <span>3. Physical ID Card QR</span>
        </button>
      </div>

      {/* Wizard Step 1: Student Demographics */}
      {activeStep === 1 && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900">Student Demographics</h3>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full Legal Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Roll Number</label>
                <input
                  type="text"
                  value={formData.rollNumber}
                  onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono text-slate-900 font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Blood Group</label>
                <input
                  type="text"
                  value={formData.bloodGroup}
                  onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Degree Program</label>
              <input
                type="text"
                value={formData.course}
                onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 font-semibold"
              />
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="w-32 h-36 rounded-xl overflow-hidden border-2 border-blue-600 shadow-md mb-4 relative">
              <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
            </div>
            <p className="text-xs font-bold text-slate-700 mb-2">Faculty Photo Capture</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
              >
                <span>Proceed to Eyeprint Enrollment</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wizard Step 2: Eyeprint & Face Recognition Biometrics */}
      {activeStep === 2 && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Step 2: Eyeprint Biometric Enrollment</h3>
              <p className="text-xs text-slate-500">
                Scanning ocular geometry, pupillary distance, and facial feature landmarks to generate cryptographically signed eyeprint vector.
              </p>
            </div>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-bold">
              AI Biometric Scanner
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Camera Viewfinder / Facial Mesh Preview */}
            <div className="relative w-full max-w-sm mx-auto aspect-square bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-sky-500 shadow-xl">
              {useLiveCam ? (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              ) : (
                <img src={formData.photoUrl} alt="Face" className="w-full h-full object-cover filter brightness-90" />
              )}

              {/* Glowing Mesh Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <svg className="w-full h-full text-cyan-400" viewBox="0 0 200 200">
                  <polygon
                    points="100,20 130,35 150,70 155,110 140,150 120,180 100,190 80,180 60,150 45,110 50,70 70,35"
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                  {/* Eyes */}
                  <circle cx="75" cy="80" r="10" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
                  <circle cx="75" cy="80" r="2.5" fill="#38bdf8" />
                  <circle cx="125" cy="80" r="10" fill="none" stroke="#38bdf8" strokeWidth="1.5" />
                  <circle cx="125" cy="80" r="2.5" fill="#38bdf8" />
                  {/* Pupil Distance Line */}
                  <line x1="75" y1="80" x2="125" y2="80" stroke="#f43f5e" strokeWidth="1.5" />
                  <text x="100" y="74" fill="#f43f5e" fontSize="7" fontWeight="bold" textAnchor="middle">
                    IPD: 63.8 mm
                  </text>
                </svg>
              </div>

              {/* Live Tag */}
              <div className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                <span>BIOMETRIC LOCK</span>
              </div>
            </div>

            {/* Biometric Analysis Metrics */}
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-blue-600" /> Extracted Eyeprint Metrics:
                </h4>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <p>Inter-Pupillary Distance: <strong className="text-slate-900 font-mono">63.8 mm</strong></p>
                  <p>Eye Aspect Ratio (EAR): <strong className="text-slate-900 font-mono">0.32</strong></p>
                  <p>Nasion-Sella Angle: <strong className="text-slate-900 font-mono">102.4°</strong></p>
                  <p>Vector Dimensions: <strong className="text-slate-900 font-mono">16 Float32</strong></p>
                </div>
              </div>

              <div className="flex gap-2">
                {!useLiveCam ? (
                  <button
                    type="button"
                    onClick={handleStartLiveCamera}
                    className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Camera className="w-4 h-4" /> Open Faculty Webcam
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCaptureFromCamera}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" /> Capture Photo
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleEnrollEyeprint}
                  className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" /> Enroll Eyeprint & Gen QR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wizard Step 3: Physical ID Card Generation & Badge Print */}
      {activeStep === 3 && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Step 3: Physical Student ID Card Badge
              </h3>
              <p className="text-xs text-slate-500">
                Official physical badge equipped with cryptographically signed Eyeprint QR code for classroom door scanning.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCardFlipped(!cardFlipped)}
                className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1"
              >
                <RotateCw className="w-3.5 h-3.5" /> Flip Card
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" /> Print Badge
              </button>
            </div>
          </div>

          {/* Physical ID Card Mockup (Printable Badge) */}
          <div className="flex justify-center p-4">
            <div
              className={`relative w-[340px] sm:w-[380px] h-[240px] sm:h-[250px] rounded-2xl shadow-2xl p-4 transition-all duration-500 border border-slate-300 text-slate-900 overflow-hidden select-none ${
                cardFlipped
                  ? 'bg-gradient-to-br from-slate-100 to-slate-200'
                  : 'bg-gradient-to-br from-white via-sky-50/40 to-blue-50/50'
              }`}
            >
              {/* Shimmering Hologram Security Strip */}
              <div className="absolute top-0 right-0 w-16 h-full bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent pointer-events-none transform skew-x-12"></div>

              {!cardFlipped ? (
                /* Card Front */
                <div className="flex flex-col h-full justify-between">
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-blue-900/20 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-900 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                        MUT
                      </div>
                      <div>
                        <h4 className="text-[11px] font-black text-blue-950 uppercase tracking-tight">
                          Metropolitan University
                        </h4>
                        <p className="text-[8.5px] text-blue-800 font-semibold uppercase tracking-wider">
                          Faculty Student Identity Card
                        </p>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono font-bold bg-blue-900 text-white px-1.5 py-0.5 rounded">
                      2024-2028
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="flex items-center justify-between gap-3 my-auto">
                    {/* Student Photo */}
                    <div className="w-20 h-24 rounded-lg overflow-hidden border-2 border-blue-900 shadow-sm shrink-0 relative bg-slate-200">
                      <img src={formData.photoUrl} alt="Student" className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 inset-x-0 bg-blue-900/80 text-white text-[7px] text-center font-mono py-0.5">
                        VERIFIED
                      </div>
                    </div>

                    {/* Student Info */}
                    <div className="flex-1 text-left space-y-0.5">
                      <h5 className="text-[13px] font-black text-slate-950 leading-tight">
                        {formData.name}
                      </h5>
                      <p className="text-[10px] font-mono font-bold text-blue-900">
                        ID: 2110432
                      </p>
                      <p className="text-[9px] text-slate-700">
                        Roll: <span className="font-mono font-semibold">{formData.rollNumber}</span>
                      </p>
                      <p className="text-[9px] text-slate-700 truncate">
                        Dept: <span className="font-semibold">{formData.department}</span>
                      </p>
                      <p className="text-[8.5px] text-slate-600 font-mono">
                        Blood: <strong>{formData.bloodGroup}</strong> | Exp: <strong>06/2028</strong>
                      </p>
                    </div>

                    {/* Embedded Face-Recognized QR Code! */}
                    <div className="flex flex-col items-center shrink-0">
                      <div className="p-1 bg-white rounded-lg border border-slate-300 shadow-xs">
                        <QRCodeCanvas
                          value={currentPreviewPayload || generateIdCardPayload({
                            id: '2110432',
                            rollNumber: formData.rollNumber,
                            eyeprintHash: eyeprintHash || 'EYE-A89F12-SARA'
                          })}
                          size={78}
                          includeLogo={false}
                        />
                      </div>
                      <span className="text-[7.5px] font-bold text-blue-900 uppercase tracking-tight mt-0.5">
                        EYEPRINT QR
                      </span>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="border-t border-slate-200 pt-1.5 flex items-center justify-between text-[8px] text-slate-500 font-mono">
                    <span>EYEPRINT HASH: {eyeprintHash || 'EYE-A89F12-SARA'}</span>
                    <span className="font-bold text-blue-950">AUTHORIZED BY FACULTY DEAN</span>
                  </div>
                </div>
              ) : (
                /* Card Back */
                <div className="flex flex-col h-full justify-between p-1">
                  <div className="border-b border-slate-300 pb-1">
                    <h5 className="text-[10px] font-bold text-slate-800 uppercase">Terms & Instructions</h5>
                    <p className="text-[8px] text-slate-600 leading-tight">
                      This ID card is non-transferable and remains property of Metropolitan University. Must be presented at classroom door terminal for dual-scan attendance verification.
                    </p>
                  </div>

                  <div className="bg-slate-300 h-8 rounded-sm flex items-center justify-center font-mono text-[9px] text-slate-700 tracking-widest border border-slate-400">
                    |||||||| |||| |||||||||| |||||| |||||||| ||||
                  </div>

                  <div className="flex justify-between items-end text-[8px] text-slate-600">
                    <div>
                      <p>Emergency: campus-security@mut.edu</p>
                      <p>Card Revocation: faculty.reg@mut.edu</p>
                    </div>
                    <div className="text-right">
                      <div className="font-serif italic text-blue-900 text-xs">Dr. Robert Miller</div>
                      <p className="font-mono text-[7px] text-slate-500">Dean of Student Affairs</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action to enroll into live system */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={handleFinishEnrollment}
              className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Issue Card & Activate in Classroom Terminals</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
