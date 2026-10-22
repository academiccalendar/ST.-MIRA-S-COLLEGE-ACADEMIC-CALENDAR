import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { CalendarEvent } from '../types';

export async function generateEventsPDF(events: CalendarEvent[], subtitle = 'Official Academic Event Schedule') {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([612, 792]); // Standard Letter Size
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const { width, height } = page.getSize();
  let y = height - 50;

  // Header Banner
  page.drawRectangle({
    x: 0,
    y: height - 80,
    width,
    height: 80,
    color: rgb(0.118, 0.227, 0.541) // Institutional Deep Blue #1e3a8a
  });

  page.drawText('ST. MIRA\'S COLLEGE FOR GIRLS', {
    x: 40,
    y: height - 40,
    size: 18,
    font: fontBold,
    color: rgb(1, 1, 1)
  });

  page.drawText(`ACADEMIC CALENDAR REPORT — ${subtitle.toUpperCase()}`, {
    x: 40,
    y: height - 60,
    size: 11,
    font: fontRegular,
    color: rgb(0.9, 0.95, 1)
  });

  y = height - 110;

  // Metadata Line
  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  page.drawText(`Generated: ${generatedDate} | Total Events: ${events.length}`, {
    x: 40,
    y,
    size: 9,
    font: fontRegular,
    color: rgb(0.4, 0.45, 0.5)
  });

  y -= 25;

  // Table Headers
  const colDate = 40;
  const colVenue = 120;
  const colName = 210;
  const colType = 380;
  const colDept = 465;

  const drawTableHeader = (p: any, yPos: number) => {
    p.drawRectangle({
      x: 35,
      y: yPos - 5,
      width: width - 70,
      height: 20,
      color: rgb(0.93, 0.95, 0.98)
    });
    p.drawText('Date & Time', { x: colDate, y: yPos, size: 9, font: fontBold, color: rgb(0.1, 0.15, 0.3) });
    p.drawText('Venue', { x: colVenue, y: yPos, size: 9, font: fontBold, color: rgb(0.1, 0.15, 0.3) });
    p.drawText('Event Title', { x: colName, y: yPos, size: 9, font: fontBold, color: rgb(0.1, 0.15, 0.3) });
    p.drawText('Category', { x: colType, y: yPos, size: 9, font: fontBold, color: rgb(0.1, 0.15, 0.3) });
    p.drawText('Department', { x: colDept, y: yPos, size: 9, font: fontBold, color: rgb(0.1, 0.15, 0.3) });
  };

  drawTableHeader(page, y);

  y -= 22;

  // Render Rows
  for (let i = 0; i < events.length; i++) {
    const event = events[i];

    // Page overflow check
    if (y < 60) {
      page = pdfDoc.addPage([612, 792]);
      y = height - 60;
      drawTableHeader(page, y);
      y -= 22;
    }

    // Zebra striping
    if (i % 2 === 1) {
      page.drawRectangle({
        x: 35,
        y: y - 5,
        width: width - 70,
        height: 18,
        color: rgb(0.98, 0.98, 0.99)
      });
    }

    const dateTimeStr = `${event.date}`;
    const venueStr = event.venue || 'Classroom';
    const truncatedName = event.name.length > 32 ? event.name.substring(0, 30) + '..' : event.name;
    const truncatedDept = (event.department_name || 'College Overall').length > 18 ? 
      (event.department_name || '').substring(0, 16) + '..' : (event.department_name || 'College Overall');

    page.drawText(dateTimeStr, { x: colDate, y, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(venueStr, { x: colVenue, y, size: 8, font: fontRegular, color: rgb(0.1, 0.3, 0.6) });
    page.drawText(truncatedName, { x: colName, y, size: 8.5, font: fontBold, color: rgb(0.05, 0.1, 0.2) });
    page.drawText(event.event_type_name || 'General', { x: colType, y, size: 8, font: fontRegular, color: rgb(0.3, 0.3, 0.4) });
    page.drawText(truncatedDept, { x: colDept, y, size: 8, font: fontRegular, color: rgb(0.3, 0.3, 0.4) });

    y -= 18;
  }

  // Footer on last page
  page.drawText('Institutional Academic Calendar | St. Mira\'s College System', {
    x: 40,
    y: 30,
    size: 8,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.5)
  });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Academic_Calendar_${subtitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  link.click();
}
