// A single SMS sender for GASFAR. Use this from registration now and from
// password recovery / delivery confirmation when those backend flows exist.
// Never call TextBee directly from React: keep the API key on the server.
export async function sendSMS(phone, message) {
  const apiKey = process.env.TEXTBEE_API_KEY?.trim();

  if (!apiKey) {
    if (process.env.NODE_ENV !== "production" && process.env.DEV_LOG_OTP === "true") {
      console.log(`[DEV SMS for ${phone}] ${message}`);
      return;
    }
    throw new Error("TextBee is not configured. Set TEXTBEE_API_KEY in backend/.env.");
  }

  const body = { recipients: [phone], message };
  if (process.env.TEXTBEE_DEVICE_ID?.trim()) {
    body.deviceId = process.env.TEXTBEE_DEVICE_ID.trim();
  }

  let response;
  try {
    response = await fetch("https://api.textbee.dev/api/v1/gateway/send-sms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    console.error("TextBee connection error:", error.message);
    throw new Error("SMS service is temporarily unreachable. Please try again.");
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success === false || result.data?.success === false ||
      (result.data?.successCount === 0 && result.data?.failureCount > 0)) {
    console.error("TextBee rejected SMS:", response.status, result.error || result.message || "Unknown error");
    throw new Error("SMS could not be sent. Check your TextBee device and try again.");
  }

  if (result.data?.warning) {
    console.warn("TextBee SMS warning:", result.data.warning.message);
  }

  return result.data?.smsBatchId;
}
