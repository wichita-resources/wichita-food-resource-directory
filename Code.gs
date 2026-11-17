/**
 * Wichita Food Resource Directory
 * Standalone Google Apps Script web app.
 * Configure SPREADSHEET_ID below. SHEET_NAME may be left blank to auto-detect
 * the first sheet containing the directory's required column headers.
 */
const DIRECTORY_CONFIG = {
  SPREADSHEET_ID: '1mkEp1bDZ2XYpyJ5y3vHoRetm23aH-uWjcmmomz1ctJ0',
  SHEET_NAME: '',
  TITLE: 'Wichita Food Resource Directory'
};

const PUBLIC_COLUMNS = [
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
  'Whole Resource Verified Date'
];

const GEOCODE_COLUMNS = ['Latitude', 'Longitude'];

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle(DIRECTORY_CONFIG.TITLE)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** Returns only public-facing directory fields; administrative verification columns stay private. */
function getDirectoryData() {
  if (!DIRECTORY_CONFIG.SPREADSHEET_ID || DIRECTORY_CONFIG.SPREADSHEET_ID.indexOf('PASTE_') === 0) {
    throw new Error('The spreadsheet ID has not been configured. Follow the setup instructions in README.txt.');
  }

  const ss = SpreadsheetApp.openById(DIRECTORY_CONFIG.SPREADSHEET_ID);
  const sheet = findDirectorySheet_(ss);
  if (!sheet) {
    throw new Error('Could not find a sheet containing the required directory headers. Check the sheet tab and column names.');
  }

  let values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return { columns: PUBLIC_COLUMNS, resources: [], updatedAt: new Date().toISOString() };

  let headers = values[0].map(h => String(h || '').trim());
  const latIndex = ensureHeaderColumn_(sheet, headers, 'Latitude');
  const lngIndex = ensureHeaderColumn_(sheet, headers, 'Longitude');
  values = sheet.getDataRange().getDisplayValues();
  headers = values[0].map(h => String(h || '').trim());

  const indexes = {};
  PUBLIC_COLUMNS.forEach(column => {
    indexes[column] = [];
    headers.forEach((header, index) => {
      if (header.toLowerCase() === column.toLowerCase()) indexes[column].push(index);
    });
  });

  const missing = PUBLIC_COLUMNS.filter(column => !['Location notes', 'Whole Resource Verified Date'].includes(column) && indexes[column].length === 0);
  if (missing.length) throw new Error('Missing required column(s): ' + missing.join(', '));

  const idIndexes = [];
  headers.forEach((header, index) => { if (header.toLowerCase() === 'resource id') idIndexes.push(index); });

  const resources = values.slice(1).map((row, rowIndex) => {
    const item = {};
    PUBLIC_COLUMNS.forEach(column => {
      const candidates = indexes[column].map(index => String(row[index] || '').trim());
      item[column] = candidates.find(value => value !== '') || '';
    });

    const latitude = normalizeCoordinate_(pickFirstNonEmpty_(row, headers, 'Latitude'));
    const longitude = normalizeCoordinate_(pickFirstNonEmpty_(row, headers, 'Longitude'));

    item._id = idIndexes.map(index => String(row[index] || '').trim()).find(value => value !== '') || ('row-' + (rowIndex + 2));
    item.latitude = latitude;
    item.longitude = longitude;

    return item;
  }).filter(item => item['Name of Resource']);

  return {
    columns: PUBLIC_COLUMNS,
    resources: resources,
    updatedAt: new Date().toISOString(),
    sheetName: sheet.getName()
  };
}

function ensureHeaderColumn_(sheet, headers, label) {
  const index = headers.findIndex(header => header.toLowerCase() === label.toLowerCase());
  if (index !== -1) return index;

  const nextColumn = sheet.getLastColumn() + 1;
  sheet.getRange(1, nextColumn).setValue(label);
  headers.push(label);
  return nextColumn - 1;
}

function pickFirstNonEmpty_(row, headers, label) {
  const columns = [];
  headers.forEach((header, index) => {
    if (header.toLowerCase() === label.toLowerCase()) columns.push(index);
  });

  for (let i = 0; i < columns.length; i++) {
    const value = String(row[columns[i]] || '').trim();
    if (value) return value;
  }
  return '';
}

function normalizeCoordinate_(value) {
  if (!value && value !== 0) return '';
  const numeric = Number(String(value).replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(numeric) || numeric === 0) return '';
  if (String(value).includes(',')) return '';
  return numeric;
}

function findDirectorySheet_(ss) {
  if (DIRECTORY_CONFIG.SHEET_NAME) {
    const named = ss.getSheetByName(DIRECTORY_CONFIG.SHEET_NAME);
    if (named) return named;
  }
  const required = ['Name of Resource', 'Location', 'Available products or services', 'Accessibility', 'Area'];
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    const lastColumn = sheets[i].getLastColumn();
    if (!lastColumn) continue;
    const headers = sheets[i].getRange(1, 1, 1, lastColumn).getDisplayValues()[0]
      .map(value => String(value || '').trim().toLowerCase());
    if (required.every(name => headers.indexOf(name.toLowerCase()) !== -1)) return sheets[i];
  }
  return null;
}

function saveResourceCoordinates(resourceId, latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return { saved: false, reason: 'Invalid coordinates' };
  if (lat < 37.35 || lat > 38.05 || lon < -97.75 || lon > -97.05) {
    return { saved: false, reason: 'Coordinates outside the Wichita area' };
  }

  const ss = SpreadsheetApp.openById(DIRECTORY_CONFIG.SPREADSHEET_ID);
  const sheet = findDirectorySheet_(ss);
  if (!sheet) return { saved: false, reason: 'Directory sheet not found' };

  const values = sheet.getDataRange().getDisplayValues();
  const headers = values[0].map(h => String(h || '').trim());
  const latIndex = ensureHeaderColumn_(sheet, headers, 'Latitude');
  const lngIndex = ensureHeaderColumn_(sheet, headers, 'Longitude');
  const idIndexes = [];

  headers.forEach((header, index) => {
    if (header.toLowerCase() === 'resource id') idIndexes.push(index);
  });

  let targetRow = -1;
  if (typeof resourceId === 'string' && resourceId.indexOf('row-') === 0) {
    targetRow = Number(resourceId.replace('row-', ''));
  } else {
    for (let rowIndex = 1; rowIndex < values.length; rowIndex++) {
      const matches = idIndexes.some(index => String(values[rowIndex][index] || '').trim() === String(resourceId));
      if (matches) {
        targetRow = rowIndex + 1;
        break;
      }
    }
  }

  if (!targetRow || targetRow < 2 || targetRow > sheet.getLastRow()) {
    return { saved: false, reason: 'Resource not found' };
  }

  sheet.getRange(targetRow, latIndex + 1).setValue(lat);
  sheet.getRange(targetRow, lngIndex + 1).setValue(lon);
  SpreadsheetApp.flush();
  return { saved: true, sheetRow: targetRow, latitude: lat, longitude: lon };
}

function diagnoseDirectoryData() {
  const ss = SpreadsheetApp.openById(DIRECTORY_CONFIG.SPREADSHEET_ID);
  const sheet = findDirectorySheet_(ss);
  if (!sheet) throw new Error('Directory sheet not found');

  const values = sheet.getDataRange().getDisplayValues();
  const headers = values[0].map(h => String(h || '').trim());
  const findIndex = label => headers.findIndex(h => h.toLowerCase() === label.toLowerCase());
  const nameIndex = findIndex('Name of Resource');
  const locationIndex = findIndex('Location');
  const latIndex = findIndex('Latitude');
  const lonIndex = findIndex('Longitude');
  const idIndex = findIndex('Resource ID');

  const report = {
    sheetName: sheet.getName(),
    rowCount: values.length,
    nameIndex: nameIndex,
    locationIndex: locationIndex,
    latitudeIndex: latIndex,
    longitudeIndex: lonIndex,
    resourceIdIndex: idIndex,
    rows: values.slice(1, 11).map((row, index) => ({
      sheetRow: index + 2,
      name: nameIndex >= 0 ? row[nameIndex] : '',
      location: locationIndex >= 0 ? row[locationIndex] : '',
      latitude: latIndex >= 0 ? row[latIndex] : '',
      longitude: lonIndex >= 0 ? row[lonIndex] : ''
    }))
  };

  Logger.log(report);
  return report;
}
