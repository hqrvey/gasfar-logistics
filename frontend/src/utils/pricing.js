// Readable prototype rate table. MUST stay equal to backend fareForVehicle().
// Backend recalculates using Geoapify, so this React amount is an estimate only.
export const FARE_RATES = {
  motorcycle: { base: 50, first: 6.5, extra: 6, split: 5 },
  sedan: { base: 100, first: 18, extra: 15, split: 5 },
  suv: { base: 120, first: 20, extra: 20, split: 5 },
  pickup: { base: 240, first: 20, extra: 20, split: 5 },
  l300: { base: 280, first: 24, extra: 22, split: 10 },
};
export const VEHICLE_CAPACITY_KG = {
  motorcycle: 20,
  sedan: 200,
  suv: 500,
  pickup: 800,
  l300: 1000,
};

export function fareBreakdown(vehicleType, distanceKm, deliveryType) {
  const rates = FARE_RATES[vehicleType];
  if (!rates || !Number.isFinite(Number(distanceKm))) return null;
  const km = Math.max(0, Number(distanceKm));
  const base = rates.base;
  const firstKm = Math.round(Math.min(km, rates.split) * rates.first);
  const extraKm = Math.round(Math.max(0, km - rates.split) * rates.extra);
  const subtotal = base + firstKm + extraKm;
  const priority = deliveryType === "priority" ? Math.round(subtotal * 100 * 0.20) / 100 : 0;
  return { base, firstKm, extraKm, subtotal, priority, total: subtotal + priority };
}
