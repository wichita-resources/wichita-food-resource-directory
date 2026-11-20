(function (root, factory) {
  const resourceNormalization = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = resourceNormalization;
  } else {
    root.ResourceNormalization = resourceNormalization;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const searchableColumns = [
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

  const resourceFields = new Set([
    ...searchableColumns,
    'Short name',
    'Resource ID',
    'Event label',
    'Calendar event',
    'Which one(s)',
    'Day(s) of week',
    'Interval',
    'Time',
    'Time exceptions'
  ]);

  const calendarHeaderAliases = new Map([
    ['short name', 'Short name'],
    ['event label', 'Event label'],
    ['calendar event', 'Calendar event'],
    ['which one(s)', 'Which one(s)'],
    ['day(s) of week', 'Day(s) of week'],
    ['day(s) of the week', 'Day(s) of week'],
    ['interval', 'Interval'],
    ['time', 'Time'],
    ['time exceptions', 'Time exceptions']
  ]);

  function clean(value) {
    return value == null ? '' : String(value).trim();
  }

  function canonicalizeCalendarHeader(value) {
    const label = clean(value);
    return calendarHeaderAliases.get(label.toLowerCase()) || label;
  }

  function normalizeCoordinate(value) {
    const text = clean(value);
    if (!text) return null;

    const number = Number(text);
    if (!Number.isFinite(number) || number === 0) return null;
    return number;
  }

  function normalizeLatitude(value) {
    const latitude = normalizeCoordinate(value);
    return latitude != null && latitude >= -90 && latitude <= 90 ? latitude : null;
  }

  function normalizeLongitude(value) {
    const longitude = normalizeCoordinate(value);
    return longitude != null && longitude >= -180 && longitude <= 180 ? longitude : null;
  }

  function normalizeGvizTable(table) {
    if (!table || !Array.isArray(table.cols)) {
      throw new TypeError('Expected a Google Visualization table with columns.');
    }

    const rows = table.rows == null ? [] : table.rows;
    if (!Array.isArray(rows)) {
      throw new TypeError('Expected Google Visualization table rows to be an array.');
    }

    const labels = table.cols.map((column, index) =>
      canonicalizeCalendarHeader(
        clean(column && column.label) || String((column && column.id) || '') || ('Column ' + (index + 1))
      )
    );
    const normalizedRows = rows.map((row, rowIndex) => {
      const resource = { _id: 'row-' + (rowIndex + 2) };
      labels.forEach((label, index) => {
        if (!resourceFields.has(label)) return;

        const cell = row.c && row.c[index];
        const formattedCalendarFlag = label === 'Calendar event' && cell && /\*/.test(String(cell.f || ''));
        resource[label] = cell
          ? String(formattedCalendarFlag ? cell.f : (cell.v == null ? (cell.f == null ? '' : cell.f) : cell.v)).trim()
          : '';
      });

      resource._id = clean(resource['Resource ID']) || resource._id;
      resource.latitude = normalizeLatitude(resource.Latitude);
      resource.longitude = normalizeLongitude(resource.Longitude);
      return resource;
    });
    const resources = normalizedRows.filter(resource => clean(resource['Name of Resource']));
    const calendarRows = normalizedRows.filter(resource => clean(resource['Resource ID']));

    return {
      columns: searchableColumns.filter(label => labels.includes(label)),
      resources,
      calendarRows,
      sheetName: 'Google Sheet'
    };
  }

  return { normalizeCoordinate, normalizeGvizTable };
});
