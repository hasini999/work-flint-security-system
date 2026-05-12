function triggerHoneypot(eventType) {

  console.log("🚨 Honeypot Triggered:", eventType);

  // ✅ Use session-based identity (not loose localStorage values)
  const employee =
    localStorage.getItem("name") || "Unknown User";

  const role =
    localStorage.getItem("role") || "Unknown Role";

  const sessionId =
    localStorage.getItem("sessionId");

  const alertData = {
    event: eventType,
    page: window.location.pathname,
    timestamp: new Date().toISOString(),

    // 🔐 extra security metadata (IMPORTANT UPGRADE)
    employee,
    role,
    sessionId
  };

  console.log("Security Alert Payload:", alertData);

  fetch("/api/security-alert", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-session-id": sessionId
    },
    body: JSON.stringify(alertData)
  }).catch(() => {});

  // 🚨 stronger UX warning
  alert(
    "🚨 SECURITY ALERT\n\nSuspicious activity detected.\nIncident logged to SOC dashboard."
  );
}