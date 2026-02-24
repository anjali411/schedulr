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

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!form.checkValidity()) {
    setStatus("Please complete all required fields.", "error");
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
    const response = await fetch(CONFIG.appsScriptEndpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        ...data,
        startIso,
        source: "clinic-site",
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Unable to create appointment.");
    }

    setStatus("Thanks! Your request was sent. We will confirm by email.", "success");
    form.reset();
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
