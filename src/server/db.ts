import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export interface AcademicYearRecord {
  id: number;
  year: string;
}

export interface DepartmentRecord {
  id: number;
  name: string;
}

export interface TeacherRecord {
  id: number;
  first_name: string;
  last_name: string;
  department_id: number;
  phone: string;
  email: string;
  role: 'admin' | 'teacher';
  password_hash: string;
}

export interface EventTypeRecord {
  id: number;
  name: string;
  color: string;
}

export type VenueType = 'Auditorium' | 'AV room' | 'Sanctuary' | 'Classroom';
export const VALID_VENUES: VenueType[] = ['Auditorium', 'AV room', 'Sanctuary', 'Classroom'];

export interface EventRecord {
  id: number;
  name: string;
  academic_year_id: number;
  date: string; // YYYY-MM-DD
  teacher_id: number;
  department_id: number;
  class_section: string;
  event_type_id: number;
  description: string;
  venue: VenueType;
  start_time: string; // "HH:mm"
  end_time: string;   // "HH:mm"
}

export function parseTimeToMinutes(timeStr: string): number {
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

export function minutesToTimeStr(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function normalizeTime(timeStr: string): string {
  const mins = parseTimeToMinutes(timeStr);
  if (isNaN(mins)) return '09:00';
  return minutesToTimeStr(mins);
}

export function checkVenueAvailability(
  venue: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeEventId?: number
): { available: boolean; conflictMessage?: string; conflictEndTime?: string; conflictingEvent?: EventRecord } {
  const startMin = parseTimeToMinutes(startTime);
  const endMin = parseTimeToMinutes(endTime);

  if (isNaN(startMin) || isNaN(endMin)) {
    return { available: false, conflictMessage: 'Invalid time format. Please provide valid start and end times.' };
  }

  if (startMin >= endMin) {
    return { available: false, conflictMessage: 'End time must be after start time' };
  }

  const db = loadDB();
  const excludeId = excludeEventId ? Number(excludeEventId) : null;
  const sameDayVenueEvents = db.events.filter(e => 
    e.date === date && 
    e.venue === venue && 
    (!excludeId || Number(e.id) !== excludeId)
  );

  const overlappingEvents: EventRecord[] = [];

  for (const ev of sameDayVenueEvents) {
    const evStartMin = parseTimeToMinutes(ev.start_time || '09:00');
    const evEndMin = parseTimeToMinutes(ev.end_time || '10:00');

    // Interval overlap: startA < endB && endA > startB
    if (startMin < evEndMin && endMin > evStartMin) {
      overlappingEvents.push(ev);
    }
  }

  if (overlappingEvents.length === 0) {
    return { available: true };
  }

  // Find maximum end time of directly overlapping events
  let maxEndMin = 0;
  for (const ev of overlappingEvents) {
    const evEndMin = parseTimeToMinutes(ev.end_time || '10:00');
    if (evEndMin > maxEndMin) {
      maxEndMin = evEndMin;
    }
  }

  // Extend forward if another event directly connects or overlaps with maxEndMin
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

  const conflictEndTime = minutesToTimeStr(maxEndMin);

  return {
    available: false,
    conflictMessage: `Booking available after ${conflictEndTime}`,
    conflictEndTime,
    conflictingEvent: overlappingEvents[0]
  };
}

export interface DatabaseSchema {
  academic_years: AcademicYearRecord[];
  departments: DepartmentRecord[];
  teachers: TeacherRecord[];
  event_types: EventTypeRecord[];
  events: EventRecord[];
  next_ids: {
    academic_year: number;
    department: number;
    teacher: number;
    event_type: number;
    event: number;
  };
}

const DB_FILE_PATH = path.join(process.cwd(), 'data', 'database.json');

function ensureDataDirExists() {
  const dir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getInitialSeedData(): DatabaseSchema {
  const password_hash = bcrypt.hashSync('admin123', 10);
  const teacher_password_hash = bcrypt.hashSync('teacher123', 10);

  const academic_years: AcademicYearRecord[] = [
    { id: 1, year: '2023-2024' },
    { id: 2, year: '2024-2025' },
    { id: 3, year: '2025-2026' }
  ];

  const departments: DepartmentRecord[] = [
    { id: 1, name: 'College Overall' },
    { id: 2, name: 'Computer Science' },
    { id: 3, name: 'Commerce & Economics' },
    { id: 4, name: 'Arts & Humanities' },
    { id: 5, name: 'Sciences' },
    { id: 6, name: 'Business Administration' }
  ];

  const event_types: EventTypeRecord[] = [
    { id: 1, name: 'Holiday', color: '#ef4444' },        // Red
    { id: 2, name: 'Exam', color: '#3b82f6' },           // Blue
    { id: 3, name: 'Admission', color: '#10b981' },      // Green
    { id: 4, name: 'Cultural', color: '#ec4899' },       // Pink
    { id: 5, name: 'Sports', color: '#f59e0b' },         // Amber
    { id: 6, name: 'Academic', color: '#8b5cf6' },       // Purple
    { id: 7, name: 'Staff Meeting', color: '#6b7280' }   // Slate
  ];

  const teachers: TeacherRecord[] = [
    {
      id: 1,
      first_name: 'Principal /',
      last_name: 'Administrator',
      department_id: 1,
      phone: '+1 555-0100',
      email: 'admin@college.edu',
      role: 'admin',
      password_hash: password_hash
    },
    {
      id: 2,
      first_name: 'Dr. Jane',
      last_name: 'Smith',
      department_id: 2,
      phone: '+1 555-0101',
      email: 'j.smith@college.edu',
      role: 'teacher',
      password_hash: teacher_password_hash
    },
    {
      id: 3,
      first_name: 'Prof. Rajesh',
      last_name: 'Sharma',
      department_id: 3,
      phone: '+1 555-0102',
      email: 'r.sharma@college.edu',
      role: 'teacher',
      password_hash: teacher_password_hash
    },
    {
      id: 4,
      first_name: 'Dr. Meera',
      last_name: 'Patel',
      department_id: 5,
      phone: '+1 555-0103',
      email: 'm.patel@college.edu',
      role: 'teacher',
      password_hash: teacher_password_hash
    }
  ];

  // Seed events starting June 2023 for 2023-2024 academic calendar
  const events: EventRecord[] = [
    {
      id: 1,
      name: 'Commencement of Academic Session 2023-24',
      academic_year_id: 1,
      date: '2023-06-15',
      teacher_id: 1,
      department_id: 1,
      class_section: 'All Batches',
      event_type_id: 6,
      description: 'Orientation assembly and commencement of regular lectures for FY, SY, and TY students.',
      venue: 'Auditorium',
      start_time: '09:00',
      end_time: '11:00'
    },
    {
      id: 2,
      name: 'World Environment Day Tree Plantation Drive',
      academic_year_id: 1,
      date: '2023-06-05',
      teacher_id: 4,
      department_id: 5,
      class_section: 'B.Sc / All Students',
      event_type_id: 4,
      description: 'Campus clean-up and botanical garden planting drive organized by Sciences dept.',
      venue: 'Sanctuary',
      start_time: '08:30',
      end_time: '10:30'
    },
    {
      id: 3,
      name: 'Bakri Id / Eid-ul-Adha Holiday',
      academic_year_id: 1,
      date: '2023-06-29',
      teacher_id: 1,
      department_id: 1,
      class_section: 'All Batches',
      event_type_id: 1,
      description: 'Gazetted institutional holiday. College remains closed.',
      venue: 'Classroom',
      start_time: '09:00',
      end_time: '17:00'
    },
    {
      id: 4,
      name: 'Degree Admissions First Merit List Verification',
      academic_year_id: 1,
      date: '2023-07-03',
      teacher_id: 1,
      department_id: 1,
      class_section: 'FY Applicants',
      event_type_id: 3,
      description: 'Document verification and fee submission for first merit list candidates.',
      venue: 'Classroom',
      start_time: '10:00',
      end_time: '14:00'
    },
    {
      id: 5,
      name: 'International Yoga Day Session',
      academic_year_id: 1,
      date: '2023-06-21',
      teacher_id: 1,
      department_id: 1,
      class_section: 'All Batches',
      event_type_id: 5,
      description: 'Morning yoga and wellness session at the college gymnasium.',
      venue: 'Auditorium',
      start_time: '07:00',
      end_time: '08:30'
    },
    {
      id: 6,
      name: 'Departmental Faculty Staff Meeting',
      academic_year_id: 1,
      date: '2023-07-10',
      teacher_id: 2,
      department_id: 2,
      class_section: 'Faculty',
      event_type_id: 7,
      description: 'Review of semester syllabus coverage and lab infrastructure upgrades.',
      venue: 'AV room',
      start_time: '14:00',
      end_time: '16:00'
    },
    {
      id: 7,
      name: 'Independence Day Celebrations & Flag Hoisting',
      academic_year_id: 1,
      date: '2023-08-15',
      teacher_id: 1,
      department_id: 1,
      class_section: 'All Batches',
      event_type_id: 4,
      description: 'Patriotic cultural program and address by the Principal.',
      venue: 'Auditorium',
      start_time: '08:00',
      end_time: '10:30'
    },
    {
      id: 8,
      name: 'Mid-Semester Unit Tests - Phase 1',
      academic_year_id: 1,
      date: '2023-08-22',
      teacher_id: 3,
      department_id: 3,
      class_section: 'SY & TY B.Com',
      event_type_id: 2,
      description: 'Written 20-marks continuous internal evaluation tests across subjects.',
      venue: 'Classroom',
      start_time: '09:00',
      end_time: '11:00'
    },
    {
      id: 9,
      name: 'Ganesh Chaturthi Holiday',
      academic_year_id: 1,
      date: '2023-09-19',
      teacher_id: 1,
      department_id: 1,
      class_section: 'All Batches',
      event_type_id: 1,
      description: 'Institutional holiday for Ganesh Chaturthi festival.',
      venue: 'Classroom',
      start_time: '09:00',
      end_time: '17:00'
    },
    {
      id: 10,
      name: 'Annual Inter-College Sports Championship Selection',
      academic_year_id: 1,
      date: '2023-10-04',
      teacher_id: 1,
      department_id: 1,
      class_section: 'All Batches',
      event_type_id: 5,
      description: 'Selections for Basketball, Badminton, Athletics, and Table Tennis teams.',
      venue: 'Sanctuary',
      start_time: '09:00',
      end_time: '12:00'
    },
    {
      id: 11,
      name: 'Semester 1 End Examinations Commencement',
      academic_year_id: 1,
      date: '2023-10-23',
      teacher_id: 2,
      department_id: 2,
      class_section: 'FY, SY & TY',
      event_type_id: 2,
      description: 'University end-semester theory and practical examinations.',
      venue: 'Classroom',
      start_time: '10:00',
      end_time: '13:00'
    },
    {
      id: 12,
      name: 'Diwali Autumn Break / Vacation',
      academic_year_id: 1,
      date: '2023-11-09',
      teacher_id: 1,
      department_id: 1,
      class_section: 'All Batches',
      event_type_id: 1,
      description: 'Autumn vacation break for staff and students.',
      venue: 'Classroom',
      start_time: '09:00',
      end_time: '17:00'
    },
    {
      id: 13,
      name: 'Commencement of Even Semester (Sem II, IV, VI)',
      academic_year_id: 1,
      date: '2023-12-01',
      teacher_id: 1,
      department_id: 1,
      class_section: 'All Batches',
      event_type_id: 6,
      description: 'Resumption of classes after Diwali break for even semester.',
      venue: 'Auditorium',
      start_time: '09:00',
      end_time: '10:30'
    },
    {
      id: 14,
      name: 'Annual Cultural Festival "Spandan 2023"',
      academic_year_id: 1,
      date: '2023-12-22',
      teacher_id: 1,
      department_id: 1,
      class_section: 'All Batches',
      event_type_id: 4,
      description: 'Annual inter-departmental music, dance, drama, and art competition.',
      venue: 'Auditorium',
      start_time: '10:00',
      end_time: '16:00'
    },
    {
      id: 15,
      name: 'Republic Day Parade & NCC Drill',
      academic_year_id: 1,
      date: '2024-01-26',
      teacher_id: 1,
      department_id: 1,
      class_section: 'All Batches',
      event_type_id: 4,
      description: '75th Republic Day celebration, flag hoisting, and award distribution.',
      venue: 'Sanctuary',
      start_time: '08:00',
      end_time: '10:00'
    },
    {
      id: 16,
      name: 'National Science Day Exhibition',
      academic_year_id: 1,
      date: '2024-02-28',
      teacher_id: 4,
      department_id: 5,
      class_section: 'B.Sc / All Batches',
      event_type_id: 6,
      description: 'Science project demonstration, poster presentation, and guest lecture.',
      venue: 'AV room',
      start_time: '10:00',
      end_time: '13:00'
    },
    {
      id: 17,
      name: 'Semester Even Final Practical & Oral Exams',
      academic_year_id: 1,
      date: '2024-03-20',
      teacher_id: 2,
      department_id: 2,
      class_section: 'FY & SY Computer Science',
      event_type_id: 2,
      description: 'Lab practical evaluation and external viva voce.',
      venue: 'Classroom',
      start_time: '09:00',
      end_time: '13:00'
    },
    {
      id: 18,
      name: 'Annual Degree Convocation Ceremony',
      academic_year_id: 1,
      date: '2024-04-15',
      teacher_id: 1,
      department_id: 1,
      class_section: 'Graduating Batch 2023-24',
      event_type_id: 6,
      description: 'Conferment of degrees and distribution of academic excellence medals.',
      venue: 'Auditorium',
      start_time: '10:00',
      end_time: '13:00'
    },
    {
      id: 19,
      name: 'Summer Vacation Commencement',
      academic_year_id: 1,
      date: '2024-05-02',
      teacher_id: 1,
      department_id: 1,
      class_section: 'All Batches',
      event_type_id: 1,
      description: 'Annual summer break for students following completion of university exams.',
      venue: 'Classroom',
      start_time: '09:00',
      end_time: '17:00'
    }
  ];

  return {
    academic_years,
    departments,
    event_types,
    teachers,
    events,
    next_ids: {
      academic_year: 4,
      department: 7,
      teacher: 5,
      event_type: 8,
      event: 20
    }
  };
}

export function loadDB(): DatabaseSchema {
  ensureDataDirExists();
  let db: DatabaseSchema;
  if (!fs.existsSync(DB_FILE_PATH)) {
    db = getInitialSeedData();
    saveDB(db);
    return db;
  }
  try {
    const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
    db = JSON.parse(raw);
  } catch (err) {
    console.error('Error reading DB file, re-seeding:', err);
    db = getInitialSeedData();
    saveDB(db);
    return db;
  }

  // Ensure all events have valid venue, start_time, and end_time
  let changed = false;
  const venuePool: VenueType[] = ['Auditorium', 'AV room', 'Sanctuary', 'Classroom'];
  db.events.forEach((ev, idx) => {
    if (!ev.venue || !VALID_VENUES.includes(ev.venue)) {
      ev.venue = venuePool[idx % venuePool.length];
      changed = true;
    }
    if (!ev.start_time) {
      ev.start_time = '09:00';
      changed = true;
    }
    if (!ev.end_time) {
      ev.end_time = '10:00';
      changed = true;
    }
  });

  if (changed) {
    saveDB(db);
  }

  return db;
}

export function saveDB(db: DatabaseSchema) {
  ensureDataDirExists();
  fs.writeFileSync(DB_FILE_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

/**
 * ACADEMIC YEARS
 */
export function getAcademicYears() {
  const db = loadDB();
  return db.academic_years;
}

export function createAcademicYear(year: string) {
  const db = loadDB();
  const id = db.next_ids.academic_year++;
  const record: AcademicYearRecord = { id, year };
  db.academic_years.push(record);
  saveDB(db);
  return record;
}

export function updateAcademicYear(id: number, year: string) {
  const db = loadDB();
  const index = db.academic_years.findIndex(a => a.id === id);
  if (index === -1) return null;
  db.academic_years[index].year = year;
  saveDB(db);
  return db.academic_years[index];
}

export function deleteAcademicYear(id: number) {
  const db = loadDB();
  const targetId = Number(id);
  const exists = db.academic_years.some(a => a.id === targetId);
  if (!exists) return false;

  // Don't delete if it is the only remaining academic year
  if (db.academic_years.length <= 1) return false;

  db.academic_years = db.academic_years.filter(a => a.id !== targetId);

  // When an academic year is deleted, also delete all events belonging to that academic year
  db.events = db.events.filter(e => Number(e.academic_year_id) !== targetId);

  saveDB(db);
  return true;
}

/**
 * DEPARTMENTS
 */
export function getDepartments() {
  const db = loadDB();
  return db.departments;
}

export function createDepartment(name: string) {
  const db = loadDB();
  const id = db.next_ids.department++;
  const record: DepartmentRecord = { id, name };
  db.departments.push(record);
  saveDB(db);
  return record;
}

export function updateDepartment(id: number, name: string) {
  const db = loadDB();
  const index = db.departments.findIndex(d => d.id === id);
  if (index === -1) return null;
  db.departments[index].name = name;
  saveDB(db);
  return db.departments[index];
}

export function deleteDepartment(id: number) {
  const db = loadDB();
  const targetId = Number(id);
  const exists = db.departments.some(d => d.id === targetId);
  if (!exists) return false;

  // Don't delete if it is the only remaining department
  if (db.departments.length <= 1) return false;

  db.departments = db.departments.filter(d => d.id !== targetId);

  // Reassign any referencing teachers and events to first remaining department
  const fallbackDeptId = db.departments[0]?.id || 1;
  db.teachers.forEach(t => {
    if (Number(t.department_id) === targetId) {
      t.department_id = fallbackDeptId;
    }
  });
  db.events.forEach(e => {
    if (Number(e.department_id) === targetId) {
      e.department_id = fallbackDeptId;
    }
  });

  saveDB(db);
  return true;
}

/**
 * EVENT TYPES
 */
export function getEventTypes() {
  const db = loadDB();
  return db.event_types;
}

export function createEventType(name: string, color: string) {
  const db = loadDB();
  const id = db.next_ids.event_type++;
  const record: EventTypeRecord = { id, name, color };
  db.event_types.push(record);
  saveDB(db);
  return record;
}

export function updateEventType(id: number, name: string, color: string) {
  const db = loadDB();
  const index = db.event_types.findIndex(t => t.id === id);
  if (index === -1) return null;
  db.event_types[index].name = name;
  db.event_types[index].color = color;
  saveDB(db);
  return db.event_types[index];
}

export function deleteEventType(id: number) {
  const db = loadDB();
  const targetId = Number(id);
  const exists = db.event_types.some(t => t.id === targetId);
  if (!exists) return false;

  // Don't delete if it is the only remaining event type
  if (db.event_types.length <= 1) return false;

  db.event_types = db.event_types.filter(t => t.id !== targetId);

  // Reassign referencing events to first remaining event type
  const fallbackTypeId = db.event_types[0]?.id || 1;
  db.events.forEach(e => {
    if (Number(e.event_type_id) === targetId) {
      e.event_type_id = fallbackTypeId;
    }
  });

  saveDB(db);
  return true;
}

/**
 * TEACHERS
 */
export function getTeachers() {
  const db = loadDB();
  return db.teachers.map(t => {
    const dept = db.departments.find(d => d.id === t.department_id);
    return {
      id: t.id,
      first_name: t.first_name,
      last_name: t.last_name,
      department_id: t.department_id,
      department_name: dept ? dept.name : 'Unknown',
      phone: t.phone,
      email: t.email,
      role: t.role
    };
  });
}

export function getTeacherById(id: number) {
  const db = loadDB();
  return db.teachers.find(t => t.id === id);
}

export function getTeacherByEmail(email: string) {
  const db = loadDB();
  return db.teachers.find(t => t.email.toLowerCase() === email.toLowerCase());
}

export function createTeacher(data: {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  department_id: number;
  role: 'admin' | 'teacher';
  password?: string;
}) {
  const db = loadDB();
  const id = db.next_ids.teacher++;
  const password_hash = bcrypt.hashSync(data.password || 'teacher123', 10);
  const record: TeacherRecord = {
    id,
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email,
    phone: data.phone || '',
    department_id: data.department_id,
    role: data.role,
    password_hash
  };
  db.teachers.push(record);
  saveDB(db);

  const dept = db.departments.find(d => d.id === record.department_id);
  return {
    id: record.id,
    first_name: record.first_name,
    last_name: record.last_name,
    department_id: record.department_id,
    department_name: dept ? dept.name : 'Unknown',
    phone: record.phone,
    email: record.email,
    role: record.role
  };
}

export function updateTeacher(id: number, updates: Partial<{
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  department_id: number;
  role: 'admin' | 'teacher';
  password?: string;
}>) {
  const db = loadDB();
  const index = db.teachers.findIndex(t => t.id === id);
  if (index === -1) return null;

  const t = db.teachers[index];
  if (updates.first_name) t.first_name = updates.first_name;
  if (updates.last_name) t.last_name = updates.last_name;
  if (updates.email) t.email = updates.email;
  if (updates.phone !== undefined) t.phone = updates.phone;
  if (updates.department_id) t.department_id = updates.department_id;
  if (updates.role) t.role = updates.role;
  if (updates.password) {
    t.password_hash = bcrypt.hashSync(updates.password, 10);
  }

  saveDB(db);
  const dept = db.departments.find(d => d.id === t.department_id);
  return {
    id: t.id,
    first_name: t.first_name,
    last_name: t.last_name,
    department_id: t.department_id,
    department_name: dept ? dept.name : 'Unknown',
    phone: t.phone,
    email: t.email,
    role: t.role
  };
}

export function deleteTeacher(id: number) {
  const db = loadDB();
  const targetId = Number(id);
  // Don't delete the last admin
  const teacher = db.teachers.find(t => t.id === targetId);
  if (!teacher) return false;

  if (teacher.role === 'admin') {
    const adminCount = db.teachers.filter(t => t.role === 'admin').length;
    if (adminCount <= 1) return false;
  }

  db.teachers = db.teachers.filter(t => t.id !== targetId);

  // Reassign any events created by this teacher to first admin
  const fallbackAdminId = db.teachers.find(t => t.role === 'admin')?.id || 1;
  db.events.forEach(e => {
    if (Number(e.teacher_id) === targetId) {
      e.teacher_id = fallbackAdminId;
    }
  });

  saveDB(db);
  return true;
}

/**
 * EVENTS
 */
export function getEvents() {
  const db = loadDB();
  return db.events.map(e => {
    const ay = db.academic_years.find(a => a.id === e.academic_year_id);
    const dept = db.departments.find(d => d.id === e.department_id);
    const teacher = db.teachers.find(t => t.id === e.teacher_id);
    const type = db.event_types.find(t => t.id === e.event_type_id);

    return {
      ...e,
      academic_year_name: ay ? ay.year : 'Unknown',
      department_name: dept ? dept.name : 'Unknown',
      teacher_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Unknown',
      event_type_name: type ? type.name : 'Unknown',
      event_type_color: type ? type.color : '#6b7280'
    };
  });
}

export function getEventById(id: number) {
  const events = getEvents();
  return events.find(e => e.id === id) || null;
}

export function createEvent(data: {
  name: string;
  academic_year_id: number;
  date: string;
  teacher_id: number;
  department_id: number;
  class_section: string;
  event_type_id: number;
  description: string;
  venue?: VenueType;
  start_time?: string;
  end_time?: string;
}) {
  const db = loadDB();
  const id = db.next_ids.event++;
  const venue: VenueType = (data.venue && VALID_VENUES.includes(data.venue)) ? data.venue : 'Classroom';
  const start_time = data.start_time ? normalizeTime(data.start_time) : '09:00';
  const end_time = data.end_time ? normalizeTime(data.end_time) : '10:00';

  const record: EventRecord = {
    id,
    name: data.name,
    academic_year_id: data.academic_year_id,
    date: data.date,
    teacher_id: data.teacher_id,
    department_id: data.department_id,
    class_section: data.class_section || 'All Classes',
    event_type_id: data.event_type_id,
    description: data.description || '',
    venue,
    start_time,
    end_time
  };

  db.events.push(record);
  saveDB(db);
  return record;
}

export function updateEvent(id: number, updates: Partial<EventRecord>) {
  const db = loadDB();
  const targetId = Number(id);
  const index = db.events.findIndex(e => Number(e.id) === targetId);
  if (index === -1) return null;

  const current = db.events[index];
  const venue: VenueType = (updates.venue && VALID_VENUES.includes(updates.venue)) ? updates.venue : current.venue || 'Classroom';
  const start_time = updates.start_time ? normalizeTime(updates.start_time) : current.start_time || '09:00';
  const end_time = updates.end_time ? normalizeTime(updates.end_time) : current.end_time || '10:00';

  db.events[index] = {
    ...current,
    ...updates,
    academic_year_id: updates.academic_year_id ? Number(updates.academic_year_id) : current.academic_year_id,
    department_id: updates.department_id ? Number(updates.department_id) : current.department_id,
    event_type_id: updates.event_type_id ? Number(updates.event_type_id) : current.event_type_id,
    venue,
    start_time,
    end_time,
    id: targetId // preserve original id
  };

  saveDB(db);
  return db.events[index];
}

export function deleteEvent(id: number) {
  const db = loadDB();
  const targetId = Number(id);
  const initialLen = db.events.length;
  db.events = db.events.filter(e => Number(e.id) !== targetId);
  if (db.events.length === initialLen) return false;
  saveDB(db);
  return true;
}

export function seedImportEvents(importedEvents: Array<{
  name: string;
  date: string; // YYYY-MM-DD
  description?: string;
  department_name?: string;
  event_type_name?: string;
  academic_year_name?: string;
  venue?: string;
  start_time?: string;
  end_time?: string;
}>) {
  const db = loadDB();

  // Find or default academic year
  const defaultAY = db.academic_years[0] || { id: 1, year: '2023-2024' };
  const defaultDept = db.departments[0] || { id: 1, name: 'College Overall' };
  const defaultTeacher = db.teachers[0] || { id: 1 };
  const defaultType = db.event_types[0] || { id: 1 };
  const venueOptions: VenueType[] = ['Auditorium', 'AV room', 'Sanctuary', 'Classroom'];

  let addedCount = 0;

  for (const item of importedEvents) {
    if (!item.name || !item.date) continue;

    // Infer or match event type
    let typeId = defaultType.id;
    const lowerName = (item.name + ' ' + (item.description || '')).toLowerCase();
    
    if (lowerName.includes('holiday') || lowerName.includes('vacation') || lowerName.includes('eid') || lowerName.includes('jayanti') || lowerName.includes('break')) {
      const t = db.event_types.find(et => et.name.toLowerCase() === 'holiday');
      if (t) typeId = t.id;
    } else if (lowerName.includes('exam') || lowerName.includes('test') || lowerName.includes('viva') || lowerName.includes('unit test') || lowerName.includes('practical')) {
      const t = db.event_types.find(et => et.name.toLowerCase() === 'exam');
      if (t) typeId = t.id;
    } else if (lowerName.includes('admission') || lowerName.includes('merit') || lowerName.includes('form') || lowerName.includes('enroll')) {
      const t = db.event_types.find(et => et.name.toLowerCase() === 'admission');
      if (t) typeId = t.id;
    } else if (lowerName.includes('sports') || lowerName.includes('tournament') || lowerName.includes('match') || lowerName.includes('yoga')) {
      const t = db.event_types.find(et => et.name.toLowerCase() === 'sports');
      if (t) typeId = t.id;
    } else if (lowerName.includes('cultural') || lowerName.includes('fest') || lowerName.includes('spandan') || lowerName.includes('gathering') || lowerName.includes('day')) {
      const t = db.event_types.find(et => et.name.toLowerCase() === 'cultural');
      if (t) typeId = t.id;
    } else if (lowerName.includes('meeting') || lowerName.includes('faculty') || lowerName.includes('staff')) {
      const t = db.event_types.find(et => et.name.toLowerCase() === 'staff meeting');
      if (t) typeId = t.id;
    } else {
      const t = db.event_types.find(et => et.name.toLowerCase() === 'academic');
      if (t) typeId = t.id;
    }

    const assignedVenue: VenueType = (item.venue && VALID_VENUES.includes(item.venue as VenueType)) 
      ? (item.venue as VenueType) 
      : venueOptions[addedCount % venueOptions.length];

    const id = db.next_ids.event++;
    const record: EventRecord = {
      id,
      name: item.name,
      academic_year_id: defaultAY.id,
      date: item.date,
      teacher_id: defaultTeacher.id,
      department_id: defaultDept.id,
      class_section: 'All Batches',
      event_type_id: typeId,
      description: item.description || item.name,
      venue: assignedVenue,
      start_time: item.start_time ? normalizeTime(item.start_time) : '09:00',
      end_time: item.end_time ? normalizeTime(item.end_time) : '10:00'
    };

    db.events.push(record);
    addedCount++;
  }

  saveDB(db);
  return addedCount;
}

/**
 * DASHBOARD STATS
 */
export function getDashboardStats() {
  const db = loadDB();
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const todayStr = now.toISOString().split('T')[0];

  const total_events = db.events.length;
  const events_this_month = db.events.filter(e => e.date.startsWith(currentMonthStr)).length;
  const upcoming_events = db.events.filter(e => e.date >= todayStr).length;

  const department_breakdown = db.departments.map(d => {
    const count = db.events.filter(e => e.department_id === d.id).length;
    return { department_id: d.id, department_name: d.name, count };
  });

  const event_type_breakdown = db.event_types.map(et => {
    const count = db.events.filter(e => e.event_type_id === et.id).length;
    return { event_type_id: et.id, event_type_name: et.name, color: et.color, count };
  });

  return {
    total_events,
    events_this_month,
    upcoming_events,
    total_teachers: db.teachers.length,
    total_departments: db.departments.length,
    department_breakdown,
    event_type_breakdown
  };
}
