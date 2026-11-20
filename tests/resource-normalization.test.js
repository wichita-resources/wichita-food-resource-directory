const assert = require('node:assert/strict');
const test = require('node:test');
const { normalizeGvizTable } = require('../resource-normalization');

const existingFields = [
  'Name of Resource',
  'Location',
  'Location notes',
  'Available products or services',
  'Required documentation',
  'Phone',
  'Website/URL',
  'Resource type',
  'Available times',
  'Restrictions',
  'Accessibility',
  'Area',
  'Whole Resource Verified Date',
  'Latitude',
  'Longitude'
];

const calendarFields = [
  'Event label',
  'Calendar event',
  'Which one(s)',
  'Day(s) of week',
  'Interval',
  'Time',
  'Time exceptions'
];

function makeTable(headers, rows) {
  return {
    cols: headers.map(label => ({ label })),
    rows: rows.map(values => ({ c: values.map(value => value == null ? null : { v: value }) }))
  };
}

test('projects only app fields and keeps calendar values out of searchable columns', () => {
  const headers = [...existingFields, ...calendarFields, 'Resource ID', 'Admin review notes'];
  const values = [
    'Community pantry',
    'Wichita',
    '',
    'Groceries',
    '',
    '316-555-0100',
    '',
    'Food pantry',
    'Monday',
    '',
    'Wheelchair accessible',
    'North',
    '2026-10-31',
    '37.7',
    '-97.3',
    'Weekly pantry',
    'Food pickup',
    'One',
    'Monday',
    '1',
    '10:00',
    'Closed holidays',
    'resource-123',
    'do not include'
  ];

  const result = normalizeGvizTable(makeTable(headers, [values]));
  const [resource] = result.resources;

  assert.deepEqual(result.columns, existingFields);
  assert.equal(result.sheetName, 'Google Sheet');
  assert.equal(resource['Resource ID'], 'resource-123');
  assert.equal(resource._id, 'resource-123');
  assert.equal(resource['Whole Resource Verified Date'], '2026-10-31');
  assert.equal(resource['Event label'], 'Weekly pantry');
  assert.equal(resource['Calendar event'], 'Food pickup');
  assert.equal(resource['Which one(s)'], 'One');
  assert.equal(resource['Day(s) of week'], 'Monday');
  assert.equal(resource.Interval, '1');
  assert.equal(resource.Time, '10:00');
  assert.equal(resource['Time exceptions'], 'Closed holidays');
  assert.equal(resource.latitude, 37.7);
  assert.equal(resource.longitude, -97.3);
  assert.equal(Object.hasOwn(resource, 'Admin review notes'), false);
});

test('keeps resources with unusable coordinates and drops rows without a name', () => {
  const headers = ['Name of Resource', 'Latitude', 'Longitude', 'Resource ID'];
  const result = normalizeGvizTable(makeTable(headers, [
    ['No usable latitude', '37.2 west', '-97.3', 'resource-1'],
    ['Out of range latitude', '91', '-97.3', 'resource-2'],
    ['Zero coordinate', '0', '-97.3', 'resource-3'],
    ['Out of range longitude', '37.7', '181', 'resource-4'],
    ['', '37.7', '-97.3', 'resource-4']
  ]));

  assert.equal(result.resources.length, 4);
  assert.deepEqual(result.resources.map(resource => resource['Name of Resource']), [
    'No usable latitude',
    'Out of range latitude',
    'Zero coordinate',
    'Out of range longitude'
  ]);
  assert.deepEqual(result.resources.map(resource => resource.latitude), [null, null, null, 37.7]);
  assert.deepEqual(result.resources.map(resource => resource.longitude), [-97.3, -97.3, -97.3, null]);
});

test('uses a stable row fallback when a resource has no Resource ID', () => {
  const result = normalizeGvizTable(makeTable(['Name of Resource'], [
    ['First resource'],
    ['Second resource']
  ]));

  assert.deepEqual(result.resources.map(resource => resource._id), ['row-2', 'row-3']);
});

test('rejects malformed GViz tables explicitly', () => {
  assert.throws(() => normalizeGvizTable({ rows: [] }), TypeError);
  assert.throws(() => normalizeGvizTable({ cols: [], rows: {} }), TypeError);
});
