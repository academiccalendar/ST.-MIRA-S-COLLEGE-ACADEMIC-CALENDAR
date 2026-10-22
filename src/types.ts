export interface AcademicYear {
  id: number;
  year: string;
}

export interface Department {
  id: number;
  name: string;
}

export interface Teacher {
  id: number;
  first_name: string;
  last_name: string;
  department_id: number;
  phone: string;
  email: string;
  role: 'admin' | 'teacher';
  department_name?: string;
}

export interface EventType {
  id: number;
  name: string;
  color: string;
}

export type VenueType = 'Auditorium' | 'AV room' | 'Sanctuary' | 'Classroom';

export const VENUE_OPTIONS: VenueType[] = [
  'Auditorium',
  'AV room',
  'Sanctuary',
  'Classroom'
];

export interface CalendarEvent {
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
  start_time: string; // HH:mm
  end_time: string;   // HH:mm
  
  // Joined fields for easy display
  academic_year_name?: string;
  department_name?: string;
  teacher_name?: string;
  event_type_name?: string;
  event_type_color?: string;
}

export interface UserSession {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'teacher';
  department_id: number;
}

export interface DashboardStats {
  total_events: number;
  events_this_month: number;
  upcoming_events: number;
  total_teachers: number;
  total_departments: number;
  department_breakdown: { department_id: number; department_name: string; count: number }[];
  event_type_breakdown: { event_type_id: number; event_type_name: string; color: string; count: number }[];
}
