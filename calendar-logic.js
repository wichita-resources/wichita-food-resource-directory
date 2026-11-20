(function (root, factory) {
  const calendarLogic = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = calendarLogic;
  } else {
    root.CalendarLogic = calendarLogic;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const MAX_MONTHS = 6;
  const DAY_NAMES = {
    sunday: 0, sun: 0,
    monday: 1, mon: 1,
    tuesday: 2, tue: 2, tues: 2,
    wednesday: 3, wed: 3, weds: 3,
    thursday: 4, thu: 4, thur: 4, thurs: 4,
    friday: 5, fri: 5,
    saturday: 6, sat: 6
  };
  const DAY_PATTERN = /\b(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday|sund?|mon|tues?|wed(?:s)?|thurs?|fri|sat)\b/gi;
  const ORDINAL_PATTERN = /\b(\d+)(?:st|nd|rd|th)\b/gi;

  function clean(value) {
    return value == null ? '' : String(value).trim();
  }

  function calendarFlag(value) {
    const flag = clean(value).toLowerCase().replace(/\s/g, '');
    if (flag === 'true') return { include: true, needsConfirmation: false };
    if (flag === 'true*') return { include: true, needsConfirmation: true };
    return null;
  }

  function dayNumber(token) {
    return DAY_NAMES[token.toLowerCase()] ?? null;
  }

  function expandDayRange(start, end) {
    const days = [start];
    while (days[days.length - 1] !== end) {
      days.push((days[days.length - 1] + 1) % 7);
    }
    return days;
  }

  function parseWeekdays(value) {
    const text = clean(value).toLowerCase();
    if (text === 'daily') return [0, 1, 2, 3, 4, 5, 6];
    if (!text) return null;

    const range = text.match(/^\s*([a-z]+)\s*(?:-|–|—|\bto\b)\s*([a-z]+)\s*$/i);
    if (range) {
      const start = dayNumber(range[1]);
      const end = dayNumber(range[2]);
      return start === null || end === null ? null : expandDayRange(start, end);
    }

    const tokens = Array.from(text.matchAll(DAY_PATTERN), match => match[0].toLowerCase());
    if (!tokens.length) return null;

    const remainder = text.replace(DAY_PATTERN, '').replace(/\b(?:and|to)\b/g, '').replace(/[\s,./&–—-]/g, '');
    if (remainder) return null;
    return Array.from(new Set(tokens.map(dayNumber)));
  }

  function parseOrdinals(value) {
    const text = clean(value).toLowerCase();
    const matches = Array.from(text.matchAll(ORDINAL_PATTERN), match => Number(match[1]));
    if (!matches.length) return null;

    const remainder = text.replace(ORDINAL_PATTERN, '').replace(/\b(?:and|or)\b/g, '').replace(/[,\s]/g, '');
    if (remainder || matches.some(value => value < 1 || value > 5)) return null;
    return Array.from(new Set(matches));
  }

  function isBusinessHoursLabel(value) {
    const label = clean(value);
    if (!label || /^daily$/i.test(label)) return false;
    return parseWeekdays(label) !== null;
  }

  function holidayDate(year, month, day) {
    return new Date(year, month, day);
  }

  function observedDate(date) {
    const observed = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    if (observed.getDay() === 6) observed.setDate(observed.getDate() - 1);
    else if (observed.getDay() === 0) observed.setDate(observed.getDate() + 1);
    return observed;
  }

  function nthWeekday(year, month, weekday, ordinal) {
    const first = new Date(year, month, 1).getDay();
    const day = 1 + ((weekday - first + 7) % 7) + ((ordinal - 1) * 7);
    const candidate = new Date(year, month, day);
    return candidate.getMonth() === month ? candidate : null;
  }

  function lastWeekday(year, month, weekday) {
    const lastDay = new Date(year, month + 1, 0).getDate();
    const last = new Date(year, month, lastDay);
    last.setDate(lastDay - ((last.getDay() - weekday + 7) % 7));
    return last;
  }

  function dateKey(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-');
  }

  function federalHolidays(year) {
    const holidays = [];
    const add = (name, date) => holidays.push({ name, actual: date, observed: observedDate(date) });
    const addNth = (name, month, weekday, ordinal) => add(name, nthWeekday(year, month, weekday, ordinal));

    add('New Year’s Day', holidayDate(year, 0, 1));
    addNth('Martin Luther King Jr. Day', 0, 1, 3);
    addNth('Washington’s Birthday', 1, 1, 3);
    add('Memorial Day', lastWeekday(year, 4, 1));
    add('Juneteenth National Independence Day', holidayDate(year, 5, 19));
    add('Independence Day', holidayDate(year, 6, 4));
    addNth('Labor Day', 8, 1, 1);
    addNth('Columbus Day', 9, 1, 2);
    add('Veterans Day', holidayDate(year, 10, 11));
    addNth('Thanksgiving Day', 10, 4, 4);
    add('Christmas Day', holidayDate(year, 11, 25));
    return holidays;
  }

  function holidayDatesForRange(firstYear, lastYear) {
    const byDate = new Map();
    for (let year = firstYear - 1; year <= lastYear + 1; year += 1) {
      federalHolidays(year).forEach(holiday => {
        [holiday.actual, holiday.observed].forEach((date, index) => {
          const key = dateKey(date);
          const dates = byDate.get(key) || [];
          dates.push({ ...holiday, isObserved: index === 1 && dateKey(holiday.actual) !== key });
          byDate.set(key, dates);
        });
      });
    }
    return byDate;
  }

  function exceptionInfo(value) {
    const text = clean(value);
    const closedHolidays = /\bclosed(?:\s+on)?\s+holidays?\b/i.test(text);
    const mentionsHoliday = /\bholidays?\b/i.test(text);
    const needsConfirmation = !closedHolidays &&
      (mentionsHoliday || /\b(confirm|verify|check before)\b/i.test(text));
    return { text, closedHolidays, needsConfirmation };
  }

  function recurrence(row) {
    const interval = clean(row.Interval).toLowerCase();
    const which = clean(row['Which one(s)']).toLowerCase();
    const dayText = clean(row['Day(s) of week']);

    if (which.includes('appointment')) {
      return { dates: null, reason: 'By appointment; contact the resource to confirm.' };
    }
    if (interval === 'varies') {
      return { dates: null, reason: 'Schedule varies; contact the resource to confirm.' };
    }

    if (interval === 'daily') {
      if (which !== 'every') return { dates: null, reason: 'Daily recurrence needs “Every” in Which one(s).' };
      const weekdays = parseWeekdays(dayText);
      if (dayText && (!weekdays || weekdays.length !== 7)) {
        return { dates: null, reason: 'Daily recurrence conflicts with the listed weekday(s).' };
      }
      return { kind: 'daily' };
    }

    if (interval === 'weekly') {
      if (which !== 'every') return { dates: null, reason: 'Weekly recurrence needs “Every” in Which one(s).' };
      const weekdays = parseWeekdays(dayText);
      if (!weekdays || !weekdays.length || dayText.toLowerCase() === 'daily') {
        return { dates: null, reason: 'Weekly recurrence needs one or more weekdays.' };
      }
      return { kind: 'weekly', weekdays };
    }

    if (interval === 'monthly') {
      if (which === 'every') {
        return { dates: null, reason: 'Monthly recurrence cannot use “Every”; correct the spreadsheet schedule.' };
      }
      const ordinals = parseOrdinals(which);
      const weekdays = parseWeekdays(dayText);
      if (!ordinals || !weekdays || !weekdays.length || dayText.toLowerCase() === 'daily') {
        return { dates: null, reason: 'Monthly recurrence needs ordinal occurrence(s) and weekday(s).' };
      }
      return { kind: 'monthly', ordinals, weekdays };
    }

    return { dates: null, reason: interval ? 'Unrecognized recurrence interval.' : 'Missing recurrence interval.' };
  }

  function occurrenceDays(pattern, year, month) {
    const lastDay = new Date(year, month + 1, 0).getDate();
    if (pattern.kind === 'daily') {
      return Array.from({ length: lastDay }, (_, index) => index + 1);
    }
    if (pattern.kind === 'weekly') {
      return Array.from({ length: lastDay }, (_, index) => index + 1).filter(day =>
        pattern.weekdays.includes(new Date(year, month, day).getDay())
      );
    }

    const days = new Set();
    pattern.ordinals.forEach(ordinal => {
      pattern.weekdays.forEach(weekday => {
        const date = nthWeekday(year, month, weekday, ordinal);
        if (date) days.add(date.getDate());
      });
    });
    return Array.from(days).sort((a, b) => a - b);
  }

  function monthTitle(year, month) {
    return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })
      .format(new Date(year, month, 1));
  }

  function makeMonth(year, month) {
    const offset = new Date(year, month, 1).getDay();
    const dayCount = new Date(year, month + 1, 0).getDate();
    const cellCount = Math.ceil((offset + dayCount) / 7) * 7;
    const weeks = [];
    const dayCells = new Map();

    for (let index = 0; index < cellCount; index += 1) {
      const dayNumber = index - offset + 1;
      let cell = null;
      if (dayNumber >= 1 && dayNumber <= dayCount) {
        cell = { dayNumber, date: dateKey(new Date(year, month, dayNumber)), events: [] };
        dayCells.set(dayNumber, cell);
      }
      const weekIndex = Math.floor(index / 7);
      if (!weeks[weekIndex]) weeks[weekIndex] = [];
      weeks[weekIndex].push(cell);
    }

    return {
      year,
      month,
      title: monthTitle(year, month),
      weeks,
      undatedEvents: [],
      dayCells
    };
  }

  function groupSchedules(rows) {
    const resourceShortNames = new Map();
    rows.forEach(row => {
      const id = clean(row['Resource ID']);
      const shortName = clean(row['Short name']);
      if (id && shortName && !resourceShortNames.has(id)) resourceShortNames.set(id, shortName);
    });

    const groups = new Map();
    rows.forEach(row => {
      const id = clean(row['Resource ID']);
      const flag = calendarFlag(row['Calendar event']);
      if (!id || !flag) return;

      const label = clean(row['Event label']);
      const businessHours = isBusinessHoursLabel(label);
      const groupLabel = label.toLocaleLowerCase();
      const key = id + (businessHours ? '|hours' : '|event:' + groupLabel);
      let group = groups.get(key);
      if (!group) {
        const shortName = resourceShortNames.get(id) || 'Short name missing';
        group = {
          id: key,
          resourceId: id,
          shortName,
          label: businessHours ? '' : label,
          title: businessHours || !label ? shortName : shortName + ' — ' + label,
          needsConfirmation: false,
          schedules: []
        };
        groups.set(key, group);
      }
      group.needsConfirmation = group.needsConfirmation || flag.needsConfirmation;
      group.schedules.push(row);
    });
    return Array.from(groups.values());
  }

  function resourcesWithFalseCalendarFlag(rows) {
    const falseResourceIds = new Set(rows
      .filter(row => clean(row['Calendar event']).toLowerCase() === 'false')
      .map(row => clean(row['Resource ID']))
      .filter(Boolean));
    const resources = new Map();

    rows.forEach(row => {
      const id = clean(row['Resource ID']);
      if (!falseResourceIds.has(id)) return;

      let resource = resources.get(id);
      if (!resource) {
        resource = { id, shortName: '', availableTimes: [] };
        resources.set(id, resource);
      }
      if (!resource.shortName) resource.shortName = clean(row['Short name']);
      addUnique(resource.availableTimes, row['Available times']);
    });

    return Array.from(resources.values()).map(resource => ({
      ...resource,
      shortName: resource.shortName || 'Short name missing'
    }));
  }

  function addUnique(list, value) {
    const text = clean(value);
    if (text && !list.includes(text)) list.push(text);
  }

  function holidayDisposition(date, closedHolidays, holidaysByDate) {
    if (!closedHolidays) return { closed: false, needsConfirmation: false, notes: [] };
    const holidays = holidaysByDate.get(dateKey(date)) || [];
    const actualWeekdayHoliday = holidays.some(holiday =>
      dateKey(holiday.actual) === dateKey(date) && date.getDay() !== 0 && date.getDay() !== 6
    );
    const observedWeekdayHoliday = holidays.some(holiday =>
      holiday.isObserved && date.getDay() !== 0 && date.getDay() !== 6
    );
    if (actualWeekdayHoliday || observedWeekdayHoliday) {
      return { closed: true, needsConfirmation: false, notes: [] };
    }

    const weekendHoliday = holidays.some(holiday =>
      dateKey(holiday.actual) === dateKey(date) && (date.getDay() === 0 || date.getDay() === 6)
    );
    return weekendHoliday
      ? {
        closed: false,
        needsConfirmation: true,
        notes: ['Weekend federal holiday; confirm whether the resource is open.']
      }
      : { closed: false, needsConfirmation: false, notes: [] };
  }

  function addUndatedEvent(month, group, row, reason, exception, needsConfirmation) {
    let event = month.undatedEvents.find(candidate => candidate.id === group.id);
    if (!event) {
      event = {
        id: group.id,
        title: group.title,
        times: [],
        notes: [],
        reasons: [],
        needsConfirmation: true
      };
      month.undatedEvents.push(event);
    }
    addUnique(event.times, row.Time);
    addUnique(event.notes, exception.text);
    addUnique(event.reasons, reason);
    event.needsConfirmation = event.needsConfirmation || needsConfirmation;
  }

  function addDatedEvent(month, group, row, day, exception, holiday, needsConfirmation) {
    const cell = month.dayCells.get(day);
    let event = cell.events.find(candidate => candidate.id === group.id);
    if (!event) {
      event = {
        id: group.id,
        title: group.title,
        times: [],
        notes: [],
        needsConfirmation: group.needsConfirmation
      };
      cell.events.push(event);
    }
    addUnique(event.times, row.Time);
    addUnique(event.notes, exception.text);
    holiday.notes.forEach(note => addUnique(event.notes, note));
    event.needsConfirmation = event.needsConfirmation || needsConfirmation || holiday.needsConfirmation;
  }

  function buildCalendar(rows, monthCount, currentDate) {
    if (!Array.isArray(rows)) throw new TypeError('Expected calendar rows to be an array.');
    if (!Number.isInteger(monthCount) || monthCount < 1 || monthCount > MAX_MONTHS) {
      throw new RangeError('Calendar month count must be between 1 and 6.');
    }
    const today = currentDate == null ? new Date() : new Date(currentDate);
    if (!Number.isFinite(today.getTime())) throw new TypeError('Expected a valid current date.');

    const groups = groupSchedules(rows);
    const firstYear = today.getFullYear();
    const firstMonth = today.getMonth();
    const lastMonthDate = new Date(firstYear, firstMonth + monthCount - 1, 1);
    const holidaysByDate = holidayDatesForRange(firstYear, lastMonthDate.getFullYear());
    const months = Array.from({ length: monthCount }, (_, index) => {
      const monthDate = new Date(firstYear, firstMonth + index, 1);
      return makeMonth(monthDate.getFullYear(), monthDate.getMonth());
    });

    groups.forEach(group => {
      group.schedules.forEach(row => {
        const pattern = recurrence(row);
        const exception = exceptionInfo(row['Time exceptions']);
        const rowNeedsConfirmation = group.needsConfirmation || exception.needsConfirmation;

        months.forEach(month => {
          if (!pattern.kind) {
            addUndatedEvent(month, group, row, pattern.reason, exception, rowNeedsConfirmation);
            return;
          }

          occurrenceDays(pattern, month.year, month.month).forEach(day => {
            const date = new Date(month.year, month.month, day);
            const holiday = holidayDisposition(date, exception.closedHolidays, holidaysByDate);
            if (holiday.closed) return;
            addDatedEvent(month, group, row, day, exception, holiday, rowNeedsConfirmation);
          });
        });
      });
    });

    return {
      falseResources: resourcesWithFalseCalendarFlag(rows),
      months: months.map(month => ({
        year: month.year,
        month: month.month,
        title: month.title,
        weeks: month.weeks,
        undatedEvents: month.undatedEvents,
        hasConfirmationMarker: month.weeks.some(week =>
          week.some(cell => cell && cell.events.some(event => event.needsConfirmation))
        ) || month.undatedEvents.some(event => event.needsConfirmation)
      }))
    };
  }

  return { buildCalendar };
});
