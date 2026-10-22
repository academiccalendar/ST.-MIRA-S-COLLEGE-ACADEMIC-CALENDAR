import React from 'react';
import { 
  Calendar as CalendarIcon, 
  Shield, 
  User, 
  LogOut, 
  Plus, 
  FileSpreadsheet, 
  FileText,
  Building2,
  GraduationCap,
  Sparkles
} from 'lucide-react';
import { UserSession } from '../types';

interface HeaderProps {
  user: UserSession | null;
  activeTab: 'calendar' | 'admin' | 'teacher';
  setActiveTab: (tab: 'calendar' | 'admin' | 'teacher') => void;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  onOpenCreateEventModal: () => void;
  onExportPDF: () => void;
  onExportExcel: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  activeTab,
  setActiveTab,
  onOpenAuthModal,
  onLogout,
  onOpenCreateEventModal,
  onExportPDF,
  onExportExcel
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
      {/* Top Banner Accent */}
      <div className="h-1 bg-gradient-to-r from-blue-700 via-indigo-600 to-amber-500" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand Logo & Institution Info */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('calendar')}>
            <div className="w-11 h-11 rounded-xl bg-blue-700/80 border border-blue-500/30 flex items-center justify-center text-white shadow-inner">
              <GraduationCap className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white font-serif">
                  Academic Calendar
                </span>
                <span className="bg-blue-950 text-blue-300 text-[10px] font-semibold px-2 py-0.5 rounded border border-blue-800/60 uppercase tracking-widest">
                  Official Portal
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <Building2 className="w-3 h-3 text-slate-500" /> St. Mira's College for Girls, Pune
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/50">
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'calendar'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              <span>Public Calendar</span>
            </button>

            {user && user.role === 'teacher' && (
              <button
                onClick={() => setActiveTab('teacher')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'teacher'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Teacher Portal</span>
              </button>
            )}

            {user && user.role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'admin'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                <Shield className="w-4 h-4 text-amber-200" />
                <span>Admin Control</span>
              </button>
            )}
          </nav>

          {/* Actions & User State */}
          <div className="flex items-center space-x-3">
            
            {/* Quick Export Menu */}
            <div className="hidden lg:flex items-center space-x-2 border-r border-slate-700 pr-3 mr-1">
              <button
                onClick={onExportPDF}
                title="Generate PDF Calendar"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                <FileText className="w-3.5 h-3.5 text-red-400" />
                <span>Export PDF</span>
              </button>
              <button
                onClick={onExportExcel}
                title="Download Excel Spreadsheet"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export Excel</span>
              </button>
            </div>

            {/* Create Event Button (If authenticated) */}
            {user && (
              <button
                onClick={onOpenCreateEventModal}
                className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-lg text-sm font-semibold shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Event</span>
              </button>
            )}

            {/* Auth Buttons */}
            {user ? (
              <div className="flex items-center space-x-3 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl">
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-bold text-slate-100 leading-tight">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="text-[10px] text-slate-400 capitalize font-medium">
                    {user.role}
                  </p>
                </div>
                <button
                  onClick={onLogout}
                  title="Sign Out"
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow transition"
              >
                <User className="w-4 h-4" />
                <span>Staff Portal</span>
              </button>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
