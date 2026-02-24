const CALENDAR_ID = ""; // Optional: leave blank to use default calendar.
const CLINIC_EMAIL = "clinic@example.com";
const TIMEZONE = "America/New_York";
const DEFAULT_DURATION_MINUTES = 30;

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, status: "error", message: "No data received" });
    }

    const payload = JSON.parse(e.postData.contents);

    const patientName = getField(payload, ["patientName", "name"]);
    const patientEmail = getField(payload, ["patientEmail", "email"]);
    const patientPhone = getField(payload, ["patientPhone", "phone"]);
    const reason = getField(payload, ["reason"]);

    const appointmentDate = getField(payload, ["appointmentDate", "date"]);
    const appointmentTime = getField(payload, ["appointmentTime", "time"]);

    if (!patientName || !patientEmail || !appointmentDate || !appointmentTime) {
      return jsonResponse({ success: false, status: "error", message: "Missing required fields" });
    }

    const start = getStartDate(payload, appointmentDate, appointmentTime);
    if (isNaN(start.getTime())) {
      return jsonResponse({ success: false, status: "error", message: "Invalid date/time format" });
    }

    const end = new Date(start.getTime() + DEFAULT_DURATION_MINUTES * 60 * 1000);
    const calendar = getCalendar();

    if (!calendar) {
      return jsonResponse({ success: false, status: "error", message: "Calendar not found" });
    }

    const conflicts = calendar.getEvents(start, end);
    if (conflicts.length > 0) {
      return jsonResponse({
        success: false,
        status: "conflict",
        message: "This time slot is already booked.",
      });
    }

    const description = [
      `Patient Name: ${patientName}`,
      `Email: ${patientEmail}`,
      `Phone: ${patientPhone || "N/A"}`,
      `Reason: ${reason || "N/A"}`,
      `Notes: ${payload.notes || "N/A"}`,
      `Source: ${payload.source || "website"}`,
    ].join("\n");

    const event = calendar.createEvent(`Appointment: ${patientName}`, start, end, {
      description,
      guests: patientEmail,
      sendInvites: true,
    });

    if (CLINIC_EMAIL) {
      MailApp.sendEmail({
        to: CLINIC_EMAIL,
        subject: `New appointment request: ${patientName}`,
        body: `${description}\nEvent ID: ${event.getId()}`,
      });
    }

    return jsonResponse({
      success: true,
      status: "success",
      eventId: event.getId(),
      startsAt: Utilities.formatDate(start, TIMEZONE, "yyyy-MM-dd HH:mm"),
    });
  } catch (error) {
    return jsonResponse({ success: false, status: "error", message: error.toString() });
  }
}

function doOptions() {
  return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.JSON);
}

function getField(payload, keys) {
  for (let i = 0; i < keys.length; i += 1) {
    const value = payload[keys[i]];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function getStartDate(payload, appointmentDate, appointmentTime) {
  if (payload.startIso) {
    const isoDate = new Date(payload.startIso);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }
  }

  return new Date(`${appointmentDate}T${appointmentTime}`);
}

function getCalendar() {
  if (CALENDAR_ID && CALENDAR_ID.trim()) {
    return CalendarApp.getCalendarById(CALENDAR_ID.trim());
  }

  return CalendarApp.getDefaultCalendar();
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
