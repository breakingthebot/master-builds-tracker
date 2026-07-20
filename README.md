# BuildsTracker Hub

A visually stunning, high-fidelity interactive dashboard tracking progress status checklists across AI-286 side-projects, GCP Cloud project logs, and Clover builds.

## Stack
- **Structure**: Semantic HTML5 markup
- **Logic**: Vanilla ES Modules JavaScript
- **Styling**: Premium custom CSS selectors
- **Data**: Static JSON schemas parsed from spreadsheet logs

## Setup
1. Clone this repository branch.
2. Open `index.html` directly in a browser (or serve it with an editor web server like Live Server).
3. The dashboard loads datasets from JSON directories and synchronizes updates straight to `LocalStorage`.

## Data Handling
- **Collected Data**: The application collects no PII, user profiles, or usage metrics.
- **Storage**: Project completion statuses and custom text notes are stored locally in the browser's `LocalStorage` memory.
- **Sharing**: No data is shared with external APIs, databases, or third-party networks. Data remains isolated inside the client's web browser environment.

## Running Locally
Double click `index.html` to open it in a browser, or run inside the directory:
```bash
npx live-server .
```

## Architecture Notes
Built with a modular front-end architecture. Custom python extractor scripts read master worksheets to generate normalized JSON databases. A single controller binds query subjects, filter updates, and checkbox interactions with zero framework dependencies to optimize page load speeds.
