const CONFIG = {
  // Replace with your deployed Google Apps Script Web App URL.
  appsScriptEndpoint: "https://script.google.com/macros/s/AKfycbzn2UUMJEcMnNzjcSjz-wym_lFIDmYFNdqL1vXBT0Eida6iyzJlnWwyzXK78LTBW7ZvOA/exec",
  // Optional: direct Google appointment schedule URL.
  directBookingUrl: "",
};

const form = document.getElementById("booking-form");
const statusEl = document.getElementById("status");
const submitBtn = document.getElementById("submit-btn");
const yearEl = document.getElementById("year");
const directBookingLink = document.getElementById("direct-booking-link");
const timeInput = document.getElementById("time");
const timeOptions = document.getElementById("time-options");
const slotOptions = document.getElementById("slot-options");
const slotsHelp = document.getElementById("slots-help");
const SLOT_INTERVAL_MINUTES = 10;
const SLOT_WINDOW_MINUTES = 60;

yearEl.textContent = new Date().getFullYear();

if (CONFIG.directBookingUrl) {
  directBookingLink.hidden = false;
  directBookingLink.href = CONFIG.directBookingUrl;
}

const setStatus = (message, type = "") => {
  statusEl.textContent = message;
  statusEl.className = type;
};

const toIsoDateTime = (date, time) => {
  const candidate = new Date(`${date}T${time}`);
  return Number.isNaN(candidate.valueOf()) ? null : candidate.toISOString();
};

const parseTimeToMinutes = (timeValue) => {
  if (!timeValue || !timeValue.includes(":")) {
    return null;
  }

  const [hoursText, minutesText] = timeValue.split(":");
  const hours = Number.parseInt(hoursText, 10);
  const minutes = Number.parseInt(minutesText, 10);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return (hours * 60) + minutes;
};

const minutesToTimeString = (totalMinutes) => {
  const normalizedMinutes = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const populateTimeOptions = () => {
  if (!timeOptions) {
    return;
  }

  timeOptions.innerHTML = "";

  for (let totalMinutes = 0; totalMinutes < 1440; totalMinutes += SLOT_INTERVAL_MINUTES) {
    const option = document.createElement("option");
    option.value = minutesToTimeString(totalMinutes);
    timeOptions.appendChild(option);
  }
};

const renderNearbySlots = (selectedTime) => {
  slotOptions.innerHTML = "";

  const selectedMinutes = parseTimeToMinutes(selectedTime);

  if (selectedMinutes === null) {
    slotsHelp.hidden = true;
    return;
  }

  slotsHelp.hidden = false;

  for (
    let offset = -SLOT_WINDOW_MINUTES;
    offset <= SLOT_WINDOW_MINUTES;
    offset += SLOT_INTERVAL_MINUTES
  ) {
    const optionMinutes = selectedMinutes + offset;
    const optionTime = minutesToTimeString(optionMinutes);
    const slotButton = document.createElement("button");

    slotButton.type = "button";
    slotButton.className = `slot-chip${optionTime === selectedTime ? " active" : ""}`;
    slotButton.textContent = optionTime;
    slotButton.setAttribute("role", "option");
    slotButton.setAttribute("aria-selected", String(optionTime === selectedTime));

    slotButton.addEventListener("click", () => {
      timeInput.value = optionTime;
      timeInput.dispatchEvent(new Event("change", { bubbles: true }));
    });

    slotOptions.appendChild(slotButton);
  }
};

const validateTimeStep = () => {
  const totalMinutes = parseTimeToMinutes(timeInput.value);

  if (totalMinutes === null || totalMinutes % SLOT_INTERVAL_MINUTES === 0) {
    timeInput.setCustomValidity("");
    return true;
  }

  timeInput.setCustomValidity("Please select time in 10-minute intervals (e.g., 12:00, 12:10).");
  return false;
};

timeInput.addEventListener("change", () => {
  validateTimeStep();
  renderNearbySlots(timeInput.value);
});

timeInput.addEventListener("input", validateTimeStep);

renderNearbySlots(timeInput.value);
populateTimeOptions();

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!form.checkValidity()) {
    setStatus("Please complete all required fields.", "error");
    return;
  }

  if (!validateTimeStep()) {
    form.reportValidity();
    return;
  }

  if (CONFIG.appsScriptEndpoint.includes("YOUR_DEPLOYMENT_ID")) {
    setStatus(
      "Setup required: add your Google Apps Script URL in app.js before going live.",
      "error"
    );
    return;
  }

  const data = Object.fromEntries(new FormData(form).entries());
  const startIso = toIsoDateTime(data.date, data.time);

  if (!startIso) {
    setStatus("Please provide a valid date and time.", "error");
    return;
  }

  submitBtn.disabled = true;
  setStatus("Submitting your request...", "");

  try {
    const payload = {
      patientName: data.name,
      patientEmail: data.email,
      patientPhone: data.phone,
      appointmentDate: data.date,
      appointmentTime: data.time,
      reason: [data.reason, data.notes].filter(Boolean).join("\n"),
      startIso,
      source: "clinic-site",
    };

    const response = await fetch(CONFIG.appsScriptEndpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();

    if (result.status === "conflict") {
      setStatus(result.message || "This time slot is already booked.", "error");
      return;
    }

    if (result.status !== "success" && !result.success) {
      throw new Error(result.message || "Unable to create appointment.");
    }

    setStatus("Thanks! Your request was sent. We will confirm by email.", "success");
    form.reset();
    renderNearbySlots("");
  } catch (error) {
    setStatus(
      "Could not submit right now. Please call the clinic or try again in a few minutes.",
      "error"
    );
    console.error(error);
  } finally {
    submitBtn.disabled = false;
  }
});
