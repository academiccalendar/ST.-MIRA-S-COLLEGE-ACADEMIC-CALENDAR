import React, { useState } from 'react';
import { 
  User, 
  Building, 
  Calendar, 
  Plus, 
  Key, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  Trash2,
  Lock,
  Mail,
  Phone,
  Clock
} from 'lucide-react';
import { CalendarEvent, UserSession } from '../types';
import { updateProfile, changePassword } from '../services/api';

interface TeacherDashboardProps {
  user: UserSession;
  myEvents: CalendarEvent[];
  onOpenCreateModal: () => void;
  onEditEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (eventId: number) => void;
  onUpdateUserSession: (updated: UserSession) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  user,
  myEvents,
  onOpenCreateModal,
  onEditEvent,
  onDeleteEvent,
  onUpdateUserSession
}) => {
  const [activeTab, setActiveTab] = useState<'events' | 'profile' | 'password'>('events');
  
  // Profile Form State
  const [firstName, setFirstName] = useState(user.first_name);
  const [lastName, setLastName] = useState(user.last_name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState('');

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<number | null>(null);

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const updated = await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim()
      });
      onUpdateUserSession(updated);
      showFeedback('success', 'Profile information updated successfully');
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showFeedback('error', 'New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      showFeedback('error', 'Password must be at least 6 characters long');
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showFeedback('success', 'Password updated successfully');
    } catch (err: any) {
      showFeedback('error', err.message || 'Failed to change password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Teacher Profile Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-white text-xl font-bold font-serif shadow-inner">
            {user.first_name[0]}{user.last_name[0]}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold font-serif">
                Prof. {user.first_name} {user.last_name}
              </h2>
              <span className="bg-blue-900 text-blue-200 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border border-blue-700">
                Department Faculty
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
              <span>{user.email}</span>
            </p>
          </div>
        </div>

        <button
          onClick={onOpenCreateModal}
          className="flex items-center space-x-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow transition self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Department Event</span>
        </button>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center space-x-2 border ${
          feedback.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'events' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          My Department Events ({myEvents.length})
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'profile' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Edit Profile
        </button>
        <button
          onClick={() => setActiveTab('password')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'password' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Security & Password
        </button>
      </div>

      {/* MY EVENTS TAB */}
      {activeTab === 'events' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              Events Assigned to Your Department
            </h3>
            <span className="text-xs font-bold text-blue-600">
              {myEvents.length} Events
            </span>
          </div>

          {myEvents.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No events created for your department yet</p>
              <button
                onClick={onOpenCreateModal}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow"
              >
                Schedule First Event
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Venue</th>
                    <th className="py-3 px-4">Title</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Class</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myEvents.map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        <div>{ev.date}</div>
                        <div className="text-[10px] font-normal text-slate-500">
                          {ev.start_time || '09:00'} – {ev.end_time || '10:00'}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {ev.venue || 'Classroom'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">{ev.name}</td>
                      <td className="py-3 px-4">
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
                      <td className="py-3 px-4 text-slate-600">{ev.class_section}</td>
                      <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => onEditEvent(ev)}
                          className="px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-xs font-bold border border-amber-200 transition"
                        >
                          Edit
                        </button>
                        {deletingEventId === ev.id ? (
                          <span className="inline-flex items-center space-x-1 bg-red-50 border border-red-300 px-2 py-0.5 rounded-lg">
                            <span className="text-[10px] font-bold text-red-800">Delete?</span>
                            <button
                              onClick={async () => {
                                try {
                                  await onDeleteEvent(ev.id);
                                  setDeletingEventId(null);
                                  showFeedback('success', 'Event deleted successfully');
                                } catch (err: any) {
                                  showFeedback('error', err.message || 'Failed to delete event');
                                }
                              }}
                              className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold transition shadow-2xs"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeletingEventId(null)}
                              className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-medium transition"
                            >
                              No
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setDeletingEventId(ev.id)}
                            className="px-2.5 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-bold border border-red-200 transition"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* EDIT PROFILE TAB */}
      {activeTab === 'profile' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-lg space-y-4">
          <h3 className="text-base font-bold text-slate-900 font-serif">Update Faculty Information</h3>
          
          <form onSubmit={handleUpdateProfile} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Phone Number</label>
              <input
                type="tel"
                placeholder="+1 555-0199"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="py-2.5 px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow transition"
            >
              {isSubmitting ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
          </form>
        </div>
      )}

      {/* SECURITY & PASSWORD TAB */}
      {activeTab === 'password' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-lg space-y-4">
          <h3 className="text-base font-bold text-slate-900 font-serif">Change Password</h3>
          
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Current Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">New Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="py-2.5 px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow transition"
            >
              {isSubmitting ? 'Updating Password...' : 'Update Password'}
            </button>
          </form>
        </div>
      )}

    </div>
  );
};
