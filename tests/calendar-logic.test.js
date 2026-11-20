const assert = require('node:assert/strict');
const test = require('node:test');
const { buildCalendar } = require('../calendar-logic');

function row(overrides = {}) {
  return {
    'Resource ID': 'resource-1',
    'Name of Resource': 'Community Pantry',
    'Short name': 'Pantry',
    'Event label': '',
    'Calendar event': 'TRUE',
    'Which one(s)': 'Every',
    'Day(s) of week': 'Monday',
    Interval: 'Weekly',
    Time: '9:00 AM - 12:00 PM',
    'Time exceptions': '',
    ...overrides
  };
}

function day(month, date) {
  for (const week of month.weeks) {
    const match = week.find(cell => cell && cell.dayNumber === date);
    if (match) return match;
  }
  return null;
}

test('builds a weekly calendar from the current month and groups weekday rows', () => {
  const calendar = buildCalendar([
    row({ 'Resource ID': 'hours', 'Event label': 'Mon-Thurs', 'Day(s) of week': 'Monday Tuesday Wednesday' }),
    row({ 'Resource ID': 'hours', 'Name of Resource': '', 'Event label': 'Wednesday', 'Day(s) of week': 'Wednesday', Time: '1:00 PM' }),
    row({ 'Resource ID': 'hours', 'Name of Resource': '', 'Event label': 'Breakfast', 'Day(s) of week': 'Monday' }),
    row({ 'Resource ID': 'hours', 'Name of Resource': '', 'Event label': 'Pantry', 'Day(s) of week': 'Monday' })
  ], 1, new Date(2026, 10, 10));

  const month = calendar.months[0];
  assert.equal(month.title, 'November 2026');
  assert.equal(day(month, 2).events.length, 3);
  assert.deepEqual(day(month, 2).events.map(event => event.title).sort(), [
    'Pantry',
    'Pantry — Breakfast',
    'Pantry — Pantry'
  ]);
  assert.deepEqual(day(month, 4).events[0].times, ['9:00 AM - 12:00 PM', '1:00 PM']);
});

test('places daily and monthly ordinal schedules on the matching dates', () => {
  const calendar = buildCalendar([
    row({ 'Resource ID': 'monthly', 'Which one(s)': '2nd and 4th', 'Day(s) of week': 'Monday', Interval: 'Monthly' }),
    row({ 'Resource ID': 'daily', 'Name of Resource': 'Daily Meal', 'Short name': 'Daily Meal', 'Day(s) of week': 'Daily', Interval: 'Daily' })
  ], 1, new Date(2026, 10, 1));
  const month = calendar.months[0];

  assert.deepEqual(day(month, 9).events.map(event => event.title).sort(), ['Daily Meal', 'Pantry']);
  assert.deepEqual(day(month, 23).events.map(event => event.title).sort(), ['Daily Meal', 'Pantry']);
  assert.equal(day(month, 2).events.length, 1);
  assert.equal(day(month, 3).events.length, 1);
});

test('calculates monthly recurrences after the year changes', () => {
  const calendar = buildCalendar([
    row({ 'Which one(s)': '1st', 'Day(s) of week': 'Monday', Interval: 'Monthly' })
  ], 3, new Date(2026, 10, 1));

  assert.deepEqual(calendar.months[2].title, 'January 2027');
  assert.deepEqual(day(calendar.months[2], 4).events.map(event => event.title), ['Pantry']);
});

test('excludes non-opted-in rows and keeps unplaceable schedules in the confirmation section', () => {
  const calendar = buildCalendar([
    row({ 'Calendar event': 'FALSE' }),
    row({ 'Resource ID': 'blank', 'Calendar event': '' }),
    row({ 'Resource ID': 'unknown', 'Calendar event': 'yes' }),
    row({ 'Resource ID': 'appointment', 'Name of Resource': 'Appointment Pantry', 'Short name': 'Appointment Pantry', 'Which one(s)': 'By appointment' }),
    row({ 'Resource ID': 'varies', 'Name of Resource': 'Varies Pantry', 'Short name': 'Varies Pantry', Interval: 'Varies' }),
    row({ 'Resource ID': 'invalid-monthly', 'Name of Resource': 'Invalid Monthly', 'Short name': 'Invalid Monthly', 'Which one(s)': 'Every', Interval: 'Monthly' })
  ], 1, new Date(2026, 10, 1));
  const undated = calendar.months[0].undatedEvents;

  assert.deepEqual(undated.map(event => event.title).sort(), [
    'Appointment Pantry',
    'Invalid Monthly',
    'Varies Pantry'
  ]);
  assert.match(undated.find(event => event.title === 'Invalid Monthly').reasons[0], /cannot use “Every”/);
});

test('lists selected resources with any FALSE row once, using their short name and available times', () => {
  const calendar = buildCalendar([
    row({
      'Resource ID': 'false-resource',
      'Name of Resource': 'Long Resource Name',
      'Short name': 'Short Name',
      'Available times': 'Monday–Friday, 9 AM–5 PM',
      'Calendar event': 'TRUE'
    }),
    row({
      'Resource ID': 'false-resource',
      'Name of Resource': '',
      'Short name': '',
      'Available times': '',
      'Calendar event': false
    }),
    row({ 'Resource ID': 'blank-resource', 'Calendar event': '' }),
    row({ 'Resource ID': 'unknown-resource', 'Calendar event': 'unknown' })
  ], 2, new Date(2026, 10, 1));

  assert.deepEqual(calendar.falseResources, [{
    id: 'false-resource',
    shortName: 'Short Name',
    availableTimes: ['Monday–Friday, 9 AM–5 PM']
  }]);
});

test('marks TRUE* rows and ambiguous time exceptions for confirmation', () => {
  const calendar = buildCalendar([
    row({ 'Calendar event': 'TRUE*', 'Time exceptions': 'Confirm before visiting' })
  ], 1, new Date(2026, 10, 1));

  const event = day(calendar.months[0], 2).events[0];
  assert.equal(event.needsConfirmation, true);
  assert.deepEqual(event.notes, ['Confirm before visiting']);
});

test('marks only months that contain a confirmation entry', () => {
  const calendar = buildCalendar([
    row({ 'Calendar event': 'TRUE*', 'Which one(s)': '5th', Interval: 'Monthly' })
  ], 2, new Date(2026, 10, 1));

  assert.equal(calendar.months[0].hasConfirmationMarker, true);
  assert.equal(calendar.months[1].hasConfirmationMarker, false);
});

test('omits federal holiday closures, marks actual weekend holidays, and omits observed weekdays', () => {
  const thanksgiving = buildCalendar([
    row({ 'Resource ID': 'thanksgiving', 'Day(s) of week': 'Thursday', 'Time exceptions': 'Closed holidays' })
  ], 1, new Date(2026, 10, 1));
  assert.equal(day(thanksgiving.months[0], 26).events.length, 0);

  const independenceDay = buildCalendar([
    row({ 'Resource ID': 'holiday-hours', 'Event label': 'Hours', 'Day(s) of week': 'Saturday', 'Time exceptions': 'Closed holidays' }),
    row({ 'Resource ID': 'holiday-hours', 'Name of Resource': '', 'Event label': 'Hours', 'Day(s) of week': 'Friday', 'Time exceptions': 'Closed holidays' })
  ], 1, new Date(2026, 6, 1));
  const july = independenceDay.months[0];

  assert.equal(day(july, 3).events.length, 0);
  assert.equal(day(july, 4).events[0].needsConfirmation, true);
  assert.match(day(july, 4).events[0].notes.join(' '), /Weekend federal holiday/);
});

test('limits calendar ranges to six months and rejects invalid dates or counts', () => {
  const sixMonths = buildCalendar([], 6, new Date(2026, 10, 1));
  assert.deepEqual(sixMonths.months.map(month => month.title), [
    'November 2026',
    'December 2026',
    'January 2027',
    'February 2027',
    'March 2027',
    'April 2027'
  ]);
  assert.throws(() => buildCalendar([], 7, new Date(2026, 10, 1)), RangeError);
  assert.throws(() => buildCalendar([], 1, new Date('invalid')), TypeError);
});
