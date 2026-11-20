WICHITA FOOD RESOURCE DIRECTORY

OVERVIEW
- This is a static website. The browser reads the public Google Sheet directly; it does not use Google Apps Script.
- The app uses index.html and resource-normalization.js. Publish both files together on your static host.
- Anyone who can access the sheet can read its contents. Do not put private or sensitive information in it.

SETUP
1. Make the resource directory sheet publicly readable.
2. Set the SHEET_ID value in index.html to the spreadsheet ID.
3. Publish index.html and resource-normalization.js to your static host.
4. Open the published page and confirm that the resource list loads.

DATA HEADERS
- The directory data is read from the first sheet tab.
- The current app fields are: Name of Resource, Location, Location notes, Available products or services, Required documentation, Phone, Website/URL, Resource type, Available times, Restrictions, Accessibility, Area, Whole Resource Verified Date, Latitude, and Longitude.
- Resource ID is used internally for selection and is not shown on resource cards.
- Rows without Name of Resource are ignored. Resources without Resource ID cannot be selected.
- Only app-supported headers are carried into the app's resource records. Other sheet columns, including admin-only columns U through AR, are ignored by the app. This does not hide them from people who can read the public sheet.
- Invalid, zero, or out-of-range coordinates do not create a map point; the resource remains in the directory.
- The following calendar headers are preserved for future calendar support: Event label, Calendar event, Which one(s), Day(s) of week, Interval, Time, and Time exceptions. Calendar display and filtering are not implemented yet.

UPDATES
- Edit the Google Sheet to update resource information. Reloading the page fetches the latest sheet contents.
- When changing the app code, publish index.html and resource-normalization.js together.
- Spreadsheet data changes do not require a new app deployment.

FILTER BEHAVIOR
- Within each filter group, selections use OR logic.
- Across groups, selections use AND logic.
- "Multiple areas" and "All Wichita areas" resources appear in every selected area.
- Product/service and accessibility matching is case-insensitive.
- Search checks the current app-supported fields. Calendar fields are not included in search until calendar support is built.

RESOURCE SELECTION
- Use the checkbox on a resource card to select it without opening the card.
- Selections use Resource ID, remain selected while search and filters change, and can be reviewed or removed individually.
- "Select all filtered results" adds the currently visible filtered resources to the selection; "Clear selection" removes all selections.
- Resources without a Resource ID cannot be selected.

ACCESSIBILITY / PRIVACY NOTES
- The app uses native HTML details/summary disclosure controls and checkbox inputs, keyboard focus styling, responsive layouts, and reduced-motion support.
- The Whole Resource Verified Date appears on resource cards; Resource IDs are not displayed.
- The sheet itself is publicly readable. The app's supported-header list does not make the source sheet private.
