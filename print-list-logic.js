(function (root, factory) {
  const printListLogic = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = printListLogic;
  } else {
    root.PrintListLogic = printListLogic;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const FREQUENCY_ORDER = { daily: 0, weekly: 1, monthly: 2, other: 3 };

  function clean(value) {
    return value == null ? '' : String(value).trim();
  }

  function restrictionFrequency(value) {
    const text = clean(value).toLowerCase();
    const oneTime = /\b(?:once|one time|1 time|1x)\b/.test(text);
    if (oneTime && /\b(?:month|30\s*days?)\b/.test(text)) {
      return 'monthly';
    }
    if (/\b(?:once|one time|1 time|1x|one)\s+(?:per|a|for each)\s+(?:family|household)\b/.test(text)) {
      return 'other';
    }
    return null;
  }

  function resourceFrequency(resource) {
    const restrictedFrequency = restrictionFrequency(resource.Restrictions);
    if (restrictedFrequency) return restrictedFrequency;

    const interval = clean(resource.Interval).toLowerCase();
    return Object.hasOwn(FREQUENCY_ORDER, interval) ? interval : 'other';
  }

  function formatLocation(location, locationNotes) {
    const text = clean(location);
    const hasMultipleLocationsMap =
      /^Multiple locations throughout Wichita:\s*https?:\/\/www\.google\.com\/maps\/d\//i.test(text);
    const printableLocation = hasMultipleLocationsMap
      ? 'Multiple locations throughout Wichita. Online map available.'
      : text;
    const notes = clean(locationNotes);
    if (hasMultipleLocationsMap && notes) return printableLocation + ' ' + notes;
    return [printableLocation, notes].filter(Boolean).join(', ');
  }

  function describeResource(resource, includeAccessibility) {
    const resourceType = clean(resource['Resource type']);
    const products = clean(resource['Available products or services']);
    const documentation = clean(resource['Required documentation']);
    const restrictions = clean(resource.Restrictions);
    const accessibility = includeAccessibility ? clean(resource.Accessibility) : '';
    const sameText = (first, second) =>
      first.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, '') ===
      second.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

    return {
      shortName: clean(resource['Short name']) || clean(resource['Name of Resource']) || 'Resource name missing',
      availableTimes: clean(resource['Available times']) || 'Available times not specified',
      details: [
        resourceType,
        products && !sameText(products, resourceType) ? products : '',
        documentation,
        restrictions && !sameText(restrictions, documentation) ? restrictions : '',
        accessibility,
        formatLocation(resource.Location, resource['Location notes'])
      ].filter(Boolean),
      phone: clean(resource.Phone),
      website: clean(resource['Website/URL'])
    };
  }

  function buildPrintableList(resources) {
    if (!Array.isArray(resources)) {
      throw new TypeError('Expected printable list resources to be an array.');
    }

    return resources
      .map((resource, index) => ({ resource, index, frequency: resourceFrequency(resource) }))
      .sort((left, right) =>
        FREQUENCY_ORDER[left.frequency] - FREQUENCY_ORDER[right.frequency] ||
        left.index - right.index
      )
      .map(entry => entry.resource);
  }

  return { buildPrintableList, describeResource, formatLocation };
});
