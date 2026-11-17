WICHITA FOOD RESOURCE DIRECTORY — GOOGLE APPS SCRIPT WEB APP

CONTENTS
- Code.gs: Apps Script server code
- Index.html: accessible, responsive dark-mode interface

IMPORTANT: This is a standalone Apps Script project. It is intentionally separate from your existing admin-only verification app so the two deployments and their access settings do not interfere with each other.

SETUP
1. Open the Google Sheet containing the resource directory.
2. Copy its spreadsheet ID from the address bar. It is the long string between /d/ and /edit in a URL like:
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit#gid=0
3. Go to https://script.google.com and create a New project.
4. Rename the project, for example: Wichita Food Resource Directory.
5. Open the default Code.gs file, replace its contents with the supplied Code.gs.
6. Click the + next to Files, choose HTML, name the file exactly Index, and paste in Index.html.
7. In Code.gs, replace PASTE_YOUR_GOOGLE_SHEET_ID_HERE with the ID copied in step 2. Keep the single quotes around the ID.
8. Save the project.
9. Click Deploy > New deployment.
10. Click the gear beside "Select type" and choose "Web app".
11. Set "Execute as" to Me.
12. Choose who can access the app. For a public resource directory, choose the broadest audience option available to you (often "Anyone"). Your Google Workspace administrator may restrict this option.
13. Click Deploy. Review the authorization prompts and authorize the app to read the spreadsheet.
14. Copy the Web app URL and open it in a new tab.

SPREADSHEET EXPECTATIONS
- The first row of the data tab must contain the directory headers.
- The app automatically looks for a sheet containing these headers: Name of Resource, Location, Available products or services, Accessibility, and Area.
- It reads the 11 public-facing columns and ignores administrative verification columns.
- If your sheet has duplicate Phone or Website/URL columns, the app uses the first non-empty matching cell.
- You can optionally set SHEET_NAME in Code.gs to the exact tab name if you want to pin the app to a particular tab.

UPDATES
- Edit the Google Sheet to update resource information. Reloading the web app fetches the latest sheet contents.
- If you change the app code, save and deploy a new version: Deploy > Manage deployments > Edit (pencil) > select New version > Deploy.
- Spreadsheet data changes do not require a new deployment.

FILTER BEHAVIOR
- Within each filter group, selections use OR logic.
- Across groups, selections use AND logic.
- "Multiple areas" and "All Wichita areas" resources appear in every selected area.
- Product/service and accessibility matching is case-insensitive.
- Search checks all 11 public-facing columns.
- Sorting is available for all 11 public-facing columns.

ACCESSIBILITY / PRIVACY NOTES
- The app uses native HTML details/summary disclosure controls and checkbox inputs, keyboard focus styling, responsive layouts, and reduced-motion support.
- The app does not display the spreadsheet's verification metadata or resource IDs.
- Anyone who can access the deployed public app can see the public-facing resource fields returned by the script. Do not put private or sensitive information in those columns.
- The web app runs as the deploying account, so visitors do not need direct access to the underlying spreadsheet. Keep the sheet itself private if appropriate.

GOOGLE MAPS
The first version intentionally does not include a map. Each resource has a stable internal ID in the card DOM, and the data returned to the page includes that ID, which provides a useful foundation for a later map view and marker-to-card navigation. Actual map integration will need a geocoding strategy and a Google Maps Platform API key (or an alternative map provider).
