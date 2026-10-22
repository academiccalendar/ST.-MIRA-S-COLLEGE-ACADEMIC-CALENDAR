import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, 
  Building, 
  Calendar, 
  Users, 
  Tag, 
  Upload, 
  Plus, 
  Trash2, 
  Edit, 
  Check, 
  AlertCircle, 
  BarChart2, 
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Clock,
  MapPin,
  Search,
  Filter,
  X
} from 'lucide-react';
import { 
  AcademicYear, 
  Department, 
  EventType, 
  Teacher, 
  DashboardStats,
  CalendarEvent 
} from '../types';

import {
  fetchAdminStats,
  fetchAdminTeachers,
  createAdminDepartment,
  updateAdminDepartment,
  deleteAdminDepartment,
  createAdminAcademicYear,
  updateAdminAcademicYear,
  deleteAdminAcademicYear,
  createAdminEventType,
  updateAdminEventType,
  deleteAdminEventType,
  createAdminTeacher,
  updateAdminTeacher,
  deleteAdminTeacher,
  deleteEvent,
  importExcelEvents
} from '../services/api';

interface AdminDashboardProps {
  departments: Department[];
  academicYears: AcademicYear[];
  eventTypes: EventType[];
  events?: CalendarEvent[];
  onRefreshData: () => void;
  onDeleteEvent?: (id: number) => Promise<void>;
  onEditEvent?: (event: CalendarEvent) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  departments,
  academicYears,
  eventTypes,
  events = [],
  onRefreshData,
  onDeleteEvent,
  onEditEvent
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'events' | 'departments' | 'years' | 'categories' | 'teachers' | 'import'>('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [teachersList, setTeachersList] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [confirmDialogError, setConfirmDialogError] = useState<string | null>(null);
  const [isConfirmProcessing, setIsConfirmProcessing] = useState(false);

  // Event search in Admin Events tab
  const [eventSearch, setEventSearch] = useState('');
  const [eventDeptFilter, setEventDeptFilter] = useState<string>('all');

  // Form states
  const [newDeptName, setNewDeptName] = useState('');
  const [newYearName, setNewYearName] = useState('');
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#3b82f6');

  // Teacher Creation Form
  const [tFirstName, setTFirstName] = useState('');
  const [tLastName, setTLastName] = useState('');
  const [tEmail, setTEmail] = useState('');
  const [tPhone, setTPhone] = useState('');
  const [tDepartmentId, setTDepartmentId] = useState<number>(departments[0]?.id || 1);
  const [tRole, setTRole] = useState<'admin' | 'teacher'>('teacher');
  const [tPassword, setTPassword] = useState('teacher123');

  // Excel Upload State
  const [importing, setImporting] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);

  // Inline edit states
  const [editingDeptId, setEditingDeptId] = useState<number | null>(null);
  const [editingDeptName, setEditingDeptName] = useState('');

  const [editingYearId, setEditingYearId] = useState<number | null>(null);
  const [editingYearName, setEditingYearName] = useState('');

  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [editingCatColor, setEditingCatColor] = useState('#3b82f6');

  // Teacher Edit modal state
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editTFirstName, setEditTFirstName] = useState('');
  const [editTLastName, setEditTLastName] = useState('');
  const [editTEmail, setEditTEmail] = useState('');
  const [editTPhone, setEditTPhone] = useState('');
  const [editTDeptId, setEditTDeptId] = useState<number>(1);
  const [editTRole, setEditTRole] = useState<'admin' | 'teacher'>('teacher');
  const [editTPassword, setEditTPassword] = useState('');
  const [isUpdatingTeacher, setIsUpdatingTeacher] = useState(false);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [s, t] = await Promise.all([
        fetchAdminStats(),
        fetchAdminTeachers()
      ]);
      setStats(s);
      setTeachersList(t);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to load admin dashboard data' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // HANDLERS FOR DEPARTMENTS
  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    try {
      await createAdminDepartment(newDeptName.trim());
      setNewDeptName('');
      showFeedback('success', 'Department created successfully');
      onRefreshData();
      loadAdminData();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const handleDeleteDepartment = (id: number) => {
    setConfirmDialog({
      title: 'Delete Department',
      message: 'Are you sure you want to delete this department? Ensure no teachers or events reference it.',
      onConfirm: async () => {
        await deleteAdminDepartment(id);
        showFeedback('success', 'Department deleted');
        onRefreshData();
        loadAdminData();
      }
    });
  };

  const handleSaveEditDept = async (id: number) => {
    if (!editingDeptName.trim()) return;
    try {
      await updateAdminDepartment(id, editingDeptName.trim());
      setEditingDeptId(null);
      showFeedback('success', 'Department updated successfully');
      onRefreshData();
      loadAdminData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to update department');
    }
  };

  // HANDLERS FOR ACADEMIC YEARS
  const handleAddAcademicYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newYearName.trim()) return;
    try {
      await createAdminAcademicYear(newYearName.trim());
      setNewYearName('');
      showFeedback('success', 'Academic Year added successfully');
      onRefreshData();
      loadAdminData();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const handleDeleteAcademicYear = (id: number) => {
    setConfirmDialog({
      title: 'Delete Academic Year',
      message: 'Are you sure you want to delete this academic year? Ensure no events reference it.',
      onConfirm: async () => {
        await deleteAdminAcademicYear(id);
        showFeedback('success', 'Academic year deleted');
        onRefreshData();
        loadAdminData();
      }
    });
  };

  const handleSaveEditYear = async (id: number) => {
    if (!editingYearName.trim()) return;
    try {
      await updateAdminAcademicYear(id, editingYearName.trim());
      setEditingYearId(null);
      showFeedback('success', 'Academic year updated successfully');
      onRefreshData();
      loadAdminData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to update academic year');
    }
  };

  // HANDLERS FOR CATEGORIES (EVENT TYPES)
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      await createAdminEventType(newCategoryName.trim(), newCategoryColor);
      setNewCategoryName('');
      showFeedback('success', 'Event category created');
      onRefreshData();
      loadAdminData();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const handleDeleteCategory = (id: number) => {
    setConfirmDialog({
      title: 'Delete Event Category',
      message: 'Are you sure you want to delete this category? Ensure no events reference it.',
      onConfirm: async () => {
        await deleteAdminEventType(id);
        showFeedback('success', 'Event category deleted');
        onRefreshData();
        loadAdminData();
      }
    });
  };

  const handleSaveEditCat = async (id: number) => {
    if (!editingCatName.trim()) return;
    try {
      await updateAdminEventType(id, editingCatName.trim(), editingCatColor);
      setEditingCatId(null);
      showFeedback('success', 'Event category updated successfully');
      onRefreshData();
      loadAdminData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to update category');
    }
  };

  // HANDLERS FOR TEACHERS
  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tFirstName || !tLastName || !tEmail) return;
    try {
      await createAdminTeacher({
        first_name: tFirstName.trim(),
        last_name: tLastName.trim(),
        email: tEmail.trim(),
        phone: tPhone.trim(),
        department_id: Number(tDepartmentId),
        role: tRole,
        password: tPassword || 'teacher123'
      });
      setTFirstName('');
      setTLastName('');
      setTEmail('');
      setTPhone('');
      showFeedback('success', 'Teacher registered successfully');
      loadAdminData();
    } catch (err: any) {
      showFeedback('error', err.message);
    }
  };

  const handleDeleteTeacher = (id: number) => {
    setConfirmDialog({
      title: 'Delete Faculty Account',
      message: 'Are you sure you want to delete this faculty account?',
      onConfirm: async () => {
        await deleteAdminTeacher(id);
        showFeedback('success', 'Teacher account deleted');
        loadAdminData();
      }
    });
  };

  const handleOpenEditTeacher = (t: Teacher) => {
    setEditingTeacher(t);
    setEditTFirstName(t.first_name);
    setEditTLastName(t.last_name);
    setEditTEmail(t.email);
    setEditTPhone(t.phone || '');
    setEditTDeptId(t.department_id);
    setEditTRole(t.role);
    setEditTPassword('');
  };

  const handleSaveEditTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;
    if (!editTFirstName.trim() || !editTLastName.trim() || !editTEmail.trim()) {
      showFeedback('error', 'First name, last name, and email are required');
      return;
    }
    setIsUpdatingTeacher(true);
    try {
      await updateAdminTeacher(editingTeacher.id, {
        first_name: editTFirstName.trim(),
        last_name: editTLastName.trim(),
        email: editTEmail.trim(),
        phone: editTPhone.trim(),
        department_id: Number(editTDeptId),
        role: editTRole,
        ...(editTPassword.trim() ? { password: editTPassword.trim() } : {})
      });
      setEditingTeacher(null);
      showFeedback('success', 'Faculty account updated successfully');
      loadAdminData();
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to update faculty account');
    } finally {
      setIsUpdatingTeacher(false);
    }
  };

  const handleDeleteEventFromAdmin = (event: CalendarEvent) => {
    setConfirmDialog({
      title: 'Delete Event',
      message: `Are you sure you want to delete "${event.name}" scheduled for ${event.date} (${event.venue || 'Classroom'})? This action cannot be undone.`,
      onConfirm: async () => {
        if (onDeleteEvent) {
          await onDeleteEvent(event.id);
        } else {
          await deleteEvent(event.id);
        }
        showFeedback('success', 'Event deleted successfully');
        onRefreshData();
        loadAdminData();
      }
    });
  };

  const filteredAdminEvents = useMemo(() => {
    return events.filter(ev => {
      const matchSearch = !eventSearch.trim() || 
        ev.name.toLowerCase().includes(eventSearch.toLowerCase()) ||
        (ev.description && ev.description.toLowerCase().includes(eventSearch.toLowerCase())) ||
        (ev.venue && ev.venue.toLowerCase().includes(eventSearch.toLowerCase())) ||
        (ev.class_section && ev.class_section.toLowerCase().includes(eventSearch.toLowerCase()));

      const matchDept = eventDeptFilter === 'all' || String(ev.department_id) === String(eventDeptFilter);

      return matchSearch && matchDept;
    });
  }, [events, eventSearch, eventDeptFilter]);

  // EXCEL IMPORT HANDLER
  const handleExcelImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!excelFile) {
      showFeedback('error', 'Please select an Excel (.xlsx) file first');
      return;
    }

    setImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const base64Str = (evt.target?.result as string).split(',')[1];
        try {
          const res = await importExcelEvents(base64Str);
          showFeedback('success', res.message);
          setExcelFile(null);
          onRefreshData();
          loadAdminData();
        } catch (err: any) {
          showFeedback('error', err.message);
        } finally {
          setImporting(false);
        }
      };
      reader.readAsDataURL(excelFile);
    } catch (err: any) {
      showFeedback('error', err.message || 'File processing error');
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Admin Title Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Shield className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-bold font-serif">College Institutional Admin Panel</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Full administrative control over college academic years, departments, faculty accounts, categories, and bulk event seeding.
          </p>
        </div>

        <button
          onClick={loadAdminData}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition self-start md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {feedbackMsg && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center space-x-2 border ${
          feedbackMsg.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Admin Navigation Tabs */}
      <div className="flex items-center space-x-1 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeSubTab === 'overview' ? 'bg-amber-500 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Dashboard Overview</span>
        </button>

        <button
          onClick={() => setActiveSubTab('events')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeSubTab === 'events' ? 'bg-amber-500 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>All Events ({events.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('departments')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeSubTab === 'departments' ? 'bg-amber-500 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Departments ({departments.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('years')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeSubTab === 'years' ? 'bg-amber-500 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Academic Years ({academicYears.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('categories')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeSubTab === 'categories' ? 'bg-amber-500 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Event Categories ({eventTypes.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('teachers')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeSubTab === 'teachers' ? 'bg-amber-500 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Teachers ({teachersList.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('import')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeSubTab === 'import' ? 'bg-amber-500 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Import Excel Seed</span>
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Events</span>
                <p className="text-2xl font-extrabold text-slate-900">{stats?.total_events || 0}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">This Month</span>
                <p className="text-2xl font-extrabold text-slate-900">{stats?.events_this_month || 0}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Teachers</span>
                <p className="text-2xl font-extrabold text-slate-900">{stats?.total_teachers || 0}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Departments</span>
                <p className="text-2xl font-extrabold text-slate-900">{stats?.total_departments || 0}</p>
              </div>
            </div>
          </div>

          {/* Breakdown Charts / Progress Bars */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Department Breakdown */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 font-serif">Events per Department</h3>
              <div className="space-y-3">
                {stats?.department_breakdown.map((d) => {
                  const percentage = stats.total_events > 0 
                    ? Math.round((d.count / stats.total_events) * 100) 
                    : 0;

                  return (
                    <div key={d.department_id} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>{d.department_name}</span>
                        <span>{d.count} events ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(percentage, 4)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 font-serif">Event Category Distribution</h3>
              <div className="space-y-3">
                {stats?.event_type_breakdown.map((et) => {
                  const percentage = stats.total_events > 0 
                    ? Math.round((et.count / stats.total_events) * 100) 
                    : 0;

                  return (
                    <div key={et.event_type_id} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: et.color }} />
                          {et.event_type_name}
                        </span>
                        <span>{et.count} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${Math.max(percentage, 4)}%`,
                            backgroundColor: et.color 
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ALL EVENTS MANAGEMENT TAB */}
      {activeSubTab === 'events' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-serif">College Scheduled Events</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage, inspect, or delete scheduled events across all departments and academic years.
              </p>
            </div>

            {/* Search & Department Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search events, venue..."
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 w-48 sm:w-56"
                />
              </div>

              <select
                value={eventDeptFilter}
                onChange={(e) => setEventDeptFilter(e.target.value)}
                className="py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          {filteredAdminEvents.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Calendar className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-xs font-semibold">No college events found matching filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase">
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Venue</th>
                    <th className="py-3 px-4">Event Title</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Target Class</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAdminEvents.map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        <div>{ev.date}</div>
                        <div className="text-[10px] font-normal text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{ev.start_time || '09:00'} – {ev.end_time || '10:00'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-900 border border-blue-200">
                          <MapPin className="w-3 h-3 text-blue-600" />
                          <span>{ev.venue || 'Classroom'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800 max-w-xs">
                        <p className="truncate">{ev.name}</p>
                        {ev.description && (
                          <p className="text-[10px] text-slate-400 truncate font-normal mt-0.5">
                            {ev.description}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap font-medium">
                        {ev.department_name || 'College Overall'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold border"
                          style={{
                            backgroundColor: `${ev.event_type_color}15`,
                            color: ev.event_type_color,
                            borderColor: `${ev.event_type_color}30`
                          }}
                        >
                          {ev.event_type_name}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                          {ev.class_section || 'All Batches'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                        {onEditEvent && (
                          <button
                            onClick={() => onEditEvent(ev)}
                            className="px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-xs font-bold border border-amber-200 transition"
                          >
                            Edit
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteEventFromAdmin(ev)}
                          className="px-2.5 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-bold border border-red-200 transition inline-flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* DEPARTMENTS TAB */}
      {activeSubTab === 'departments' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Add Department */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 font-serif">Create Department</h3>
            <form onSubmit={handleAddDepartment} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Department Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mathematics & Statistics"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add Department</span>
              </button>
            </form>
          </div>

          {/* Department List */}
          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 font-bold text-sm text-slate-800">
              College Departments ({departments.length})
            </div>
            <ul className="divide-y divide-slate-100">
              {departments.map((d) => (
                <li key={d.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50/50">
                  {editingDeptId === d.id ? (
                    <div className="flex-1 flex items-center space-x-2 mr-3">
                      <input
                        type="text"
                        value={editingDeptName}
                        onChange={(e) => setEditingDeptName(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-amber-400 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEditDept(d.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Update</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingDeptId(null)}
                        className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="font-semibold text-sm text-slate-800">{d.name}</span>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDeptId(d.id);
                            setEditingDeptName(d.name);
                          }}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          title="Edit Department"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDepartment(d.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete Department"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ACADEMIC YEARS TAB */}
      {activeSubTab === 'years' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 font-serif">Add Academic Year</h3>
            <form onSubmit={handleAddAcademicYear} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Academic Year</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026-2027"
                  value={newYearName}
                  onChange={(e) => setNewYearName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add Academic Year</span>
              </button>
            </form>
          </div>

          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 font-bold text-sm text-slate-800">
              Configured Academic Sessions ({academicYears.length})
            </div>
            <ul className="divide-y divide-slate-100">
              {academicYears.map((ay) => (
                <li key={ay.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50/50">
                  {editingYearId === ay.id ? (
                    <div className="flex-1 flex items-center space-x-2 mr-3">
                      <input
                        type="text"
                        value={editingYearName}
                        onChange={(e) => setEditingYearName(e.target.value)}
                        placeholder="e.g. 2026-2027"
                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-amber-400 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEditYear(ay.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Update</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingYearId(null)}
                        className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="font-bold text-sm text-slate-900">AY {ay.year}</span>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingYearId(ay.id);
                            setEditingYearName(ay.year);
                          }}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          title="Edit Academic Year"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAcademicYear(ay.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete Academic Year"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* CATEGORIES TAB */}
      {activeSubTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 font-serif">Add Event Category</h3>
            <form onSubmit={handleAddCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Workshop / Seminar"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Badge Color</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={newCategoryColor}
                    onChange={(e) => setNewCategoryColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={newCategoryColor}
                    onChange={(e) => setNewCategoryColor(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4" />
                <span>Create Category</span>
              </button>
            </form>
          </div>

          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 font-bold text-sm text-slate-800">
              Event Types ({eventTypes.length})
            </div>
            <ul className="divide-y divide-slate-100">
              {eventTypes.map((et) => (
                <li key={et.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50/50">
                  {editingCatId === et.id ? (
                    <div className="flex-1 flex items-center space-x-2 mr-3">
                      <input
                        type="color"
                        value={editingCatColor}
                        onChange={(e) => setEditingCatColor(e.target.value)}
                        className="w-8 h-8 rounded border border-slate-200 cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={editingCatName}
                        onChange={(e) => setEditingCatName(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-amber-400 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEditCat(et.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Update</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCatId(null)}
                        className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center space-x-2">
                        <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: et.color }} />
                        <span className="font-bold text-sm text-slate-800">{et.name}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCatId(et.id);
                            setEditingCatName(et.name);
                            setEditingCatColor(et.color);
                          }}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          title="Edit Category"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(et.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete Category"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* TEACHERS MANAGEMENT TAB */}
      {activeSubTab === 'teachers' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 font-serif">Register Faculty Member</h3>
            <form onSubmit={handleAddTeacher} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    placeholder="First name"
                    value={tFirstName}
                    onChange={(e) => setTFirstName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Last name"
                    value={tLastName}
                    onChange={(e) => setTLastName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Email</label>
                <input
                  type="email"
                  required
                  placeholder="faculty@college.edu"
                  value={tEmail}
                  onChange={(e) => setTEmail(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Department</label>
                <select
                  value={tDepartmentId}
                  onChange={(e) => setTDepartmentId(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Role</label>
                  <select
                    value={tRole}
                    onChange={(e) => setTRole(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium"
                  >
                    <option value="teacher">Teacher</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Password</label>
                  <input
                    type="text"
                    value={tPassword}
                    onChange={(e) => setTPassword(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4" />
                <span>Register Faculty</span>
              </button>
            </form>
          </div>

          <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 font-bold text-sm text-slate-800">
              Registered Faculty & Admin Accounts ({teachersList.length})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                    <th className="py-2.5 px-4">Name</th>
                    <th className="py-2.5 px-4">Email</th>
                    <th className="py-2.5 px-4">Department</th>
                    <th className="py-2.5 px-4">Role</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teachersList.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">{t.first_name} {t.last_name}</td>
                      <td className="py-3 px-4 text-slate-600">{t.email}</td>
                      <td className="py-3 px-4 text-slate-700">{t.department_name}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          t.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {t.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditTeacher(t)}
                          className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition"
                          title="Edit Faculty Member"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTeacher(t.id)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                          title="Delete Faculty Member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* EXCEL IMPORT TAB */}
      {activeSubTab === 'import' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 max-w-2xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-serif">Bulk Excel Event Importer</h3>
              <p className="text-xs text-slate-500">
                Upload your college's official event schedule spreadsheet (.xlsx). Matches headers "Date", "Event", or "Business".
              </p>
            </div>
          </div>

          <form onSubmit={handleExcelImport} className="space-y-4 pt-2">
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-emerald-500 transition cursor-pointer bg-slate-50/50">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                className="hidden"
                id="excel-upload-input"
              />
              <label htmlFor="excel-upload-input" className="cursor-pointer space-y-2 block">
                <Upload className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-xs font-bold text-slate-700">
                  {excelFile ? excelFile.name : 'Click to select Excel (.xlsx) file'}
                </p>
                <p className="text-[11px] text-slate-400">
                  Supports column names: Date, Day, Business / Event / Description
                </p>
              </label>
            </div>

            <button
              type="submit"
              disabled={!excelFile || importing}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition disabled:opacity-50 flex items-center justify-center space-x-1.5"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{importing ? 'Processing Spreadsheet...' : 'Import Events to Database'}</span>
            </button>
          </form>
        </div>
      )}

      {/* Edit Faculty Modal */}
      {editingTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-base font-bold text-slate-900 font-serif">Edit Faculty Account</h4>
              <button
                type="button"
                onClick={() => setEditingTeacher(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditTeacher} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={editTFirstName}
                    onChange={(e) => setEditTFirstName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={editTLastName}
                    onChange={(e) => setEditTLastName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={editTEmail}
                  onChange={(e) => setEditTEmail(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+1 555-0199"
                  value={editTPhone}
                  onChange={(e) => setEditTPhone(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Department</label>
                  <select
                    value={editTDeptId}
                    onChange={(e) => setEditTDeptId(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Role</label>
                  <select
                    value={editTRole}
                    onChange={(e) => setEditTRole(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="teacher">Teacher</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Reset Password <span className="text-slate-400 font-normal">(Leave blank to keep current)</span>
                </label>
                <input
                  type="text"
                  placeholder="New password (optional)"
                  value={editTPassword}
                  onChange={(e) => setEditTPassword(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTeacher(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingTeacher}
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50"
                >
                  {isUpdatingTeacher ? 'Updating...' : 'Update Faculty'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-App Confirmation Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <h4 className="text-base font-bold text-slate-900 mb-1">{confirmDialog.title}</h4>
            <p className="text-xs text-slate-500 mb-4">{confirmDialog.message}</p>

            {confirmDialogError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="font-semibold">{confirmDialogError}</span>
              </div>
            )}

            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                disabled={isConfirmProcessing}
                onClick={() => {
                  setConfirmDialog(null);
                  setConfirmDialogError(null);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isConfirmProcessing}
                onClick={async () => {
                  try {
                    setIsConfirmProcessing(true);
                    setConfirmDialogError(null);
                    await confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  } catch (err: any) {
                    setConfirmDialogError(err.message || 'Operation failed');
                    showFeedback('error', err.message || 'Operation failed');
                  } finally {
                    setIsConfirmProcessing(false);
                  }
                }}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50"
              >
                {isConfirmProcessing ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
