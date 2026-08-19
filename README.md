# Northstar Leave Management

A vanilla JavaScript leave-management demo backed by Google Sheets through a Google Apps Script web app.

## Google Sheets demo setup

1. Create a Google Sheet with these tabs and row 1 headers.

`Users`: `id`, `email`, `password`, `full_name`, `job_title`, `department`, `role`

`Balances`: `employee_id`, `leave_type`, `allowance`, `remaining`

`LeaveRequests`: `id`, `employee_id`, `leave_type`, `start_date`, `end_date`, `days`, `reason`, `handover`, `time_option`, `status`, `applied_on`, `decision_comment`

2. Add the contents of [Code.gs](Code.gs) to the sheet's **Extensions > Apps Script** project.
3. Deploy it as a **Web app**. Execute as the sheet owner and choose an access setting that allows the intended demo users to reach it.
4. Copy the deployed web-app URL into [google-sheets-config.js](google-sheets-config.js):

```js
window.NORTHSTAR_SHEETS = {
  apiUrl: "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
};
```

5. Serve the project over HTTP:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000` and sign in with an email/password from the `Users` tab.

## Demo roles

Set `role` to `employee` or `administrator` in the `Users` tab. Employees see their own balances and requests. Administrators see all requests and balances and can approve or reject pending requests with a comment. Approved requests decrement the matching balance row.

This is a demonstration integration. Passwords are stored in the sheet and the Apps Script endpoint trusts the caller's email and password. Do not use this authentication model, public web-app access, or a Google Sheet as the authoritative HR database in production. Use Supabase, Firebase, or a server with real authentication and server-side authorization for production.

## Features

- Google Sheets-backed sign-in, leave requests, balances, approvals, and CSV export.
- Employee and administrator views using the existing Northstar interface.
- Working-day calculation, half-day support, balance checks, overlap warnings, cancellation, approval, rejection, and comments.
- No Google service-account credentials are exposed in the browser.

## Sheet maintenance

Use ISO dates (`YYYY-MM-DD`) in `start_date`, `end_date`, and `applied_on`. Keep IDs unique. Back up the spreadsheet before changing headers or deploying a new Apps Script version. Apps Script executions are visible under **Executions** for basic troubleshooting.

## Validation

The repository has no test runner. Run `node --check script.js` after edits. Test the demo with one employee account and one administrator account, including invalid sign-in, request submission, cancellation, approval, rejection, insufficient balance, and direct endpoint access.
