const assert = require('node:assert/strict');
const test = require('node:test');
const { createPrintableListDocx } = require('../calendar-docx');

test('exports printable resource entries in a Google Docs-compatible DOCX', () => {
  const docx = createPrintableListDocx([{
    shortName: 'Pantry & Meals',
    availableTimes: 'Monday, 9 AM–12 PM',
    details: ['Food pantry', 'Photo ID required', '123 Main St'],
    phone: '316-555-0100',
    website: 'https://example.org'
  }]);

  assert.deepEqual(Array.from(docx.slice(0, 4)), [0x50, 0x4b, 0x03, 0x04]);
  const packageText = new TextDecoder().decode(docx);
  assert.match(packageText, /word\/document\.xml/);
  assert.match(packageText, /My Wichita Resource List/);
  assert.match(packageText, /<w:b\/><\/w:rPr><w:t xml:space="preserve">Pantry &amp; Meals<\/w:t>/);
  assert.match(packageText, /Monday, 9 AM–12 PM/);
  assert.match(packageText, /<w:ind w:left="360"\/>/);
  assert.match(packageText, /Food pantry/);
  assert.match(packageText, /Photo ID required/);
  assert.match(packageText, /123 Main St/);
  assert.match(packageText, /316-555-0100 \| https:\/\/example\.org/);
  assert.match(packageText, /<w:pgSz w:w="12240" w:h="15840"\/>/);
});

test('rejects invalid printable-list document data explicitly', () => {
  assert.throws(() => createPrintableListDocx(null), TypeError);
  assert.throws(() => createPrintableListDocx([{}]), TypeError);
});

test('uses a provided translated printable-list title', () => {
  const docx = createPrintableListDocx([{
    shortName: 'Pantry',
    availableTimes: 'lunes',
    details: ['Despensa de alimentos'],
    phone: '',
    website: ''
  }], 'Mi lista de recursos');

  assert.match(new TextDecoder().decode(docx), /Mi lista de recursos/);
  assert.match(new TextDecoder().decode(docx), /Despensa de alimentos/);
});
