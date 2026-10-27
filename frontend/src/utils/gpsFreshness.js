// Backend should persist locationCapturedAt from verified browser GPS fixes.
// Until it does, locationUpdatedAt is only the server receipt time; it cannot
// prove that a GPS coordinate was freshly captured by the phone.
export function gpsTimestampMs(value) {
  if (typeof value === "number") return value < 1e11 ? value * 1000 : value;
  if (typeof value === "string" && /^\d+$/.test(value)) return gpsTimestampMs(Number(value));
  return value ? Date.parse(value) : NaN;
}

export function isGpsRecent(booking, now = Date.now(), maxAgeMs = 120_000) {
  if (!booking?.driverLocation) return false;
  const receivedAt = gpsTimestampMs(booking.locationUpdatedAt);
  const capturedAt = booking.locationCapturedAt == null
    ? receivedAt : gpsTimestampMs(booking.locationCapturedAt);
  return [receivedAt, capturedAt].every(t => Number.isFinite(t) &&
    t <= now + 5_000 && now - t >= 0 && now - t < maxAgeMs);
}
