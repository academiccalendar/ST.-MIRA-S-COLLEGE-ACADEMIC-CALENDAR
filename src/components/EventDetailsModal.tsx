import React, { useState } from 'react';
import { 
  X, 
  Calendar, 
  Building, 
  User, 
  Tag, 
  Clock, 
  FileText, 
  Edit3, 
  Trash2, 
  Printer, 
  Share2,
  CheckCircle2,
  GraduationCap,
  MapPin,
  Lock,
  AlertCircle
} from 'lucide-react';
import { CalendarEvent, UserSession } from '../types';

interface EventDetailsModalProps {
  event: CalendarEvent | null;
  user: UserSession | null;
  onClose: () => void;
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: (eventId: number) => Promise<void> | void;
  onOpenAuthModal?: () => void;
}

export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  event,
  user,
  onClose,
  onEdit,
  onDelete,
  onOpenAuthModal
}) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (!event) return null;

  // Authorization check: Admin can edit/delete any; Teacher can edit/delete if in their department or creator
  const canModify = Boolean(
    user && (
      user.role === 'admin' || 
      Number(user.department_id) === Number(event.department_id) ||
      Number(user.id) === Number(event.teacher_id)
    )
  );

  const handlePrint = () => {
    window.print();
  };

  const handleConfirmDelete = async () => {
    if (!onDelete) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await onDelete(event.id);
      setIsConfirmingDelete(false);
      onClose();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete event');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header Banner */}
        <div 
          className="p-6 text-white relative"
          style={{ backgroundColor: event.event_type_color || '#1e3a8a' }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 p-1.5 rounded-full transition"
          >
            <X className="w-4 h-4" />
          </button>

          <span className="inline-block px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold tracking-wide uppercase mb-2">
            {event.event_type_name || 'Event'}
          </span>

          <h2 className="text-xl font-bold font-serif leading-tight pr-6">
            {event.name}
          </h2>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/90 mt-2 font-medium">
            <span className="flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{event.date}</span>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{event.start_time || '09:00'} – {event.end_time || '10:00'}</span>
            </span>
            <span>•</span>
            <span>AY {event.academic_year_name || '2023-2024'}</span>
          </div>
        </div>

        {/* Event Body Details */}
        <div className="p-6 space-y-4 text-slate-700">
          
          {deleteError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{deleteError}</span>
            </div>
          )}

          {/* Venue & Timing Spotlight Box */}
          <div className="bg-blue-50/70 border border-blue-200/80 p-3.5 rounded-xl grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="block text-[10px] font-bold text-blue-900/70 uppercase tracking-wider mb-0.5">
                Booked Venue
              </span>
              <div className="flex items-center space-x-1.5 font-bold text-blue-950">
                <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-sm">{event.venue || 'Auditorium'}</span>
              </div>
            </div>

            <div>
              <span className="block text-[10px] font-bold text-blue-900/70 uppercase tracking-wider mb-0.5">
                Scheduled Timing
              </span>
              <div className="flex items-center space-x-1.5 font-bold text-blue-950">
                <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-sm">{event.start_time || '09:00'} – {event.end_time || '10:00'}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                Department
              </span>
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900">
                <Building className="w-3.5 h-3.5 text-blue-600" />
                <span>{event.department_name || 'College Overall'}</span>
              </div>
            </div>

            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                Target Audience
              </span>
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                <span>{event.class_section || 'All Batches'}</span>
              </div>
            </div>
          </div>

          {/* Organizer / Teacher */}
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Event Organizer / Creator
            </span>
            <div className="flex items-center space-x-2 text-xs text-slate-800 font-semibold bg-white p-2.5 rounded-xl border border-slate-200">
              <User className="w-4 h-4 text-slate-500" />
              <span>{event.teacher_name || 'College Academic Cell'}</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Description & Agenda
            </span>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-wrap min-h-[70px]">
              {event.description || 'No detailed description provided for this academic event schedule.'}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-100">
            
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <div className="flex items-center space-x-2">
              {canModify ? (
                <>
                  <button
                    onClick={() => {
                      onClose();
                      if (onEdit) onEdit(event);
                    }}
                    disabled={isDeleting}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold transition disabled:opacity-50"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  
                  {isConfirmingDelete ? (
                    <div className="flex items-center space-x-1.5 bg-red-50 border border-red-300 px-2.5 py-1 rounded-lg animate-in fade-in duration-100">
                      <span className="text-xs font-bold text-red-800">Delete event?</span>
                      <button
                        type="button"
                        onClick={handleConfirmDelete}
                        disabled={isDeleting}
                        className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition shadow-xs disabled:opacity-50"
                      >
                        {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsConfirmingDelete(false)}
                        disabled={isDeleting}
                        className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-semibold transition"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDelete(true)}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </>
              ) : !user ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenAuthModal) onOpenAuthModal();
                  }}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 border border-slate-200 rounded-lg text-xs font-medium transition"
                  title="Sign in as faculty or admin to edit or delete"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sign In to Edit / Delete</span>
                </button>
              ) : (
                <span className="text-[11px] text-slate-400 italic">
                  Assigned to {event.department_name}
                </span>
              )}

              <button
                onClick={onClose}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition"
              >
                Close
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
