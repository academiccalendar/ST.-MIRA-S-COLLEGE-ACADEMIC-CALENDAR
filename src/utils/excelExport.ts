import * as xlsx from 'xlsx';
import { CalendarEvent } from '../types';

export function exportEventsToExcel(events: CalendarEvent[], title = 'Academic_Calendar_Events') {
  const data = events.map(e => ({
    'Date': e.date,
    'Start Time': e.start_time || '09:00',
    'End Time': e.end_time || '10:00',
    'Venue': e.venue || 'Classroom',
    'Event Name': e.name,
    'Event Type': e.event_type_name || 'General',
    'Department': e.department_name || 'College Overall',
    'Class / Section': e.class_section || 'All Batches',
    'Academic Year': e.academic_year_name || '',
    'Description': e.description || ''
  }));

  const worksheet = xlsx.utils.json_to_sheet(data);

  // Set column widths for clean readability
  worksheet['!cols'] = [
    { wch: 14 }, // Date
    { wch: 12 }, // Start Time
    { wch: 12 }, // End Time
    { wch: 18 }, // Venue
    { wch: 40 }, // Event Name
    { wch: 18 }, // Event Type
    { wch: 25 }, // Department
    { wch: 20 }, // Class
    { wch: 15 }, // Year
    { wch: 45 }  // Description
  ];

  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Events');

  const fileName = `${title}_${new Date().toISOString().split('T')[0]}.xlsx`;
  xlsx.writeFile(workbook, fileName);
}
