const CALENDAR_ID = "your_calendar_id@group.calendar.google.com";
const CLINIC_EMAIL = "clinic@example.com";
const TIMEZONE = "America/New_York";
const DEFAULT_DURATION_MINUTES = 30;

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, message: "Missing payload" }, 400);
    }

    const payload = JSON.parse(e.postData.contents);
    const required = ["name", "email", "phone", "date", "time", "reason", "startIso"];

    for (const key of required) {
      if (!payload[key]) {
        return jsonResponse({ success: false, message: `Missing field: ${key}` }, 400);
      }
    }

    const calendar = CalendarApp.getCalendarById(CALENDAR_ID);
    if (!calendar) {
      return jsonResponse({ success: false, message: "Calendar not found" }, 500);
    }

    const start = new Date(payload.startIso);
    if (isNaN(start.getTime())) {
      return jsonResponse({ success: false, message: "Invalid date/time" }, 400);
    }

    const end = new Date(start.getTime() + DEFAULT_DURATION_MINUTES * 60 * 1000);
    const title = `Patient appointment: ${payload.name}`;

    const description = [
      `Patient: ${payload.name}`,
      `Email: ${payload.email}`,
      `Phone: ${payload.phone}`,
      `Reason: ${payload.reason}`,
      `Notes: ${payload.notes || "(none)"}`,
      `Source: ${payload.source || "website"}`,
    ].join("\n");

    const event = calendar.createEvent(title, start, end, {
      description,
      guests: payload.email,
      sendInvites: true,
    });

    MailApp.sendEmail({
      to: CLINIC_EMAIL,
      subject: `New appointment request: ${payload.name}`,
      body: `${title}\n${description}\nEvent ID: ${event.getId()}`,
    });

    return jsonResponse({
      success: true,
      eventId: event.getId(),
      startsAt: Utilities.formatDate(start, TIMEZONE, "yyyy-MM-dd HH:mm"),
    });
  } catch (error) {
    return jsonResponse({ success: false, message: error.message || "Server error" }, 500);
  }
}

function jsonResponse(data, statusCode) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

