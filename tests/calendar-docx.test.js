const assert = require('node:assert/strict');
const test = require('node:test');
const { createCalendarDocx } = require('../calendar-docx');
const { buildCalendar } = require('../calendar-logic');

function row(overrides = {}) {
  return {
    'Resource ID': 'resource-1',
    'Short name': 'Pantry & Meals',
    'Event label': '',
    'Calendar event': 'TRUE*',
    'Which one(s)': 'Every',
    'Day(s) of week': 'Monday',
    Interval: 'Weekly',
    Time: '9:00 AM - 12:00 PM',
    'Time exceptions': 'Call before visiting',
    ...overrides
  };
}

test('exports the displayed calendar details in a Google Docs-compatible DOCX', () => {
  const calendar = buildCalendar([
    row(),
    row({
      'Resource ID': 'false-resource',
      'Short name': 'Resource details',
      'Calendar event': 'FALSE',
      'Available times': 'Friday, 2:00 PM'
    })
  ], 2, new Date(2026, 10, 1));
  calendar.months[0].translatedTitle = 'Calendario de noviembre';
  calendar.months[0].weekdayLabels = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const docx = createCalendarDocx(calendar);

  assert.deepEqual(Array.from(docx.slice(0, 4)), [0x50, 0x4b, 0x03, 0x04]);
  const packageText = new TextDecoder().decode(docx);
  assert.match(packageText, /word\/document\.xml/);
  assert.match(packageText, /Calendario de noviembre/);
  assert.match(packageText, /Domingo/);
  assert.match(packageText, /December 2026/);
  assert.match(packageText, /Pantry &amp; Meals/);
  assert.match(packageText, /Call before visiting/);
  assert.match(packageText, /Resources not included as calendar events/);
  assert.match(packageText, /Resource details — Friday, 2:00 PM/);
  assert.match(packageText, /Confirm before visiting/);
});
