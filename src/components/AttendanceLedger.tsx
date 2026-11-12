import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Search,
  CheckCircle,
  ShieldCheck,
  Clock,
  Filter,
  Check,
  AlertCircle
} from 'lucide-react';
import { AttendanceRecord } from '../types';

interface AttendanceLedgerProps {
  records: AttendanceRecord[];
}

export const AttendanceLedger: React.FC<AttendanceLedgerProps> = ({ records }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourse, setFilterCourse] = useState('ALL');

  const filteredRecords = records.filter((rec) => {
    const matchesSearch =
      rec.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.studentId.includes(searchQuery);

    const matchesCourse = filterCourse === 'ALL' || rec.courseCode === filterCourse;
    return matchesSearch && matchesCourse;
  });

  const exportToCsv = () => {
    const headers = [
      'Record ID',
      'Student Name',
      'Student ID',
      'Roll Number',
      'Course',
      'Room',
      'Timestamp',
      'Dual Scan Delta (ms)',
      'Facial Match %',
      'Status'
    ];

    const rows = filteredRecords.map((r) => [
      r.id,
      `"${r.studentName}"`,
      r.studentId,
      r.rollNumber,
      r.courseCode,
      r.room,
      r.timestamp,
      r.dualScanTimeDeltaMs,
      `${r.facialMatchPercent}%`,
      r.status
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `uniscan_attendance_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            <span>Classroom Attendance Ledger & Biometric Audit Trail</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of all verified dual-scans and facial biometric confirmations.
          </p>
        </div>

        <button
          type="button"
          onClick={exportToCsv}
          className="py-2 px-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV Ledger</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by student name, roll number, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 font-semibold text-slate-700"
          >
            <option value="ALL">All Courses</option>
            <option value="CS 301">CS 301 (Data Structures)</option>
            <option value="EE 204">EE 204 (Digital Circuits)</option>
            <option value="AI 402">AI 402 (Computer Vision)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Student & Roll No</th>
              <th className="py-3 px-3">Course & Room</th>
              <th className="py-3 px-3">Scan Delta</th>
              <th className="py-3 px-3">Facial Match</th>
              <th className="py-3 px-3">Security Checks</th>
              <th className="py-3 px-4">Verified Time</th>
              <th className="py-3 px-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-normal">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  No attendance records found matching query.
                </td>
              </tr>
            ) : (
              filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{record.studentName}</div>
                    <div className="font-mono text-[10px] text-slate-500">
                      ID: {record.studentId} • {record.rollNumber}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-slate-800">{record.courseCode}</span>
                    <div className="text-[10px] text-slate-500">{record.room}</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-mono font-semibold text-slate-700">
                      {record.dualScanTimeDeltaMs}ms
                    </span>
                    <div className="text-[10px] text-emerald-600 font-bold">&lt; 5s window</div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <span className="text-emerald-700 font-mono">{record.facialMatchPercent}%</span>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="text-[10px] text-slate-500">Eyeprint pass</div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1 text-[10px] text-slate-700">
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono font-bold" title="NTP Network Clock Synced">
                        NTP
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono font-bold" title="Dual-Scan Paired in &lt;5s">
                        DUAL
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono font-bold" title="FLAG_SECURE Anti-Screenshot Active">
                        SECURE
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                    {record.timestamp}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <Check className="w-3 h-3 stroke-[3]" /> PRESENT
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
