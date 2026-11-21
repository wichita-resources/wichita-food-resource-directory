WICHITA FOOD RESOURCE DIRECTORY

OVERVIEW
- This is a static website. The browser reads the public Google Sheet directly; it does not use Google Apps Script.
- The app uses index.html, resource-normalization.js, calendar-logic.js, and calendar-docx.js. Publish all four files together on your static host.
- Anyone who can access the sheet can read its contents. Do not put private or sensitive information in it.

SETUP
1. Make the resource directory sheet publicly readable.
2. Set the SHEET_ID value in index.html to the spreadsheet ID.
3. Publish index.html, resource-normalization.js, calendar-logic.js, calendar-docx.js, and print-list-logic.js to your static host.
4. Open the published page and confirm that the resource list loads.

DATA HEADERS
- The directory data is read from the first sheet tab.
- The current app fields are: Name of Resource, Location, Location notes, Available products or services, Required documentation, Phone, Website/URL, Resource type, Available times, Restrictions, Accessibility, Area, Whole Resource Verified Date, Latitude, and Longitude.
- Short Name is used in calendar output but is not searchable or displayed on resource cards.
- Resource ID is used internally for selection and is not shown on resource cards.
- Rows without Name of Resource do not create resource cards. Calendar continuation rows without a name are retained when they have a Resource ID. Resources without Resource ID cannot be selected.
- Only app-supported headers are carried into the app's resource records. Other sheet columns, including admin-only columns U through AR, are ignored by the app. This does not hide them from people who can read the public sheet.
- Invalid, zero, or out-of-range coordinates do not create a map point; the resource remains in the directory.
- Calendar headers are normalized across the live sheet's casing: Event Label, Calendar Event, Which one(s), Day(s) of week, Interval, Time, and Time exceptions.
- Calendar rows with a Resource ID are preserved separately from resource cards so continuation rows with no resource name can contribute schedule details.
- Calendar output uses the Short Name field instead of Name of Resource for compact titles.
- The selected-resources dialog opens a printable monthly calendar. It includes only Calendar Event values TRUE and TRUE*, starts with the current month, and supports printing 1–6 consecutive months with one month per landscape page.
- Selected resources with a Calendar Event value of FALSE are listed below each month with their Short Name and Available times.
- The calendar view can export the displayed month range as a .docx document that can be opened in Google Docs.
- The printable resource list can also be downloaded as a .docx file for opening in Google Docs.
- The printable list view includes all selected resources, ordered daily, weekly, monthly, then other or once-only schedules. Restrictions indicating once per month or 30 days sort with monthly resources; one-time-per-family restrictions sort last. When these restrictions do not specify a frequency, the Interval field determines the order.
- Printable list entries include the Short Name, Available times, resource type, products or services, documentation, restrictions, location and location notes, phone, and website. Accessibility details appear only while an accessibility filter is selected. The Wichita Blessing Box map URL is replaced with "Multiple locations throughout Wichita. Online map available."
- Calendar recurrence and grouping rules, holiday handling, and confirmation markers are recorded in docs/adr/0001-calendar-output-rules.md.

UPDATES
- Edit the Google Sheet to update resource information. Reloading the page fetches the latest sheet contents.
- When changing the app code, publish index.html, resource-normalization.js, calendar-logic.js, calendar-docx.js, and print-list-logic.js together.
- Spreadsheet data changes do not require a new app deployment.

FILTER BEHAVIOR
- Within each filter group, selections use OR logic.
- Across groups, selections use AND logic.
- "Multiple areas" and "All Wichita areas" resources appear in every selected area.
- Product/service and accessibility matching is case-insensitive.
- Search checks the current app-supported fields. Calendar schedule fields remain excluded from search.

RESOURCE SELECTION
- Use the checkbox on a resource card to select it without opening the card.
- Selections use Resource ID, remain selected while search and filters change, and can be reviewed or removed individually.
- "Select all filtered results" adds the currently visible filtered resources to the selection; "Clear selection" removes all selections.
- Resources without a Resource ID cannot be selected.

ACCESSIBILITY / PRIVACY NOTES
- The app uses native HTML details/summary disclosure controls and checkbox inputs, keyboard focus styling, responsive layouts, and reduced-motion support.
- The Whole Resource Verified Date appears on resource cards; Resource IDs are not displayed.
- The sheet itself is publicly readable. The app's supported-header list does not make the source sheet private.
