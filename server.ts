import express from 'express';
import path from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import * as xlsx from 'xlsx';
import { createServer as createViteServer } from 'vite';

import {
  loadDB,
  getAcademicYears,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getEventTypes,
  createEventType,
  updateEventType,
  deleteEventType,
  getTeachers,
  getTeacherById,
  getTeacherByEmail,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  seedImportEvents,
  getDashboardStats,
  VALID_VENUES,
  VenueType,
  checkVenueAvailability
} from './src/server/db.js';

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'academic-calendar-secret-jwt-key-2026';

app.use(express.json({ limit: '10mb' }));

// Express Middleware for JWT Auth
export interface AuthenticatedRequest extends express.Request {
  user?: {
    id: number;
    email: string;
    role: 'admin' | 'teacher';
    department_id: number;
    first_name: string;
    last_name: string;
  };
}

const authenticateToken = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = decoded;
    next();
  });
};

const requireAdmin = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  next();
};

/**
 * AUTHENTICATION ENDPOINTS
 */

// POST /api/auth/register
app.post('/api/auth/register', (req, res) => {
  try {
    const { first_name, last_name, email, password, department_id, phone } = req.body;

    if (!first_name || !last_name || !email || !password || !department_id) {
      return res.status(400).json({ error: 'Missing required registration fields' });
    }

    const existing = getTeacherByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'A teacher with this email already exists' });
    }

    const teacher = createTeacher({
      first_name,
      last_name,
      email,
      phone: phone || '',
      department_id: Number(department_id),
      role: 'teacher',
      password: password
    });

    const token = jwt.sign(
      {
        id: teacher.id,
        email: teacher.email,
        role: teacher.role,
        department_id: teacher.department_id,
        first_name: teacher.first_name,
        last_name: teacher.last_name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: teacher.id,
        email: teacher.email,
        first_name: teacher.first_name,
        last_name: teacher.last_name,
        role: teacher.role,
        department_id: teacher.department_id
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const teacher = getTeacherByEmail(email);
    if (!teacher) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = bcrypt.compareSync(password, teacher.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      {
        id: teacher.id,
        email: teacher.email,
        role: teacher.role,
        department_id: teacher.department_id,
        first_name: teacher.first_name,
        last_name: teacher.last_name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: teacher.id,
        email: teacher.email,
        first_name: teacher.first_name,
        last_name: teacher.last_name,
        role: teacher.role,
        department_id: teacher.department_id
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const teacher = getTeacherById(req.user.id);
    if (!teacher) return res.status(404).json({ error: 'User not found' });
    
    res.json({
      id: teacher.id,
      email: teacher.email,
      first_name: teacher.first_name,
      last_name: teacher.last_name,
      role: teacher.role,
      department_id: teacher.department_id,
      phone: teacher.phone
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// PUT /api/auth/profile
app.put('/api/auth/profile', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { first_name, last_name, phone, email } = req.body;
    
    if (email && email.toLowerCase() !== req.user.email.toLowerCase()) {
      const existing = getTeacherByEmail(email);
      if (existing) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    const updated = updateTeacher(req.user.id, { first_name, last_name, phone, email });
    if (!updated) return res.status(404).json({ error: 'Teacher not found' });

    res.json({
      id: updated.id,
      email: updated.email,
      first_name: updated.first_name,
      last_name: updated.last_name,
      role: updated.role,
      department_id: updated.department_id,
      phone: updated.phone
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// PUT /api/auth/password
app.put('/api/auth/password', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    const teacher = getTeacherById(req.user.id);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

    const isValid = bcrypt.compareSync(current_password, teacher.password_hash);
    if (!isValid) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    updateTeacher(req.user.id, { password: new_password });
    res.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error' });
  }
});


/**
 * PUBLIC/SHARED REFERENCE DATA ENDPOINTS
 */

// GET /api/departments
app.get('/api/departments', (req, res) => {
  res.json(getDepartments());
});

// GET /api/academic-years
app.get('/api/academic-years', (req, res) => {
  res.json(getAcademicYears());
});

// GET /api/event-types
app.get('/api/event-types', (req, res) => {
  res.json(getEventTypes());
});


/**
 * EVENT ENDPOINTS (PUBLIC READ, AUTHENTICATED WRITE)
 */

// GET /api/events (Filtering & Search)
app.get('/api/events', (req, res) => {
  try {
    const { department_id, event_type_id, academic_year_id, venue, search, start_date, end_date } = req.query;

    let events = getEvents();

    if (department_id) {
      events = events.filter(e => e.department_id === Number(department_id));
    }
    if (event_type_id) {
      events = events.filter(e => e.event_type_id === Number(event_type_id));
    }
    if (academic_year_id) {
      events = events.filter(e => e.academic_year_id === Number(academic_year_id));
    }
    if (venue) {
      events = events.filter(e => e.venue === String(venue));
    }
    if (start_date) {
      events = events.filter(e => e.date >= String(start_date));
    }
    if (end_date) {
      events = events.filter(e => e.date <= String(end_date));
    }
    if (search) {
      const q = String(search).toLowerCase();
      events = events.filter(e => 
        e.name.toLowerCase().includes(q) || 
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.class_section && e.class_section.toLowerCase().includes(q)) ||
        (e.venue && e.venue.toLowerCase().includes(q))
      );
    }

    // Sort by date ascending, then start_time
    events.sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      return (a.start_time || '').localeCompare(b.start_time || '');
    });

    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// GET /api/events/check-availability
app.get('/api/events/check-availability', (req, res) => {
  try {
    const { venue, date, start_time, end_time, exclude_id } = req.query;
    if (!venue || !date || !start_time || !end_time) {
      return res.status(400).json({ error: 'venue, date, start_time, and end_time are required' });
    }

    if (!VALID_VENUES.includes(venue as VenueType)) {
      return res.status(400).json({ error: 'Invalid venue. Must be Auditorium, AV room, Sanctuary, or Classroom' });
    }

    const check = checkVenueAvailability(
      String(venue),
      String(date),
      String(start_time),
      String(end_time),
      exclude_id ? Number(exclude_id) : undefined
    );

    res.json(check);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// GET /api/events/:id
app.get('/api/events/:id', (req, res) => {
  try {
    const event = getEventById(Number(req.params.id));
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// POST /api/events
app.post('/api/events', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { 
      name, 
      academic_year_id, 
      date, 
      department_id, 
      class_section, 
      event_type_id, 
      description,
      venue,
      start_time,
      end_time
    } = req.body;

    if (!name || !academic_year_id || !date || !department_id || !event_type_id) {
      return res.status(400).json({ error: 'Missing required event fields' });
    }

    const assignedVenue = (venue || 'Classroom') as VenueType;
    if (!VALID_VENUES.includes(assignedVenue)) {
      return res.status(400).json({ error: 'Venue must be Auditorium, AV room, Sanctuary, or Classroom' });
    }

    const assignedStart = start_time || '09:00';
    const assignedEnd = end_time || '10:00';

    // Check venue availability and timing conflicts
    const availability = checkVenueAvailability(assignedVenue, date, assignedStart, assignedEnd);
    if (!availability.available) {
      return res.status(400).json({ error: availability.conflictMessage });
    }

    // Auth constraints: Teachers can only create events for their own department
    if (req.user.role === 'teacher' && req.user.department_id !== Number(department_id)) {
      return res.status(403).json({ error: 'You can only create events for your own department' });
    }

    const newEvent = createEvent({
      name,
      academic_year_id: Number(academic_year_id),
      date,
      teacher_id: req.user.id, // Creator
      department_id: Number(department_id),
      class_section: class_section || 'All Batches',
      event_type_id: Number(event_type_id),
      description: description || '',
      venue: assignedVenue,
      start_time: assignedStart,
      end_time: assignedEnd
    });

    res.status(201).json(getEventById(newEvent.id));
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// PUT /api/events/:id
app.put('/api/events/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const id = Number(req.params.id);
    const existing = getEventById(id);

    if (!existing) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const targetVenue = req.body.venue || existing.venue;
    const targetDate = req.body.date || existing.date;
    const targetStart = req.body.start_time || existing.start_time;
    const targetEnd = req.body.end_time || existing.end_time;

    if (req.body.venue && !VALID_VENUES.includes(req.body.venue)) {
      return res.status(400).json({ error: 'Venue must be Auditorium, AV room, Sanctuary, or Classroom' });
    }

    // Check availability excluding the event being updated
    const availability = checkVenueAvailability(targetVenue, targetDate, targetStart, targetEnd, id);
    if (!availability.available) {
      return res.status(400).json({ error: availability.conflictMessage });
    }

    const updated = updateEvent(id, req.body);
    if (!updated) return res.status(500).json({ error: 'Failed to update event' });

    res.json(getEventById(updated.id));
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// DELETE /api/events/:id
app.delete('/api/events/:id', authenticateToken, (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const id = Number(req.params.id);
    const existing = getEventById(id);

    if (!existing) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Auth constraints: Teachers can delete events for their own department or created by them
    if (req.user.role === 'teacher') {
      const isCreator = Number(existing.teacher_id) === Number(req.user.id);
      const isSameDept = Number(existing.department_id) === Number(req.user.department_id);
      if (!isCreator && !isSameDept) {
        return res.status(403).json({ error: 'You do not have permission to delete events from other departments' });
      }
    }

    const success = deleteEvent(id);
    if (!success) return res.status(500).json({ error: 'Failed to delete event' });

    res.json({ message: 'Event deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error' });
  }
});


/**
 * ADMIN-ONLY CRUD & EXCEL IMPORT ENDPOINTS
 */

// POST /api/admin/import-excel (Base64 or JSON rows)
app.post('/api/admin/import-excel', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { file_base64, events_list } = req.body;

    let parsedEvents: Array<{ name: string; date: string; description?: string }> = [];

    if (events_list && Array.isArray(events_list)) {
      parsedEvents = events_list;
    } else if (file_base64) {
      const buffer = Buffer.from(file_base64, 'base64');
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows: any[] = xlsx.utils.sheet_to_json(worksheet);

      // Legacy format columns: Day, Date, Business
      for (const row of rawRows) {
        const name = row.Business || row.Event || row.name || row.Description || '';
        let dateVal = row.Date || row.date || '';

        // Handle Excel date numbers if needed
        if (typeof dateVal === 'number') {
          const dateObj = xlsx.SSF.parse_date_code(dateVal);
          if (dateObj) {
            dateVal = `${dateObj.y}-${String(dateObj.m).padStart(2, '0')}-${String(dateObj.d).padStart(2, '0')}`;
          }
        } else if (dateVal) {
          // Parse string date to YYYY-MM-DD
          const d = new Date(dateVal);
          if (!isNaN(d.getTime())) {
            dateVal = d.toISOString().split('T')[0];
          }
        }

        if (name && dateVal) {
          parsedEvents.push({
            name: String(name).trim(),
            date: String(dateVal).trim(),
            description: row.Description ? String(row.Description).trim() : String(name).trim()
          });
        }
      }
    }

    if (parsedEvents.length === 0) {
      return res.status(400).json({ error: 'No valid events found in spreadsheet or payload' });
    }

    const count = seedImportEvents(parsedEvents);
    res.json({ message: `Successfully imported ${count} events`, count });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error processing Excel import' });
  }
});

// --- DEPARTMENTS ADMIN ---
app.post('/api/admin/departments', authenticateToken, requireAdmin, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  res.status(201).json(createDepartment(name));
});

app.put('/api/admin/departments/:id', authenticateToken, requireAdmin, (req, res) => {
  const { name } = req.body;
  const id = Number(req.params.id);
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const updated = updateDepartment(id, name);
  if (!updated) return res.status(404).json({ error: 'Department not found' });
  res.json(updated);
});

app.delete('/api/admin/departments/:id', authenticateToken, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const success = deleteDepartment(id);
  if (!success) {
    return res.status(400).json({ error: 'Cannot delete department. At least one department must remain.' });
  }
  res.json({ message: 'Department deleted successfully' });
});


// --- ACADEMIC YEARS ADMIN ---
app.post('/api/admin/academic-years', authenticateToken, requireAdmin, (req, res) => {
  const { year } = req.body;
  if (!year) return res.status(400).json({ error: 'Year is required' });
  res.status(201).json(createAcademicYear(year));
});

app.put('/api/admin/academic-years/:id', authenticateToken, requireAdmin, (req, res) => {
  const { year } = req.body;
  const id = Number(req.params.id);
  if (!year) return res.status(400).json({ error: 'Year is required' });
  const updated = updateAcademicYear(id, year);
  if (!updated) return res.status(404).json({ error: 'Academic year not found' });
  res.json(updated);
});

app.delete('/api/admin/academic-years/:id', authenticateToken, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const success = deleteAcademicYear(id);
  if (!success) {
    return res.status(400).json({ error: 'Cannot delete academic year. At least one academic year must remain.' });
  }
  res.json({ message: 'Academic year deleted successfully' });
});


// --- EVENT TYPES ADMIN ---
app.post('/api/admin/event-types', authenticateToken, requireAdmin, (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  res.status(201).json(createEventType(name, color || '#6B7280'));
});

app.put('/api/admin/event-types/:id', authenticateToken, requireAdmin, (req, res) => {
  const { name, color } = req.body;
  const id = Number(req.params.id);
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const updated = updateEventType(id, name, color || '#6B7280');
  if (!updated) return res.status(404).json({ error: 'Event type not found' });
  res.json(updated);
});

app.delete('/api/admin/event-types/:id', authenticateToken, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const success = deleteEventType(id);
  if (!success) {
    return res.status(400).json({ error: 'Cannot delete event category. At least one category must remain.' });
  }
  res.json({ message: 'Event category deleted successfully' });
});


// --- TEACHERS ADMIN ---
app.get('/api/admin/teachers', authenticateToken, requireAdmin, (req, res) => {
  res.json(getTeachers());
});

app.post('/api/admin/teachers', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { first_name, last_name, email, phone, department_id, role, password } = req.body;
    if (!first_name || !last_name || !email || !department_id || !role) {
      return res.status(400).json({ error: 'Missing required teacher fields' });
    }

    const existing = getTeacherByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'Teacher with this email already exists' });
    }

    const newTeacher = createTeacher({
      first_name,
      last_name,
      email,
      phone: phone || '',
      department_id: Number(department_id),
      role,
      password: password || 'teacherpassword'
    });

    res.status(201).json(newTeacher);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

app.put('/api/admin/teachers/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const id = Number(req.params.id);
    const updated = updateTeacher(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Teacher not found' });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

app.delete('/api/admin/teachers/:id', authenticateToken, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const success = deleteTeacher(id);
  if (!success) {
    return res.status(400).json({ error: 'Cannot delete teacher. Ensure they are not the last administrator.' });
  }
  res.json({ message: 'Teacher deleted successfully' });
});


// --- DASHBOARD METRICS ---
app.get('/api/admin/stats', authenticateToken, requireAdmin, (req, res) => {
  res.json(getDashboardStats());
});


/**
 * FRONTEND BUILD & VITE HANDLING (Production vs Development)
 */
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Academic Calendar Server running on http://localhost:${PORT}`);
  });
}

startServer();
