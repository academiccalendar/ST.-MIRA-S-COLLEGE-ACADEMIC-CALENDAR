import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Plus, Edit2, CheckCircle2, AlertCircle, Clock, MapPin } from 'lucide-react';
import { CalendarEvent, Department, EventType, AcademicYear, UserSession, VenueType, VENUE_OPTIONS } from '../types';

interface EventModalProps {
  isOpen: boolean;
  eventToEdit?: CalendarEvent | null;
  departments: Department[];
  eventTypes: EventType[];
  academicYears: AcademicYear[];
  events?: CalendarEvent[];
  user: UserSession | null;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    academic_year_id: number;
    date: string;
    department_id: number;
    class_section: string;
    event_type_id: number;
    description: string;
    venue: VenueType;
    start_time: string;
    end_time: string;
  }) => Promise<void>;
}

// Helpers for time comparison
function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return NaN;
  const s = timeStr.trim().toLowerCase();
  const isPM = s.includes('pm');
  const isAM = s.includes('am');
  const clean = s.replace(/am|pm/g, '').trim();
  const parts = clean.split(':');
  let hours = parseInt(parts[0], 10);
  let minutes = parts.length > 1 ? parseInt(parts[1], 10) : 0;
  if (isNaN(hours)) return NaN;
  if (isNaN(minutes)) minutes = 0;
  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function minutesToTimeStr(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function toInputTime(val?: string): string {
  if (!val) return '09:00';
  const mins = parseTimeToMinutes(val);
  if (isNaN(mins)) return '09:00';
  return minutesToTimeStr(mins);
}

function findAYForDate(dateStr: string, years: AcademicYear[]): number | null {
  if (!dateStr || years.length === 0) return null;
  const parts = dateStr.split('-');
  if (parts.length < 2) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  if (isNaN(year) || isNaN(month)) return null;
  const startYear = month >= 6 ? year : year - 1;
  const ayPattern = `${startYear}-${startYear + 1}`;
  const match = years.find(ay => ay.year === ayPattern || ay.year.includes(String(startYear)));
  return match ? match.id : null;
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  eventToEdit,
  departments,
  eventTypes,
  academicYears,
  events = [],
  user,
  onClose,
  onSubmit
}) => {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [academicYearId, setAcademicYearId] = useState<number>(academicYears[0]?.id || 1);
  const [departmentId, setDepartmentId] = useState<number>(user?.department_id || departments[0]?.id || 1);
  const [classSection, setClassSection] = useState('All Batches');
  const [eventTypeId, setEventTypeId] = useState<number>(eventTypes[0]?.id || 1);
  const [description, setDescription] = useState('');

  // Venue and Timing
  const [venue, setVenue] = useState<VenueType>('Auditorium');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (eventToEdit) {
      setName(eventToEdit.name);
      setDate(eventToEdit.date);
      // Auto-validate academic_year_id against current academicYears or match from date
      const validAY = academicYears.find(ay => ay.id === eventToEdit.academic_year_id);
      const matchedByDate = findAYForDate(eventToEdit.date, academicYears);
      setAcademicYearId(validAY ? validAY.id : (matchedByDate || academicYears[0]?.id || 1));
      setDepartmentId(eventToEdit.department_id);
      setClassSection(eventToEdit.class_section || 'All Batches');
      setEventTypeId(eventToEdit.event_type_id);
      setDescription(eventToEdit.description || '');
      setVenue(eventToEdit.venue || 'Auditorium');
      setStartTime(toInputTime(eventToEdit.start_time));
      setEndTime(toInputTime(eventToEdit.end_time));
    } else {
      const todayStr = new Date().toISOString().split('T')[0];
      setName('');
      setDate(todayStr);
      const matchedByDate = findAYForDate(todayStr, academicYears);
      setAcademicYearId(matchedByDate || academicYears[0]?.id || 1);
      setDepartmentId(user?.department_id || departments[0]?.id || 1);
      setClassSection('All Batches');
      setEventTypeId(eventTypes[0]?.id || 1);
      setDescription('');
      setVenue('Auditorium');
      setStartTime('09:00');
      setEndTime('10:00');
    }
    setError(null);
  }, [eventToEdit, isOpen, user, departments, academicYears, eventTypes]);

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    const matched = findAYForDate(newDate, academicYears);
    if (matched) {
      setAcademicYearId(matched);
    }
  };

  // Compute live availability conflict
  const conflictInfo = useMemo(() => {
    if (!venue || !date || !startTime || !endTime) return null;

    const startMin = parseTimeToMinutes(startTime);
    const endMin = parseTimeToMinutes(endTime);

    if (isNaN(startMin) || isNaN(endMin)) {
      return { invalid: true, message: 'Please enter valid times' };
    }

    if (startMin >= endMin) {
      return { invalid: true, message: 'End time must be after start time' };
    }

    const sameDayVenueEvents = events.filter(e =>
      e.date === date &&
      e.venue === venue &&
      (!eventToEdit || Number(e.id) !== Number(eventToEdit.id))
    );

    const overlappingEvents: CalendarEvent[] = [];

    for (const ev of sameDayVenueEvents) {
      const evStartMin = parseTimeToMinutes(ev.start_time || '09:00');
      const evEndMin = parseTimeToMinutes(ev.end_time || '10:00');

      if (startMin < evEndMin && endMin > evStartMin) {
        overlappingEvents.push(ev);
      }
    }

    if (overlappingEvents.length === 0) {
      return null;
    }

    // Find maximum end time of directly overlapping events and contiguous blocks
    let maxEndMin = 0;
    for (const ev of overlappingEvents) {
      const evEndMin = parseTimeToMinutes(ev.end_time || '10:00');
      if (evEndMin > maxEndMin) {
        maxEndMin = evEndMin;
      }
    }

    let extended = true;
    while (extended) {
      extended = false;
      for (const ev of sameDayVenueEvents) {
        const evStart = parseTimeToMinutes(ev.start_time || '09:00');
        const evEnd = parseTimeToMinutes(ev.end_time || '10:00');
        if (evStart <= maxEndMin && evEnd > maxEndMin) {
          maxEndMin = evEnd;
          extended = true;
        }
      }
    }

    const conflictEnd = minutesToTimeStr(maxEndMin);

    return {
      invalid: true,
      hasConflict: true,
      message: `Booking available after ${conflictEnd}`,
      conflictEnd,
      conflictingEvent: overlappingEvents[0]
    };
  }, [venue, date, startTime, endTime, events, eventToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Event name is required');
      return;
    }
    if (!date) {
      setError('Event date is required');
      return;
    }
    if (!startTime || !endTime) {
      setError('Start time and end time are required');
      return;
    }

    const startMin = parseTimeToMinutes(startTime);
    const endMin = parseTimeToMinutes(endTime);
    if (isNaN(startMin) || isNaN(endMin) || startMin >= endMin) {
      setError('End time must be after start time');
      return;
    }

    if (conflictInfo && conflictInfo.hasConflict) {
      setError(conflictInfo.message);
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        name: name.trim(),
        academic_year_id: Number(academicYearId),
        date,
        department_id: Number(departmentId),
        class_section: classSection.trim() || 'All Batches',
        event_type_id: Number(eventTypeId),
        description: description.trim(),
        venue,
        start_time: toInputTime(startTime),
        end_time: toInputTime(endTime)
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save event');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center space-x-2">
            {eventToEdit ? (
              <Edit2 className="w-5 h-5 text-amber-400" />
            ) : (
              <Plus className="w-5 h-5 text-blue-400" />
            )}
            <h3 className="text-lg font-bold font-serif">
              {eventToEdit ? 'Edit Academic Event' : 'Schedule New Event'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Live Conflict Warning Banner */}
          {conflictInfo && conflictInfo.hasConflict && (
            <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 text-xs rounded-xl flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold text-amber-950">{conflictInfo.message}</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  The venue <span className="font-semibold">{venue}</span> is occupied by{' '}
                  <span className="font-semibold">"{conflictInfo.conflictingEvent?.name}"</span> until{' '}
                  <span className="font-semibold">{conflictInfo.conflictEnd}</span>.
                </p>
              </div>
            </div>
          )}

          {/* Event Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Event Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Guest Lecture on AI / Unit Tests / Annual Seminar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
          </div>

          {/* Date & Academic Year Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Event Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Academic Year <span className="text-red-500">*</span>
              </label>
              <select
                value={academicYearId}
                onChange={(e) => setAcademicYearId(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {academicYears.map(ay => (
                  <option key={ay.id} value={ay.id}>
                    AY {ay.year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Venue Dropdown - 4 Options: Auditorium, AV room, Sanctuary, Classroom */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  Venue / Facility <span className="text-red-500">*</span>
                </span>
                <span className="text-[10px] text-slate-500 font-normal">
                  Checked for scheduling conflicts
                </span>
              </label>
              <select
                value={venue}
                onChange={(e) => setVenue(e.target.value as VenueType)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {VENUE_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            {/* Timing Inputs (Start Time & End Time) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  End Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Quick Timing Preset Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Presets:</span>
              {[
                { label: '09:00 - 10:00', start: '09:00', end: '10:00' },
                { label: '10:00 - 11:30', start: '10:00', end: '11:30' },
                { label: '11:30 - 13:00', start: '11:30', end: '13:00' },
                { label: '14:00 - 16:00', start: '14:00', end: '16:00' }
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setStartTime(preset.start);
                    setEndTime(preset.end);
                  }}
                  className="text-[10px] font-medium px-2 py-0.5 bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-md transition text-slate-600"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Department & Event Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Department <span className="text-red-500">*</span>
              </label>
              <select
                value={departmentId}
                disabled={user?.role === 'teacher'} // Teacher locked to own department
                onChange={(e) => setDepartmentId(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {departments.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              {user?.role === 'teacher' && (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Locked to your assigned department
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Event Category <span className="text-red-500">*</span>
              </label>
              <select
                value={eventTypeId}
                onChange={(e) => setEventTypeId(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {eventTypes.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Class / Section */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Class / Target Audience
            </label>
            <input
              type="text"
              placeholder="e.g. FY B.Sc, SY B.Com, All Batches"
              value={classSection}
              onChange={(e) => setClassSection(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Event Description / Agenda
            </label>
            <textarea
              rows={3}
              placeholder="Provide event details, speaker, syllabus coverage, or session notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-900 text-xs font-semibold rounded-xl border border-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow transition disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : eventToEdit ? 'Update Event' : 'Book Event'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
