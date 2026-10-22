import React, { useState, useEffect } from 'react';
import { 
  fetchEvents, 
  fetchDepartments, 
  fetchEventTypes, 
  fetchAcademicYears,
  fetchCurrentUser,
  getStoredUser,
  removeStoredToken,
  createEvent,
  updateEvent,
  deleteEvent
} from './services/api';

import { 
  CalendarEvent, 
  Department, 
  EventType, 
  AcademicYear, 
  UserSession,
  VenueType
} from './types';

import { Header } from './components/Header';
import { CalendarView } from './components/CalendarView';
import { AdminDashboard } from './components/AdminDashboard';
import { TeacherDashboard } from './components/TeacherDashboard';
import { EventModal } from './components/EventModal';
import { EventDetailsModal } from './components/EventDetailsModal';
import { AuthModal } from './components/AuthModal';
import { Footer } from './components/Footer';

import { generateEventsPDF } from './utils/pdfExport';
import { exportEventsToExcel } from './utils/excelExport';

export default function App() {
  const [user, setUser] = useState<UserSession | null>(getStoredUser());
  const [activeTab, setActiveTab] = useState<'calendar' | 'admin' | 'teacher'>('calendar');

  // Core Reference Data
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);

  // UI Modals State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null);
  const [selectedEventForDetails, setSelectedEventForDetails] = useState<CalendarEvent | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  // Load All System Data
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [e, d, t, ay] = await Promise.all([
        fetchEvents(),
        fetchDepartments(),
        fetchEventTypes(),
        fetchAcademicYears()
      ]);
      setEvents(e);
      setDepartments(d);
      setEventTypes(t);
      setAcademicYears(ay);

      // Verify token if stored
      if (user) {
        try {
          const freshTeacher = await fetchCurrentUser();
          setUser({
            id: freshTeacher.id,
            email: freshTeacher.email,
            first_name: freshTeacher.first_name,
            last_name: freshTeacher.last_name,
            role: freshTeacher.role,
            department_id: freshTeacher.department_id
          });
        } catch {
          // Token expired
          removeStoredToken();
          setUser(null);
        }
      }
    } catch (err) {
      console.error('Error loading initial calendar data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handlers
  const handleLogout = () => {
    removeStoredToken();
    setUser(null);
    setActiveTab('calendar');
  };

  const handleOpenCreateEventModal = () => {
    setEventToEdit(null);
    setIsEventModalOpen(true);
  };

  const handleOpenEditEventModal = (event: CalendarEvent) => {
    setEventToEdit(event);
    setIsEventModalOpen(true);
  };

  const handleSubmitEventForm = async (data: {
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
  }) => {
    try {
      if (eventToEdit) {
        const updated = await updateEvent(eventToEdit.id, data);
        setEvents(prev => prev.map(e => e.id === eventToEdit.id ? updated : e));
        if (selectedEventForDetails?.id === eventToEdit.id) {
          setSelectedEventForDetails(updated);
        }
        showToast('success', 'Event updated successfully');
      } else {
        const created = await createEvent(data);
        setEvents(prev => [created, ...prev]);
        showToast('success', 'Event scheduled successfully');
      }
      setIsEventModalOpen(false);
      setEventToEdit(null);
      await loadData();
    } catch (err: any) {
      console.error('Failed to save event:', err);
      showToast('error', err.message || 'Failed to save event');
      throw err;
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    try {
      setEvents(prev => prev.filter(e => e.id !== eventId));
      if (selectedEventForDetails?.id === eventId) {
        setSelectedEventForDetails(null);
      }
      await deleteEvent(eventId);
      await loadData();
      showToast('success', 'Event deleted successfully');
    } catch (err: any) {
      console.error('Failed to delete event:', err);
      showToast('error', err.message || 'Failed to delete event');
      await loadData();
      throw err;
    }
  };

  const handleExportPDF = () => {
    generateEventsPDF(events, 'St. Mira\'s College Academic Schedule');
  };

  const handleExportExcel = () => {
    exportEventsToExcel(events, 'St_Miras_Academic_Calendar');
  };

  // Filter events for logged-in teacher's department
  const myDepartmentEvents = user ? events.filter(e => Number(e.department_id) === Number(user.department_id)) : [];

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans">
      
      {/* Header Bar */}
      <Header
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenCreateEventModal={handleOpenCreateEventModal}
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-600">Loading Academic Calendar Data...</p>
          </div>
        ) : (
          <>
            {activeTab === 'calendar' && (
              <CalendarView
                events={events}
                departments={departments}
                eventTypes={eventTypes}
                academicYears={academicYears}
                user={user}
                onSelectEvent={(ev) => setSelectedEventForDetails(ev)}
                onEditEvent={handleOpenEditEventModal}
                onDeleteEvent={handleDeleteEvent}
                onExportPDF={handleExportPDF}
                onExportExcel={handleExportExcel}
              />
            )}

            {activeTab === 'admin' && user?.role === 'admin' && (
              <AdminDashboard
                departments={departments}
                academicYears={academicYears}
                eventTypes={eventTypes}
                events={events}
                onRefreshData={loadData}
                onDeleteEvent={handleDeleteEvent}
                onEditEvent={handleOpenEditEventModal}
              />
            )}

            {activeTab === 'teacher' && user && (
              <TeacherDashboard
                user={user}
                myEvents={myDepartmentEvents}
                onOpenCreateModal={handleOpenCreateEventModal}
                onEditEvent={handleOpenEditEventModal}
                onDeleteEvent={handleDeleteEvent}
                onUpdateUserSession={(updated) => setUser(updated)}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        departments={departments}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(loggedUser) => {
          setUser(loggedUser);
          if (loggedUser.role === 'admin') {
            setActiveTab('admin');
          } else {
            setActiveTab('teacher');
          }
        }}
      />

      <EventModal
        isOpen={isEventModalOpen}
        eventToEdit={eventToEdit}
        departments={departments}
        eventTypes={eventTypes}
        academicYears={academicYears}
        events={events}
        user={user}
        onClose={() => setIsEventModalOpen(false)}
        onSubmit={handleSubmitEventForm}
      />

      <EventDetailsModal
        event={selectedEventForDetails}
        user={user}
        onClose={() => setSelectedEventForDetails(null)}
        onEdit={handleOpenEditEventModal}
        onDelete={handleDeleteEvent}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Global Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className={`px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 text-xs font-bold border ${
            toast.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700 shadow-emerald-950/20'
              : 'bg-red-900 text-white border-red-700 shadow-red-950/20'
          }`}>
            <span>{toast.text}</span>
          </div>
        </div>
      )}

    </div>
  );
}
