const assert = require('node:assert/strict');
const test = require('node:test');
const { buildPrintableList, describeResource, formatLocation } = require('../print-list-logic');

function resource(name, overrides = {}) {
  return { 'Short name': name, Interval: '', Restrictions: '', ...overrides };
}

test('sorts daily, weekly, and monthly resources before once-only and unknown schedules', () => {
  const resources = [
    resource('Unknown'),
    resource('Monthly', { Interval: 'Monthly' }),
    resource('Weekly', { Interval: 'Weekly' }),
    resource('Once', { Interval: 'Once' }),
    resource('Daily', { Interval: 'Daily' })
  ];

  assert.deepEqual(buildPrintableList(resources).map(item => item['Short name']), [
    'Daily',
    'Weekly',
    'Monthly',
    'Unknown',
    'Once'
  ]);
});

test('uses monthly and one-time family restrictions before the interval', () => {
  const resources = [
    resource('Family', { Interval: 'Daily', Restrictions: 'One time per family' }),
    resource('30 days', { Interval: 'Weekly', Restrictions: 'Once every 30 days' }),
    resource('Interval weekly', { Interval: 'Weekly' }),
    resource('Family monthly', { Interval: 'Daily', Restrictions: 'One time per family per month' })
  ];

  assert.deepEqual(buildPrintableList(resources).map(item => item['Short name']), [
    'Interval weekly',
    '30 days',
    'Family monthly',
    'Family'
  ]);
});

test('preserves input order for resources in the same frequency group', () => {
  const resources = [
    resource('First daily', { Interval: 'Daily' }),
    resource('Second daily', { Interval: 'Daily' }),
    resource('Monthly', { Interval: 'Monthly' }),
    resource('Once per month', { Restrictions: 'Once a month' })
  ];

  assert.deepEqual(buildPrintableList(resources).map(item => item['Short name']), [
    'First daily',
    'Second daily',
    'Monthly',
    'Once per month'
  ]);
});

test('rejects invalid input explicitly', () => {
  assert.throws(() => buildPrintableList(null), TypeError);
});

test('replaces the Wichita Blessing Box map URL with a concise printed location', () => {
  const location = 'Multiple locations throughout Wichita: https://www.google.com/maps/d/u/0/viewer?hl=en&ll=37.8273323005274%2C-97.42348063793942&z=10&mid=1HIRASPUsfmDN7CSe2Jm69UGrib4';

  assert.equal(
    formatLocation(location, ''),
    'Multiple locations throughout Wichita. Online map available.'
  );
  assert.equal(
    formatLocation(location, 'See map for nearby boxes'),
    'Multiple locations throughout Wichita. Online map available. See map for nearby boxes'
  );
});

test('keeps ordinary locations and appends their location notes', () => {
  assert.equal(formatLocation('123 Main St', 'Entrance on the east side'), '123 Main St, Entrance on the east side');
});

test('describes printable details without labels and conditionally includes accessibility', () => {
  const source = resource('Pantry', {
    'Name of Resource': 'Community Pantry',
    'Available times': 'Monday, 9 AM–12 PM',
    'Resource type': 'Food pantry',
    'Available products or services': 'food-pantry',
    'Required documentation': 'Photo ID',
    Restrictions: 'photo id',
    Accessibility: 'Wheelchair accessible',
    Location: '123 Main St',
    'Location notes': 'Use side entrance',
    Phone: '316-555-0100',
    'Website/URL': 'example.org'
  });

  assert.deepEqual(describeResource(source, false), {
    shortName: 'Pantry',
    availableTimes: 'Monday, 9 AM–12 PM',
    details: ['Food pantry', 'Photo ID', '123 Main St, Use side entrance'],
    phone: '316-555-0100',
    website: 'example.org'
  });
  assert.deepEqual(describeResource(source, true).details, [
    'Food pantry',
    'Photo ID',
    'Wheelchair accessible',
    '123 Main St, Use side entrance'
  ]);
});
