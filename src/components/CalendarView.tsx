import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  List, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Filter, 
  RotateCcw,
  Tag,
  Building,
  GraduationCap,
  Sparkles,
  Info,
  CalendarRange,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  MapPin,
  Trash2,
  Printer,
  Edit3
} from 'lucide-react';
import { CalendarEvent, Department, EventType, AcademicYear, UserSession, VENUE_OPTIONS } from '../types';

interface CalendarViewProps {
  events: CalendarEvent[];
  departments: Department[];
  eventTypes: EventType[];
  academicYears: AcademicYear[];
  user: UserSession | null;
  onSelectEvent: (event: CalendarEvent) => void;
  onEditEvent?: (event: CalendarEvent) => void;
  onDeleteEvent?: (id: number) => Promise<void>;
  onExportPDF: () => void;
  onExportExcel: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  departments,
  eventTypes,
  academicYears,
  user,
  onSelectEvent,
  onEditEvent,
  onDeleteEvent,
  onExportPDF,
  onExportExcel
}) => {
  const [viewMode, setViewMode] = useState<'month' | 'list' | 'year'>('month');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  
  // Date State: default to current date or active event month (no hardcoded legacy year)
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const today = new Date();
    if (events.length > 0) {
      const dates = events.map(e => new Date(e.date + 'T00:00:00')).filter(d => !isNaN(d.getTime()));
      // Prefer event in current year
      const currentYearEvents = dates.filter(d => d.getFullYear() === today.getFullYear());
      if (currentYearEvents.length > 0) {
        const thisMonth = currentYearEvents.find(d => d.getMonth() === today.getMonth());
        if (thisMonth) return thisMonth;
        return currentYearEvents[0];
      }
      if (dates.length > 0) return dates[0];
    }
    return today;
  });

  // Filter States
  const [selectedAY, setSelectedAY] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [selectedVenue, setSelectedVenue] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');

  // Reset Filters
  const handleResetFilters = () => {
    setSelectedAY('');
    setSelectedDepartment('');
    setSelectedEventType('');
    setSelectedVenue('');
    setSearchQuery('');
    setStartDateFilter('');
    setEndDateFilter('');
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (selectedAY && String(e.academic_year_id) !== selectedAY) return false;
      if (selectedDepartment && String(e.department_id) !== selectedDepartment) return false;
      if (selectedEventType && String(e.event_type_id) !== selectedEventType) return false;
      if (selectedVenue && e.venue !== selectedVenue) return false;
      if (startDateFilter && e.date < startDateFilter) return false;
      if (endDateFilter && e.date > endDateFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = e.name.toLowerCase().includes(q);
        const matchDesc = e.description?.toLowerCase().includes(q);
        const matchClass = e.class_section?.toLowerCase().includes(q);
        const matchDept = e.department_name?.toLowerCase().includes(q);
        const matchVenue = e.venue?.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchClass && !matchDept && !matchVenue) return false;
      }
      return true;
    });
  }, [events, selectedAY, selectedDepartment, selectedEventType, selectedVenue, startDateFilter, endDateFilter, searchQuery]);

  // Active Academic Year object for Whole Year calendar
  const activeAYObj = useMemo(() => {
    if (selectedAY) {
      return academicYears.find(a => String(a.id) === selectedAY) || academicYears[0];
    }
    return academicYears[0];
  }, [selectedAY, academicYears]);

  // Compute Whole Year Month-wise Activities (June to May standard academic cycle)
  const academicYearMonths = useMemo(() => {
    let startYear = new Date().getFullYear();
    if (activeAYObj && activeAYObj.year) {
      const match = activeAYObj.year.match(/(\d{4})/);
      if (match) {
        startYear = parseInt(match[1], 10);
      }
    }
    
    // Standard academic session runs June to May
    const months: Array<{
      key: string;
      year: number;
      monthIndex: number;
      monthShort: string;
      title: string;
      events: CalendarEvent[];
    }> = [];

    // June to December of startYear
    for (let m = 5; m <= 11; m++) {
      const d = new Date(startYear, m, 1);
      const key = `${startYear}-${String(m + 1).padStart(2, '0')}`;
      months.push({
        key,
        year: startYear,
        monthIndex: m,
        monthShort: d.toLocaleDateString('en-US', { month: 'short' }),
        title: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        events: []
      });
    }

    // January to May of startYear + 1
    for (let m = 0; m <= 4; m++) {
      const d = new Date(startYear + 1, m, 1);
      const key = `${startYear + 1}-${String(m + 1).padStart(2, '0')}`;
      months.push({
        key,
        year: startYear + 1,
        monthIndex: m,
        monthShort: d.toLocaleDateString('en-US', { month: 'short' }),
        title: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        events: []
      });
    }

    // Distribute filtered events
    filteredEvents.forEach(ev => {
      const prefix = ev.date.substring(0, 7);
      const targetMonth = months.find(m => m.key === prefix);
      if (targetMonth) {
        targetMonth.events.push(ev);
      } else {
        const d = new Date(ev.date + 'T00:00:00');
        if (!isNaN(d.getTime())) {
          let extraMonth = months.find(m => m.key === prefix);
          if (!extraMonth) {
            extraMonth = {
              key: prefix,
              year: d.getFullYear(),
              monthIndex: d.getMonth(),
              monthShort: d.toLocaleDateString('en-US', { month: 'short' }),
              title: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
              events: []
            };
            months.push(extraMonth);
          }
          extraMonth.events.push(ev);
        }
      }
    });

    // Sort events within each month by date ascending
    months.forEach(m => {
      m.events.sort((a, b) => a.date.localeCompare(b.date));
    });

    return months;
  }, [activeAYObj, filteredEvents]);

  // Calendar Helper Functions (Month View)
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Build Month Calendar Days
  const monthDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
    const totalDays = lastDayOfMonth.getDate();

    const days: { dateStr: string; dayNumber: number; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const d = new Date(currentYear, currentMonth - 1, dayNum);
      const dateStr = d.toISOString().split('T')[0];
      days.push({ dateStr, dayNumber: dayNum, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const monthFormatted = String(currentMonth + 1).padStart(2, '0');
      const dayFormatted = String(i).padStart(2, '0');
      const dateStr = `${currentYear}-${monthFormatted}-${dayFormatted}`;
      days.push({ dateStr, dayNumber: i, isCurrentMonth: true });
    }

    // Next month padding to fill 35 or 42 grid cells
    const remainingCells = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingCells; i++) {
      const d = new Date(currentYear, currentMonth + 1, i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({ dateStr, dayNumber: i, isCurrentMonth: false });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Month Name String
  const monthTitle = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Map events by Date string YYYY-MM-DD
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const e of filteredEvents) {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    }
    return map;
  }, [filteredEvents]);

  return (
    <div className="space-y-6">
      
      {/* Top Controls & Filter Panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        
        {/* Row 1: Search & Quick Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by event title, keyword, class, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-semibold"
              >
                Clear
              </button>
            )}
          </div>

          {/* View Mode Toggle & Export Buttons */}
          <div className="flex items-center space-x-2 self-start lg:self-auto">
            
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
              <button
                onClick={() => setViewMode('month')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  viewMode === 'month' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Month</span>
              </button>
              <button
                onClick={() => setViewMode('year')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  viewMode === 'year' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Whole Year Calendar (Month-wise Activities)"
              >
                <CalendarRange className="w-3.5 h-3.5 text-blue-600" />
                <span>Whole Year</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  viewMode === 'list' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>List Table</span>
              </button>
            </div>

            <button
              onClick={onExportPDF}
              className="flex items-center space-x-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold border border-slate-300 transition"
              title="Export Filtered PDF Report"
            >
              <FileText className="w-3.5 h-3.5 text-red-600" />
              <span className="hidden sm:inline">PDF</span>
            </button>
            
            <button
              onClick={onExportExcel}
              className="flex items-center space-x-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold border border-slate-300 transition"
              title="Download Excel Spreadsheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Excel</span>
            </button>

          </div>

        </div>

        {/* Row 2: Deep Filters (Venue, Academic Year, Department, Event Type, Date Range) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-2 border-t border-slate-100">
          
          {/* Venue Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Venue
            </label>
            <select
              value={selectedVenue}
              onChange={(e) => setSelectedVenue(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">All Venues</option>
              {VENUE_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Department
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Event Type Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Event Category
            </label>
            <select
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">All Categories</option>
              {eventTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Year */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Academic Year
            </label>
            <select
              value={selectedAY}
              onChange={(e) => setSelectedAY(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">All Academic Years</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  AY {ay.year}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Start */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              From Date
            </label>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Date Range End & Clear */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                To Date
              </label>
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            
            {(selectedVenue || selectedDepartment || selectedEventType || selectedAY || startDateFilter || endDateFilter || searchQuery) && (
              <button
                onClick={handleResetFilters}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold border border-slate-200 transition"
                title="Reset All Filters"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>

      </div>

      {/* Category Color Legend Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
        <span className="font-bold text-slate-600 mr-2 flex items-center gap-1">
          <Tag className="w-3.5 h-3.5 text-slate-400" /> Categories:
        </span>
        {eventTypes.map(t => (
          <button
            key={t.id}
            onClick={() => setSelectedEventType(selectedEventType === String(t.id) ? '' : String(t.id))}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition border ${
              selectedEventType === String(t.id)
                ? 'ring-2 ring-offset-1 ring-blue-500'
                : 'hover:opacity-90'
            }`}
            style={{ backgroundColor: `${t.color}15`, color: t.color, borderColor: `${t.color}40` }}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
            <span>{t.name}</span>
          </button>
        ))}
      </div>

      {/* MONTH VIEW */}
      {viewMode === 'month' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          
          {/* Month Header Navigation */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-bold font-serif tracking-tight">{monthTitle}</h2>
              <span className="bg-blue-800 text-blue-100 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-blue-600">
                {filteredEvents.filter(e => e.date.startsWith(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`)).length} Events
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleToday}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition"
              >
                Today
              </button>
              <div className="flex items-center space-x-1">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Days of Week Bar */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* 7x5 Month Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-200 bg-slate-100">
            {monthDays.map((day, idx) => {
              const dayEvents = eventsByDate[day.dateStr] || [];
              const isToday = day.dateStr === new Date().toISOString().split('T')[0];

              return (
                <div
                  key={idx}
                  className={`min-h-[110px] p-1.5 transition ${
                    day.isCurrentMonth ? 'bg-white' : 'bg-slate-50/70 text-slate-400'
                  }`}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between mb-1 px-1">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        isToday
                          ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                          : day.isCurrentMonth
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {day.dayNumber}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-bold text-slate-400">
                        {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
                      </span>
                    )}
                  </div>

                  {/* Day Events Stack */}
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <div
                        key={ev.id}
                        onClick={() => onSelectEvent(ev)}
                        className="px-1.5 py-1 rounded text-[11px] font-semibold truncate cursor-pointer transition shadow-xs hover:scale-[1.02] hover:shadow"
                        style={{
                          backgroundColor: `${ev.event_type_color}18`,
                          color: ev.event_type_color,
                          borderLeft: `3px solid ${ev.event_type_color}`
                        }}
                        title={`${ev.name} • ${ev.venue || 'Classroom'} (${ev.start_time || '09:00'} - ${ev.end_time || '10:00'})`}
                      >
                        <div className="flex items-center justify-between gap-1 leading-tight">
                          <span className="font-bold truncate text-[11px]">{ev.name}</span>
                          <span className="text-[9px] opacity-75 shrink-0 font-mono">{ev.start_time || '09:00'}</span>
                        </div>
                        <div className="text-[9px] opacity-80 truncate flex items-center gap-0.5 mt-0.5 text-slate-600 font-medium">
                          <span>📍 {ev.venue || 'Classroom'}</span>
                        </div>
                      </div>
                    ))}

                    {dayEvents.length > 3 && (
                      <button
                        onClick={() => {
                          setStartDateFilter(day.dateStr);
                          setEndDateFilter(day.dateStr);
                          setViewMode('list');
                        }}
                        className="w-full text-left text-[10px] font-bold text-blue-600 hover:underline px-1"
                      >
                        + {dayEvents.length - 3} more events
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* LIST / TABLE VIEW */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          
          <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold font-serif">Filtered Event Directory</h3>
              <p className="text-xs text-slate-400">
                Showing {filteredEvents.length} events matching your current filters
              </p>
            </div>
            {filteredEvents.length > 0 && (
              <span className="bg-blue-800 text-blue-100 text-xs px-3 py-1 rounded-full font-bold">
                {filteredEvents.length} Results
              </span>
            )}
          </div>

          {filteredEvents.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <p className="text-base font-bold text-slate-700">No Academic Events Found</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No events match the selected department, category, or date range filters. Try resetting your search filters.
              </p>
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Venue</th>
                    <th className="py-3 px-4">Event Name & Details</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Target Class</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredEvents.map((ev) => (
                    <tr
                      key={ev.id}
                      className="hover:bg-blue-50/40 transition cursor-pointer"
                      onClick={() => onSelectEvent(ev)}
                    >
                      {/* Date & Time */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <CalendarIcon className="w-4 h-4 text-blue-600 shrink-0" />
                          <div>
                            <div>{ev.date}</div>
                            <div className="text-[11px] font-normal text-slate-500 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{ev.start_time || '09:00'} – {ev.end_time || '10:00'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Venue */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200 shadow-2xs">
                          <MapPin className="w-3 h-3 text-blue-600" />
                          <span>{ev.venue || 'Classroom'}</span>
                        </span>
                      </td>

                      {/* Title & Description */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="font-bold text-slate-900 hover:text-blue-700 transition">
                          {ev.name}
                        </p>
                        {ev.description && (
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                            {ev.description}
                          </p>
                        )}
                      </td>

                      {/* Event Type */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className="px-2.5 py-1 rounded-full text-xs font-bold inline-block border"
                          style={{
                            backgroundColor: `${ev.event_type_color}15`,
                            color: ev.event_type_color,
                            borderColor: `${ev.event_type_color}40`
                          }}
                        >
                          {ev.event_type_name || 'General'}
                        </span>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4 font-medium text-slate-700 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          <span>{ev.department_name || 'College Overall'}</span>
                        </div>
                      </td>

                      {/* Class */}
                      <td className="py-3.5 px-4 text-xs font-semibold text-slate-600 whitespace-nowrap">
                        <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {ev.class_section || 'All Batches'}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectEvent(ev);
                          }}
                          className="px-3 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded-lg text-xs font-bold transition border border-slate-200"
                        >
                          View Details
                        </button>

                        {/* Inline Edit for Authorized Faculty / Admin */}
                        {user && (user.role === 'admin' || Number(user.department_id) === Number(ev.department_id) || Number(user.id) === Number(ev.teacher_id)) && onEditEvent && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditEvent(ev);
                            }}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-bold transition border border-amber-200 inline-flex items-center gap-1"
                            title="Edit Event"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        )}

                        {/* Inline Delete for Authorized Faculty / Admin */}
                        {user && (user.role === 'admin' || Number(user.department_id) === Number(ev.department_id) || Number(user.id) === Number(ev.teacher_id)) && onDeleteEvent && (
                          deletingId === ev.id ? (
                            <span className="inline-flex items-center space-x-1 bg-red-50 border border-red-300 px-2 py-0.5 rounded-lg text-[10px]">
                              <span className="font-bold text-red-800">Delete?</span>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    await onDeleteEvent(ev.id);
                                    setDeletingId(null);
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold transition"
                              >
                                Yes
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeletingId(null);
                                }}
                                className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-semibold transition"
                              >
                                No
                              </button>
                            </span>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletingId(ev.id);
                              }}
                              className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-bold transition border border-red-200"
                              title="Delete Event"
                            >
                              <Trash2 className="w-3.5 h-3.5 inline" />
                            </button>
                          )
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

      {/* WHOLE YEAR ANNUAL CALENDAR (MONTH-WISE ORDER) */}
      {viewMode === 'year' && (
        <div className="space-y-6">
          
          {/* Header Card with Academic Year Selector & Stats */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <CalendarRange className="w-6 h-6 text-amber-400" />
                  <h3 className="text-xl font-bold font-serif">Annual Academic Calendar</h3>
                  <span className="bg-blue-900 text-blue-200 text-xs px-2.5 py-0.5 rounded-full font-bold border border-blue-700">
                    AY {activeAYObj?.year || '2026-2027'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Complete chronological schedule of college activities, exams, holidays, and workshops organized in month-wise order.
                </p>
              </div>

              {/* Controls: Year Selector & Quick Actions */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center space-x-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                  <span className="text-xs font-semibold text-slate-300">Session:</span>
                  <select
                    value={selectedAY}
                    onChange={(e) => setSelectedAY(e.target.value)}
                    className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="" className="bg-slate-800 text-white">All Configured Sessions</option>
                    {academicYears.map(ay => (
                      <option key={ay.id} value={ay.id} className="bg-slate-800 text-white">
                        AY {ay.year}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition"
                  title="Print Annual Calendar"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Year</span>
                </button>

                <button
                  type="button"
                  onClick={onExportPDF}
                  className="flex items-center space-x-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Annual PDF</span>
                </button>
              </div>
            </div>

            {/* Quick Month-Jump Navigation */}
            <div className="mt-5 pt-4 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                Jump to Month:
              </span>
              {academicYearMonths.map((m) => (
                <a
                  key={m.key}
                  href={`#month-${m.key}`}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                    m.events.length > 0 
                      ? 'bg-blue-900/70 hover:bg-blue-800 text-blue-200 border border-blue-700/60' 
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/40'
                  }`}
                >
                  <span>{m.monthShort}</span>
                  {m.events.length > 0 && (
                    <span className="bg-amber-400 text-slate-900 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                      {m.events.length}
                    </span>
                  )}
                </a>
              ))}
            </div>
          </div>

          {/* Month by Month Activities Schedule */}
          <div className="space-y-6">
            {academicYearMonths.map((m) => (
              <section
                key={m.key}
                id={`month-${m.key}`}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden scroll-mt-24 transition hover:shadow-md"
              >
                {/* Month Banner Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-slate-50 via-blue-50/20 to-white border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                      {m.monthShort}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900 font-serif">
                        {m.title}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {m.events.length === 1 
                          ? '1 activity scheduled' 
                          : `${m.events.length} activities scheduled`}
                      </p>
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    m.events.length > 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {m.events.length} {m.events.length === 1 ? 'Event' : 'Events'}
                  </span>
                </div>

                {/* Activities Table or Empty State */}
                {m.events.length === 0 ? (
                  <div className="py-6 px-6 text-center text-slate-400 text-xs italic">
                    No activities scheduled for {m.title}.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <th className="py-2.5 px-4 w-28">Day</th>
                          <th className="py-2.5 px-4 w-32">Date</th>
                          <th className="py-2.5 px-4">Event Name</th>
                          <th className="py-2.5 px-4 w-32">Category</th>
                          <th className="py-2.5 px-4 w-44">Department & Class</th>
                          <th className="py-2.5 px-4 w-40">Time & Venue</th>
                          <th className="py-2.5 px-4 text-right w-36">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {m.events.map((ev) => {
                          const dateObj = new Date(ev.date + 'T00:00:00');
                          const dayName = !isNaN(dateObj.getTime())
                            ? dateObj.toLocaleDateString('en-US', { weekday: 'long' })
                            : 'N/A';
                          const formattedDate = !isNaN(dateObj.getTime())
                            ? dateObj.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
                            : ev.date;

                          const canModify = Boolean(
                            user && (
                              user.role === 'admin' ||
                              Number(user.department_id) === Number(ev.department_id) ||
                              Number(user.id) === Number(ev.teacher_id)
                            )
                          );

                          return (
                            <tr
                              key={ev.id}
                              onClick={() => onSelectEvent(ev)}
                              className="hover:bg-blue-50/30 transition cursor-pointer group"
                            >
                              {/* Day */}
                              <td className="py-3 px-4 font-bold text-slate-700 whitespace-nowrap">
                                <span className="bg-slate-100 group-hover:bg-blue-100/60 text-slate-800 px-2.5 py-1 rounded-md text-[11px] font-semibold transition">
                                  {dayName}
                                </span>
                              </td>

                              {/* Date */}
                              <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                                <span className="font-mono text-xs">{formattedDate}</span>
                              </td>

                              {/* Event Name */}
                              <td className="py-3 px-4 max-w-sm">
                                <div className="font-bold text-slate-900 group-hover:text-blue-700 text-xs transition">
                                  {ev.name}
                                </div>
                                {ev.description && (
                                  <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                    {ev.description}
                                  </div>
                                )}
                              </td>

                              {/* Category */}
                              <td className="py-3 px-4 whitespace-nowrap">
                                <span
                                  className="px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-block border"
                                  style={{
                                    backgroundColor: `${ev.event_type_color}15`,
                                    color: ev.event_type_color,
                                    borderColor: `${ev.event_type_color}40`
                                  }}
                                >
                                  {ev.event_type_name}
                                </span>
                              </td>

                              {/* Department & Class */}
                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="font-semibold text-slate-800">
                                  {ev.department_name || 'College Overall'}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {ev.class_section || 'All Batches'}
                                </div>
                              </td>

                              {/* Time & Venue */}
                              <td className="py-3 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-1 text-slate-700 font-medium">
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>{ev.venue || 'Classroom'}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                  <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                  <span>{ev.start_time} - {ev.end_time}</span>
                                </div>
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-4 text-right whitespace-nowrap space-x-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectEvent(ev);
                                  }}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded-lg text-[11px] font-bold transition border border-slate-200"
                                >
                                  Details
                                </button>

                                {canModify && onEditEvent && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEditEvent(ev);
                                    }}
                                    className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[11px] font-bold transition border border-amber-200 inline-flex items-center gap-0.5"
                                    title="Edit Event"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                    <span>Edit</span>
                                  </button>
                                )}

                                {canModify && onDeleteEvent && (
                                  deletingId === ev.id ? (
                                    <span className="inline-flex items-center space-x-1 bg-red-50 border border-red-300 px-1.5 py-0.5 rounded text-[10px]">
                                      <button
                                        type="button"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          try {
                                            await onDeleteEvent(ev.id);
                                            setDeletingId(null);
                                          } catch (err) {
                                            console.error(err);
                                          }
                                        }}
                                        className="px-1 py-0.5 bg-red-600 text-white rounded font-bold text-[9px]"
                                      >
                                        Yes
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeletingId(null);
                                        }}
                                        className="px-1 py-0.5 bg-slate-200 text-slate-700 rounded text-[9px]"
                                      >
                                        No
                                      </button>
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeletingId(ev.id);
                                      }}
                                      className="p-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition border border-red-200 inline-flex items-center"
                                      title="Delete Event"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  )
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ))}
          </div>

        </div>
      )}

    </div>
  );
};
