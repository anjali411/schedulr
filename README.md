# Doctor Appointment Booking Site (GitHub Pages + Google Calendar)

This repo is a lightweight booking website you can host on GitHub Pages. Patients submit a booking request form, and a Google Apps Script endpoint creates a Google Calendar event and can send confirmation email.

## What is included

- `index.html` — patient booking page.
- `styles.css` — clean responsive styling.
- `app.js` — form handling + POST to Google Apps Script.
- `google-apps-script/Code.gs` — backend script for Calendar integration.

## Quick setup

### 1) Configure clinic Google Calendar

1. In Google Calendar, create a dedicated calendar (example: `Patient Appointments`).
2. Copy its **Calendar ID** from calendar settings.

### 2) Deploy the Google Apps Script backend

1. Open [script.new](https://script.new) while signed into clinic Google account.
2. Replace code with the contents of `google-apps-script/Code.gs`.
3. Update constants at the top:
   - `CALENDAR_ID` (optional: leave blank to use default calendar)
   - `CLINIC_EMAIL`
   - `TIMEZONE`
4. Click **Deploy → New deployment → Web app**.
5. Set:
   - Execute as: **Me**
   - Who has access: **Anyone** (or Anyone with link)
6. Copy the deployment URL.

> The included `Code.gs` accepts both field formats from the frontend (`name/email/date/time`) and compatibility aliases (`patientName/patientEmail/appointmentDate/appointmentTime`). It also returns `success` and `status` fields so the UI can display clear conflict errors.

### 3) Connect frontend to backend

1. Open `app.js`.
2. Set `CONFIG.appsScriptEndpoint` to your deployed web app URL.
3. Optional: set `CONFIG.directBookingUrl` to your Google appointment schedule link.

### 4) Publish with GitHub Pages

1. Push this repo to GitHub.
2. In GitHub repo settings, enable **Pages** from branch `main` (root).
3. Share your Pages URL with patients.

## Security / compliance notes

- Keep form data minimal. Do not collect SSN, insurance IDs, or clinical notes.
- Add your clinic's official privacy policy and consent text before production use.
- Consider HIPAA and local regulation requirements before collecting any health information.
- For stronger compliance, use a proper HIPAA-ready backend and BAAs where required.

## Local preview

Open `index.html` directly, or run:

```bash
python3 -m http.server 8080
```

Then visit <http://localhost:8080>.

## Git workflow note

If a pull request shows merge conflicts after related work was already merged, create a fresh branch from the latest `main` and re-apply only the pending commits. This avoids carrying stale merge metadata into the new PR.
