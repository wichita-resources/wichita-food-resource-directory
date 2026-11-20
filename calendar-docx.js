(function (root, factory) {
  const calendarDocx = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = calendarDocx;
  } else {
    root.CalendarDocx = calendarDocx;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const encoder = new TextEncoder();
  const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const CRC_TABLE = Array.from({ length: 256 }, (_, value) => {
    let crc = value;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    return crc >>> 0;
  });

  function xmlText(value) {
    return String(value == null ? '' : value)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function paragraph(text, options = {}) {
    const properties = [];
    if (options.pageBreakBefore) properties.push('<w:pageBreakBefore/>');
    if (options.alignment) properties.push('<w:jc w:val="' + options.alignment + '"/>');
    if (options.spaceAfter != null) {
      properties.push('<w:spacing w:after="' + options.spaceAfter + '"/>');
    }
    const paragraphProperties = properties.length
      ? '<w:pPr>' + properties.join('') + '</w:pPr>'
      : '';
    const runProperties = [
      options.bold ? '<w:b/>' : '',
      options.fontSize ? '<w:sz w:val="' + options.fontSize + '"/><w:szCs w:val="' + options.fontSize + '"/>' : ''
    ].join('');
    return '<w:p>' + paragraphProperties + '<w:r>' +
      (runProperties ? '<w:rPr>' + runProperties + '</w:rPr>' : '') +
      '<w:t xml:space="preserve">' + xmlText(text) + '</w:t></w:r></w:p>';
  }

  function tableCell(content, fill, width) {
    return '<w:tc><w:tcPr><w:tcW w:w="' + width + '" w:type="dxa"/>' +
      '<w:shd w:fill="' + fill + '"/>' +
      '<w:tcMar><w:top w:w="55" w:type="dxa"/><w:left w:w="65" w:type="dxa"/>' +
      '<w:bottom w:w="55" w:type="dxa"/><w:right w:w="65" w:type="dxa"/></w:tcMar>' +
      '<w:vAlign w:val="top"/></w:tcPr>' +
      (content || '<w:p/>') + '</w:tc>';
  }

  function tableRow(cells) {
    return '<w:tr><w:trPr><w:cantSplit/></w:trPr>' + cells.join('') + '</w:tr>';
  }

  function eventParagraphs(event) {
    const marker = event.needsConfirmation ? ' *' : '';
    const lines = [
      paragraph(event.title + marker, { bold: true, fontSize: 14, spaceAfter: 0 })
    ];
    if (event.times.length) {
      lines.push(paragraph(event.times.join('; '), { fontSize: 14, spaceAfter: 0 }));
    }
    event.notes.forEach(note => lines.push(paragraph(note, { fontSize: 14, spaceAfter: 0 })));
    return lines.join('');
  }

  function monthTable(month) {
    const width = 2119;
    const header = tableRow(weekdays.map(day =>
      tableCell(paragraph(day, { bold: true, fontSize: 16, alignment: 'center', spaceAfter: 0 }), 'D9E2F3', width)
    ));
    const weeks = month.weeks.map(week => tableRow(week.map(cell => {
      if (!cell) return tableCell('', 'F0F0F0', width);
      const contents = [
        paragraph(String(cell.dayNumber), { bold: true, fontSize: 16, spaceAfter: 40 }),
        ...cell.events.map(event => eventParagraphs(event))
      ].join('');
      return tableCell(contents, 'FFFFFF', width);
    }))).join('');
    const borders = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
      .map(edge => '<w:' + edge + ' w:val="single" w:sz="4" w:color="AAB3C0"/>')
      .join('');
    const grid = weekdays.map(() => '<w:gridCol w:w="' + width + '"/>').join('');
    return '<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>' +
      '<w:tblLayout w:type="fixed"/><w:tblBorders>' + borders + '</w:tblBorders></w:tblPr>' +
      '<w:tblGrid>' + grid + '</w:tblGrid>' + header + weeks + '</w:tbl>';
  }

  function monthContent(month, falseResources, index) {
    const content = [
      paragraph(month.title, { bold: true, fontSize: 28, pageBreakBefore: index > 0, spaceAfter: 120 }),
      monthTable(month)
    ];
    const hasDatedEvents = month.weeks.some(week => week.some(cell => cell && cell.events.length));
    if (!hasDatedEvents && !month.undatedEvents.length) {
      content.push(paragraph('No scheduled calendar events for this month.', { spaceAfter: 80 }));
    }
    if (month.undatedEvents.length) {
      content.push(paragraph('Schedules to confirm', { bold: true, fontSize: 18, spaceAfter: 40 }));
      month.undatedEvents.forEach(event => {
        const title = event.title + (event.needsConfirmation ? ' *' : '');
        const details = [
          event.reasons.join(' '),
          event.times.length ? 'Times: ' + event.times.join('; ') + '.' : '',
          event.notes.length ? 'Notes: ' + event.notes.join('; ') + '.' : ''
        ].filter(Boolean).join(' ');
        content.push(paragraph(title + ' — ' + details, { fontSize: 16, spaceAfter: 30 }));
      });
    }
    if (month.hasConfirmationMarker) {
      content.push(paragraph('* Confirm before visiting. This marks an unconfirmed schedule or holiday occurrence.', {
        fontSize: 16,
        spaceAfter: 80
      }));
    }
    if (falseResources.length) {
      content.push(paragraph('Resources not included as calendar events', {
        bold: true,
        fontSize: 18,
        spaceAfter: 40
      }));
      falseResources.forEach(resource => {
        const times = resource.availableTimes.length
          ? resource.availableTimes.join('; ')
          : 'Available times not specified';
        content.push(paragraph(resource.shortName + ' — ' + times, { fontSize: 16, spaceAfter: 30 }));
      });
    }
    return content.join('');
  }

  function documentXml(calendar) {
    if (!calendar || !Array.isArray(calendar.months) || !Array.isArray(calendar.falseResources)) {
      throw new TypeError('Expected calendar months and FALSE resources for document export.');
    }
    const body = calendar.months.map((month, index) =>
      monthContent(month, calendar.falseResources, index)
    ).join('');
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
      body +
      '<w:sectPr><w:pgSz w:w="15840" w:h="12240" w:orient="landscape"/>' +
      '<w:pgMar w:top="504" w:right="504" w:bottom="504" w:left="504" w:header="0" w:footer="0" w:gutter="0"/>' +
      '</w:sectPr></w:body></w:document>';
  }

  function crc32(bytes) {
    let crc = 0xffffffff;
    bytes.forEach(byte => {
      crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    });
    return (crc ^ 0xffffffff) >>> 0;
  }

  function concatBytes(parts) {
    const length = parts.reduce((total, part) => total + part.length, 0);
    const result = new Uint8Array(length);
    let offset = 0;
    parts.forEach(part => {
      result.set(part, offset);
      offset += part.length;
    });
    return result;
  }

  function createZip(files) {
    const localParts = [];
    const centralParts = [];
    let localLength = 0;

    files.forEach(file => {
      const name = encoder.encode(file.name);
      const data = encoder.encode(file.content);
      const crc = crc32(data);
      const localHeader = new Uint8Array(30);
      const localView = new DataView(localHeader.buffer);
      localView.setUint32(0, 0x04034b50, true);
      localView.setUint16(4, 20, true);
      localView.setUint16(6, 0x0800, true);
      localView.setUint16(8, 0, true);
      localView.setUint16(12, 0x21, true);
      localView.setUint32(14, crc, true);
      localView.setUint32(18, data.length, true);
      localView.setUint32(22, data.length, true);
      localView.setUint16(26, name.length, true);
      localParts.push(localHeader, name, data);

      const centralHeader = new Uint8Array(46);
      const centralView = new DataView(centralHeader.buffer);
      centralView.setUint32(0, 0x02014b50, true);
      centralView.setUint16(4, 20, true);
      centralView.setUint16(6, 20, true);
      centralView.setUint16(8, 0x0800, true);
      centralView.setUint16(10, 0, true);
      centralView.setUint16(14, 0x21, true);
      centralView.setUint32(16, crc, true);
      centralView.setUint32(20, data.length, true);
      centralView.setUint32(24, data.length, true);
      centralView.setUint16(28, name.length, true);
      centralView.setUint32(42, localLength, true);
      centralParts.push(centralHeader, name);
      localLength += localHeader.length + name.length + data.length;
    });

    const centralDirectory = concatBytes(centralParts);
    const end = new Uint8Array(22);
    const endView = new DataView(end.buffer);
    endView.setUint32(0, 0x06054b50, true);
    endView.setUint16(8, files.length, true);
    endView.setUint16(10, files.length, true);
    endView.setUint32(12, centralDirectory.length, true);
    endView.setUint32(16, localLength, true);
    return concatBytes([...localParts, centralDirectory, end]);
  }

  function createCalendarDocx(calendar) {
    const files = [
      {
        name: '[Content_Types].xml',
        content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
          '</Types>'
      },
      {
        name: '_rels/.rels',
        content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
          '</Relationships>'
      },
      { name: 'word/document.xml', content: documentXml(calendar) }
    ];
    return createZip(files);
  }

  return { createCalendarDocx };
});
