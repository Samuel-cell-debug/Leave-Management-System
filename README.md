# Northstar Leave Management

A production-minded vanilla HTML, CSS, and JavaScript leave management workspace. It runs without a build step or external dependency.

## Setup

Open `index.html` in a modern browser, or serve the folder with any static server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

The login is intentionally mocked. Any valid email and non-empty password signs into the demo workspace. The prefilled credentials are for the sample employee Alex Morgan.

## Features

- Dashboard statistics, recent requests, and balance progress.
- Leave application with working-day calculation, half-day support, balance checks, overlap warnings, handover, reason, and attachment input.
- Filterable leave history with cancellation confirmation, details modal, and CSV export.
- Team calendar with month navigation, weekends, today state, approved and pending indicators, and date details.
- Responsive mobile navigation, keyboard focus states, toast feedback, and local interactions.
- Local Storage persistence with an automatic 30-second save interval.

## Data model

The state is stored under `northstar-leave-state` and follows this shape:

```js
{
	employee: {
		id, name, role, department,
		leaveBalance: { annual, sick, casual, maternity, paternity, unpaid }
	},
	leaves: [{
		id, type, startDate, endDate, days, reason, status,
		appliedOn, handover, timeOption
	}],
	teamLeaves: [{ employee, type, startDate, endDate, status }]
}
```

Dates are stored as ISO date strings (`YYYY-MM-DD`) to keep local persistence and comparisons predictable. Approved leave is reflected in the displayed balance, while pending requests remain available for review.

## Customization

- Update `initialState` and `leaveCatalog` in `script.js` to change demo people, balances, and leave policies.
- Change the visual system in the CSS variables at the top of `style.css`.
- Replace the mock login handler with a backend session call in the `#loginForm` listener.
- Replace `saveToLocalStorage` and `loadState` with API calls when connecting a real service.
- Add public holidays to `calculateWorkingDays` if your organization needs holiday-aware balances.

## Browser support

The application uses standard HTML5, CSS Grid/Flexbox, ES6 JavaScript, Local Storage, Blob downloads, and Intl date formatting. It is designed for current Chrome, Firefox, Safari, Edge, and mobile browsers.