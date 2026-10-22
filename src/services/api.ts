import {
  AcademicYear,
  Department,
  EventType,
  CalendarEvent,
  Teacher,
  UserSession,
  DashboardStats,
  VenueType
} from '../types';

const TOKEN_KEY = 'academic_calendar_jwt_token';
const USER_KEY = 'academic_calendar_user_info';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string, user: UserSession) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function removeStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): UserSession | null {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data as T;
}

// AUTH API
export async function loginUser(email: string, password: string): Promise<{ token: string; user: UserSession }> {
  const res = await request<{ token: string; user: UserSession }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  setStoredToken(res.token, res.user);
  return res;
}

export async function registerUser(data: {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  department_id: number;
  phone?: string;
}): Promise<{ token: string; user: UserSession }> {
  const res = await request<{ token: string; user: UserSession }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  setStoredToken(res.token, res.user);
  return res;
}

export async function fetchCurrentUser(): Promise<Teacher> {
  return request<Teacher>('/api/auth/me');
}

export async function updateProfile(data: {
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
}): Promise<UserSession> {
  const res = await request<UserSession>('/api/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  const current = getStoredUser();
  if (current) {
    const updated = { ...current, ...res };
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
  }
  return res;
}

export async function changePassword(data: {
  current_password: string;
  new_password: string;
}): Promise<{ message: string }> {
  return request<{ message: string }>('/api/auth/password', {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

// REFERENCE DATA API
export async function fetchDepartments(): Promise<Department[]> {
  return request<Department[]>('/api/departments');
}

export async function fetchAcademicYears(): Promise<AcademicYear[]> {
  return request<AcademicYear[]>('/api/academic-years');
}

export async function fetchEventTypes(): Promise<EventType[]> {
  return request<EventType[]>('/api/event-types');
}

// EVENTS API
export async function fetchEvents(params?: {
  department_id?: number | string;
  event_type_id?: number | string;
  academic_year_id?: number | string;
  venue?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
}): Promise<CalendarEvent[]> {
  const urlParams = new URLSearchParams();
  if (params?.department_id) urlParams.append('department_id', String(params.department_id));
  if (params?.event_type_id) urlParams.append('event_type_id', String(params.event_type_id));
  if (params?.academic_year_id) urlParams.append('academic_year_id', String(params.academic_year_id));
  if (params?.venue) urlParams.append('venue', params.venue);
  if (params?.search) urlParams.append('search', params.search);
  if (params?.start_date) urlParams.append('start_date', params.start_date);
  if (params?.end_date) urlParams.append('end_date', params.end_date);

  const query = urlParams.toString();
  return request<CalendarEvent[]>(`/api/events${query ? `?${query}` : ''}`);
}

export async function checkVenueAvailabilityAPI(params: {
  venue: string;
  date: string;
  start_time: string;
  end_time: string;
  exclude_id?: number;
}): Promise<{ available: boolean; conflictMessage?: string; conflictEndTime?: string }> {
  const urlParams = new URLSearchParams({
    venue: params.venue,
    date: params.date,
    start_time: params.start_time,
    end_time: params.end_time
  });
  if (params.exclude_id) {
    urlParams.append('exclude_id', String(params.exclude_id));
  }
  return request<{ available: boolean; conflictMessage?: string; conflictEndTime?: string }>(
    `/api/events/check-availability?${urlParams.toString()}`
  );
}

export async function fetchEventById(id: number): Promise<CalendarEvent> {
  return request<CalendarEvent>(`/api/events/${id}`);
}

export async function createEvent(data: {
  name: string;
  academic_year_id: number;
  date: string;
  department_id: number;
  class_section?: string;
  event_type_id: number;
  description?: string;
  venue: VenueType;
  start_time: string;
  end_time: string;
}): Promise<CalendarEvent> {
  return request<CalendarEvent>('/api/events', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateEvent(id: number, data: Partial<CalendarEvent>): Promise<CalendarEvent> {
  return request<CalendarEvent>(`/api/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function deleteEvent(id: number): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/events/${id}`, {
    method: 'DELETE'
  });
}

// ADMIN API
export async function fetchAdminStats(): Promise<DashboardStats> {
  return request<DashboardStats>('/api/admin/stats');
}

export async function fetchAdminTeachers(): Promise<Teacher[]> {
  return request<Teacher[]>('/api/admin/teachers');
}

export async function createAdminTeacher(data: {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  department_id: number;
  role: 'admin' | 'teacher';
  password?: string;
}): Promise<Teacher> {
  return request<Teacher>('/api/admin/teachers', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateAdminTeacher(id: number, data: Partial<Teacher>): Promise<Teacher> {
  return request<Teacher>(`/api/admin/teachers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function deleteAdminTeacher(id: number): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/admin/teachers/${id}`, {
    method: 'DELETE'
  });
}

export async function createAdminDepartment(name: string): Promise<Department> {
  return request<Department>('/api/admin/departments', {
    method: 'POST',
    body: JSON.stringify({ name })
  });
}

export async function updateAdminDepartment(id: number, name: string): Promise<Department> {
  return request<Department>(`/api/admin/departments/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name })
  });
}

export async function deleteAdminDepartment(id: number): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/admin/departments/${id}`, {
    method: 'DELETE'
  });
}

export async function createAdminAcademicYear(year: string): Promise<AcademicYear> {
  return request<AcademicYear>('/api/admin/academic-years', {
    method: 'POST',
    body: JSON.stringify({ year })
  });
}

export async function updateAdminAcademicYear(id: number, year: string): Promise<AcademicYear> {
  return request<AcademicYear>(`/api/admin/academic-years/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ year })
  });
}

export async function deleteAdminAcademicYear(id: number): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/admin/academic-years/${id}`, {
    method: 'DELETE'
  });
}

export async function createAdminEventType(name: string, color: string): Promise<EventType> {
  return request<EventType>('/api/admin/event-types', {
    method: 'POST',
    body: JSON.stringify({ name, color })
  });
}

export async function updateAdminEventType(id: number, name: string, color: string): Promise<EventType> {
  return request<EventType>(`/api/admin/event-types/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name, color })
  });
}

export async function deleteAdminEventType(id: number): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/admin/event-types/${id}`, {
    method: 'DELETE'
  });
}

export async function importExcelEvents(fileBase64?: string, eventsList?: any[]): Promise<{ message: string; count: number }> {
  return request<{ message: string; count: number }>('/api/admin/import-excel', {
    method: 'POST',
    body: JSON.stringify({ file_base64: fileBase64, events_list: eventsList })
  });
}
