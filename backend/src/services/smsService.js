/*
  TEXTBEE SMS SERVICE

  React never receives the TextBee API key. Controllers call sendSMS(), which
  contacts TextBee from Node.js. A configured Android phone sends the SMS.
*/
export async function sendSMS(phone, message) {
  const apiKey = process.env.TEXTBEE_API_KEY;

  // During local development only, we can print OTPs if no TextBee key exists.
  if (!apiKey) {
    const isDevelopment = process.env.NODE_ENV !== "production";
    if (isDevelopment && process.env.DEV_LOG_OTP === "true") {
      console.log("[DEV SMS for " + phone + "] " + message);
      return;
    }
    throw new Error("TextBee is not configured in backend/.env.");
  }

  // TextBee accepts an array of recipients, even for a single SMS.
  const body = { recipients: [phone], message: message };
  if (process.env.TEXTBEE_DEVICE_ID) body.deviceId = process.env.TEXTBEE_DEVICE_ID.trim();

  let response;
  try {
    response = await fetch("https://api.textbee.dev/api/v1/gateway/send-sms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(body), // Convert JavaScript object to JSON text.
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    console.error("TextBee connection problem:", error.message);
    throw new Error("SMS service is unreachable. Please try again.");
  }

  // A valid HTTP response can still contain TextBee's own failure message.
  let data = {};
  try {
    data = await response.json();
  } catch {
    // Some failures have no JSON body.
  }

  if (!response.ok || data.success === false ||
      (data.data && data.data.success === false) ||
      (data.data && data.data.successCount === 0 && data.data.failureCount > 0)) {
    console.error("TextBee rejected SMS:", response.status, data.message || data.error);
    throw new Error("SMS could not be sent. Check your TextBee device.");
  }

  if (data.data && data.data.warning) {
    console.warn("TextBee warning:", data.data.warning.message);
  }
  return data.data && data.data.smsBatchId;
}
