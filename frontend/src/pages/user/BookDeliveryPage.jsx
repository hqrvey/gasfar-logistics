import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { fareBreakdown } from "../../utils/pricing.js";
import { extraService } from "../../services/extraService.js";
import { FiArrowLeft, FiCheck, FiClock, FiMapPin, FiPlus, FiX, FiMaximize2, FiMinimize2, FiUpload } from "react-icons/fi";
import { ArrowLeft, ArrowRight, Bike, Car, CarFront, CalendarDays, Check, CircleDollarSign, Clock, CreditCard, FileText, Hand, MapPin, Navigation, Package, Pill, Search, Shirt, Thermometer, TriangleAlert, Truck, Utensils, Van, Armchair, BookOpen, Cog, User, UserRound, ArrowUp, Droplets, Layers, Monitor, ShieldCheck, Zap } from "lucide-react";
import { peso } from "../../utils/helpers.js";
import { bookingService } from "../../services/bookingService.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { MapPicker, MapModeSwitcher, MapSearchBar, MapZoomControls } from "../../components/common/MapComponents.jsx";
import { SqCard, LocCard, Field, RR, EmptyState, ReviewGroup } from "../../components/common/BookingUI.jsx";
import UserLayout from "../../layouts/UserLayout.jsx";
import { LocationChooserModal } from "../../components/common/ProfileComponents.jsx";
import { FileUpload, VehicleSelect } from "../../components/common/FormComponents.jsx";
import { MOCK_NOTIFICATIONS_USER } from "../../data/demo/clientMockData.js";

// All choices for this booking form are defined here, next to the page.
// Options shown in the multi-step booking form.
// Choices for this form. These are only used by BookDeliveryPage.

const STEPS = ["Locations", "Schedule", "Recipient", "Package", "Review"];
const VEHICLES = [
  { id: "motorcycle", label: "Motorcycle", sub: "Up to 20 kg", Icon: Bike },
  { id: "sedan", label: "Sedan", sub: "Up to 200 kg", Icon: Car },
  { id: "suv", label: "SUV", sub: "Up to 600 kg", Icon: CarFront },
  { id: "pickup", label: "Pickup", sub: "Up to 800 kg", Icon: Truck },
  { id: "l300", label: "L300", sub: "Up to 1,000 kg", Icon: Van },
];
const ITEM_TYPES = [
  { id: "documents", label: "Documents", Icon: FileText },
  { id: "electronics", label: "Electronics", Icon: Monitor },
  { id: "clothing", label: "Clothing", Icon: Shirt },
  { id: "food", label: "Food", Icon: Utensils },
  { id: "furniture", label: "Furniture", Icon: Armchair },
  { id: "medicine", label: "Medicine", Icon: Pill },
  { id: "auto-parts", label: "Auto Parts", Icon: Cog },
  { id: "books", label: "Books", Icon: BookOpen },
  { id: "personal-item", label: "Personal Item", Icon: UserRound },
  { id: "others", label: "Others", Icon: Package },
];
const HANDLING = [
  { id: "care", label: "Handle w/ care", Icon: Hand },
  { id: "upright", label: "Keep upright", Icon: ArrowUp },
  { id: "dry", label: "Keep dry", Icon: Droplets },
  { id: "stack", label: "No stacking", Icon: Layers },
  { id: "fragile", label: "Fragile", Icon: TriangleAlert },
  { id: "temp", label: "Temp sensitive", Icon: Thermometer },
];
const BOOKING_INITIAL = {
  pickup: null, dropoff: null, recipientName: "", recipientPhone: "", recipientUnit: "",
   scheduleType: "now", scheduleDate: "", scheduleTime: "", vehicleType: "", deliveryType: "", itemTypes: [], quantity: 1, itemWeight: "",
  handlingInstructions: [], notesToDriver: "", itemPhoto: null, paymentMethod: "cash", paymentSide: "sender",
};
/* ═══ BookDeliveryPage ═══ */
const BookDeliveryPage = ({ savedAddresses = [], onSaveAddress }) => {
  const [step, setStep] = useState(1);
  const location = useLocation();
  const repeated = location.state?.repeatBooking;
  // Book Again copies the old route and parcel details, but does NOT submit automatically.
  const [form, setForm] = useState(() => repeated ? {
    ...BOOKING_INITIAL,
    pickup: repeated.pickup,
    dropoff: repeated.dropoff,
    recipientName: repeated.recipientName || "",
    recipientPhone: repeated.recipientPhone || "",
    recipientUnit: repeated.recipientUnit || "",
    vehicleType: repeated.vehicleTypeId || "",
    deliveryType: repeated.deliveryType || "regular",
    itemTypes: repeated.itemTypes || [],
    quantity: repeated.quantity || 1,
    notesToDriver: repeated.notesToDriver || "",
    itemWeight: repeated.itemWeight || "",
    paymentMethod: "cash",
    paymentSide: "sender",
  } : BOOKING_INITIAL);
  const [routeInfo, setRouteInfo] = useState(null);
  const [mapMode, setMapMode] = useState("pickup");
  const [mapExpanded, setMapExpanded] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [confirmedId, setConfirmedId] = useState("");
  const [confirmedPrice, setConfirmedPrice] = useState(null);
  const [showSavedPicker, setShowSavedPicker] = useState(null);
  const mapRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsMessage, setGpsMessage] = useState("");

  // Same navigator.geolocation API used for real driver tracking, but here
  // we request ONE location to fill the customer's pickup pin.
  function useMyLocation() {
    if (!navigator.geolocation) {
      setGpsMessage("This device does not support location services.");
      return;
    }
    setGpsLoading(true);
    setGpsMessage("");
    navigator.geolocation.getCurrentPosition(async function (position) {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      let address = lat.toFixed(5) + ", " + lng.toFixed(5);
      try {
        // Reverse-geocode the coordinate into a readable address.
        const key = import.meta.env.VITE_GEOAPIFY_API_KEY;
        if (key) {
          const response = await fetch(`https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&apiKey=${key}`);
          if (response.ok) {
            const data = await response.json();
            address = data.features?.[0]?.properties?.formatted || address;
          }
        }
      } catch (error) {
        // The GPS pin remains usable even if address lookup fails.
        console.warn("Reverse geocoding:", error.message);
      }
      handlePickup({ lat, lng, address });
      setGpsLoading(false);
    }, function (error) {
      setGpsLoading(false);
      setGpsMessage("Unable to get GPS: " + error.message);
    }, { enableHighAccuracy: true, timeout: 15000 });
  }

  // Simple distance in metres between two geographic coordinates.
  function pinDistanceMeters(a, b) {
    if (!a || !b) return 0;
    const radians = degrees => degrees * Math.PI / 180;
    const latDistance = radians(b.lat - a.lat);
    const lngDistance = radians(b.lng - a.lng);
    const value = Math.sin(latDistance / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(lngDistance / 2) ** 2;
    return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  }
  const locationsTooClose = form.pickup && form.dropoff && pinDistanceMeters(form.pickup, form.dropoff) < 100;
  const [credit, setCredit] = useState(0);
  useEffect(() => { extraService.myCredit().then(result => setCredit(result.creditCentavos / 100)).catch(() => {}); }, []);

  // Google Maps is not Leaflet: do not call invalidateSize().
  // Trigger a map resize when the map panel expands or collapses.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const map = mapRef.current?.getMap();
      if (map) window.google?.maps?.event?.trigger?.(map, "resize");
    });
    return () => cancelAnimationFrame(frame);
  }, [mapExpanded]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggle = (k, id) => setForm(f => ({ ...f, [k]: f[k].includes(id) ? f[k].filter(x => x !== id) : [...f[k], id] }));

  const isLocStep = step === 1;
  const estimate = routeInfo ? fareBreakdown(form.vehicleType, Number(routeInfo.distance), form.deliveryType) : null;
  const estimatedFee = estimate ? estimate.total : null;

  const handlePickup = (pin) => { set("pickup", pin); setMapMode("dropoff"); };
  const handleDropoff = (pin) => { set("dropoff", pin); setMapMode("pickup"); };
  const handleClear = () => { setForm(f => ({ ...f, pickup: null, dropoff: null })); setRouteInfo(null); setMapMode("pickup"); };

  const selVehicle = VEHICLES.find(v => v.id === form.vehicleType);
  const selItems = ITEM_TYPES.filter(i => form.itemTypes.includes(i.id));
  const selHandling = HANDLING.filter(i => form.handlingInstructions.includes(i.id));

  // STEP A (CUSTOMER): The final "Confirm Booking" button calls this function.
  // React collects form state -> bookingService.create() -> HTTP POST /api/bookings.
  // Express validates the request, computes the price, and saves it in MongoDB.
  // Express returns JSON { booking: {...} }; apiRequest() converts JSON to an object.
  async function handleConfirm() {
    if (submitting) return;
    setSubmitting(true);
    setBookingError("");
    try {
      // The object below is the request body (req.body in Express).
      // We intentionally do NOT send customerId or an official price:
      // Express uses req.user from the login cookie and calculates the price.
      const result = await bookingService.create({
        pickup: form.pickup,
        dropoff: form.dropoff,
        vehicleType: form.vehicleType,
        deliveryType: form.deliveryType,
        recipientName: form.recipientName,
        recipientPhone: form.recipientPhone,
        recipientUnit: form.recipientUnit,
        scheduleType: form.scheduleType === "later" ? "scheduled" : "now",
        scheduleDate: form.scheduleDate,
        scheduleTime: form.scheduleTime,
        itemTypes: form.itemTypes,
        quantity: form.quantity,
        itemWeight: form.itemWeight,
        handlingInstructions: form.handlingInstructions,
        notesToDriver: form.notesToDriver,
        paymentMethod: form.paymentMethod,
        paymentSide: form.paymentSide,
      });
      // The MongoDB booking now exists. Show its public order reference.
      setConfirmedId(result.booking.id);
      // Optional parcel photo is a second FormData request. It is stored
      // as a private server upload, not browser localStorage/base64.
      if (form.itemPhoto instanceof File) {
        try { await bookingService.attachPhoto(result.booking.id, form.itemPhoto); }
        catch (photoError) { alert("Booking saved, but photo upload failed: " + photoError.message); }
      }
      // Express sends back the price it actually calculated using Geoapify.
      setConfirmedPrice(result.booking.price);
      setShowSuccess(true);
    } catch (error) {
      // Validation/network failures should show a message instead of success.
      setBookingError(error.message);
    } finally {
      // Always re-enable the button, whether saving succeeded or failed.
      setSubmitting(false);
    }
  }

  const useSaved = (addr) => { const pin = { lat: addr.lat, lng: addr.lng, address: addr.address }; if (showSavedPicker === "pickup") handlePickup(pin); else handleDropoff(pin); setShowSavedPicker(null); };
  const useMapPicker = () => { setMapMode(showSavedPicker); setShowSavedPicker(null); };

  const EYEBROWS = ["Set Locations", "Schedule", "Recipient", "Package Details", "Review & Confirm"];
  const TITLES = ["Where to?", "When should we pick it up?", "Who's receiving it?", "What are you sending?", "Looks good?"];
  const DESCS = [
    "Search or pin your pickup and drop-off locations on the map.",
    "Send it right now, or schedule for later.",
    "Tell us who will receive the package at the drop-off.",
    "Tell us about your package and any handling requirements.",
    "Review your booking details before confirming.",
  ];

  return (
    <UserLayout hideFooter user={{ name: `${user?.firstName || ""} ${user?.lastName || ""}`.trim() }} notifications={MOCK_NOTIFICATIONS_USER}>
      <div className="bd-shell">
        <div className={`bd-panel${!isLocStep ? " bd-panel--wide" : ""}`}>
          <div className={`bd-inner${!isLocStep ? " bd-inner--wide" : ""}`}>
            <div className="bd-step-head">
              <div className="bd-step-meta"><span className="bd-step-eyebrow">{EYEBROWS[step - 1]}</span></div>
              <h2 className="bd-step-title">{TITLES[step - 1]}</h2>
              <p className="bd-step-desc">{DESCS[step - 1]}</p>
            </div>

            {step === 1 && (
              <div className="bd-step-body">
                <div className="bd-sec">
                  <div className="bd-sec-label">Locations</div>
                  <LocCard type="pickup" pin={form.pickup} onEdit={() => setShowSavedPicker("pickup")} />
                  <button type="button" className="feature-secondary" onClick={useMyLocation} disabled={gpsLoading}>
                    <Navigation size={15} /> {gpsLoading ? "Getting your position…" : "Use my current location for pickup"}
                  </button>
                  {gpsMessage && <p role="status" className="feature-mini">{gpsMessage}</p>}
                  {locationsTooClose && <p className="feature-error">Pickup and drop-off must be at least 100 metres apart.</p>}
                  <LocCard type="dropoff" pin={form.dropoff} onEdit={() => setShowSavedPicker("dropoff")} />
                  {routeInfo && (<div className="bd-route-info"><span><strong>{routeInfo.distance} km</strong> distance</span><span><strong>~{routeInfo.durationLabel}</strong> estimated</span></div>)}
                </div>
                <div className="bd-actions"><button className="btn-bd-next" onClick={() => setStep(2)} type="button" disabled={!form.pickup || !form.dropoff || locationsTooClose}>Continue <ArrowRight size={14} /></button></div>
              </div>
            )}

            {step === 2 && (
              <div className="bd-step-body">
                <div className="bd-sec">
                  <div className="bd-sec-label">When to pick up?</div>
                  <div className="bd-grid-2">
                    <SqCard compact selected={form.scheduleType === "now"} onClick={() => set("scheduleType", "now")} Icon={Clock} label="Now" sub="ASAP" />
                    <SqCard compact selected={form.scheduleType === "later"} onClick={() => set("scheduleType", "later")} Icon={CalendarDays} label="Later" sub="Pick date & time" />
                  </div>
                  {form.scheduleType === "later" && (
                    <div className="bd-row2 bd-row2--spaced">
                      <Field label="Date"><input type="date" className="field__input" value={form.scheduleDate} onChange={e => set("scheduleDate", e.target.value)} /></Field>
                      <Field label="Time"><input type="time" className="field__input" value={form.scheduleTime} onChange={e => set("scheduleTime", e.target.value)} /></Field>
                    </div>
                  )}
                </div>
                <div className="bd-actions">
                  <button className="btn-bd-back" type="button" onClick={() => setStep(1)}><ArrowLeft size={14} /> Back</button>
                  <button className="btn-bd-next" type="button" onClick={() => setStep(3)} disabled={form.scheduleType === "later" && (!form.scheduleDate || !form.scheduleTime)}>Continue <ArrowRight size={14} /></button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="bd-step-body">
                <div className="bd-sec">
                  <div className="bd-sec-label">Recipient details</div>
                  <div className="bd-row2">
                    <Field label="Full name"><input className="field__input" placeholder="e.g. Maria Santos" value={form.recipientName} onChange={e => set("recipientName", e.target.value)} /></Field>
                    <Field label="Contact number"><input className="field__input" placeholder="09XX XXX XXXX" value={form.recipientPhone} onChange={e => set("recipientPhone", e.target.value)} /></Field>
                  </div>
                  <Field label="Unit / Floor (optional)"><input className="field__input" placeholder="e.g. Unit 3B, 2nd Floor" value={form.recipientUnit} onChange={e => set("recipientUnit", e.target.value)} /></Field>
                </div>
                <div className="bd-actions">
                  <button className="btn-bd-back" type="button" onClick={() => setStep(2)}><ArrowLeft size={14} /> Back</button>
                  <button className="btn-bd-next" type="button" onClick={() => setStep(4)} disabled={!form.recipientName.trim() || !/^\+?\d[\d\s-]{8,14}$/.test(form.recipientPhone)}>Continue <ArrowRight size={14} /></button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="bd-step-body bd-step-body--lg">
                <div className="bd-sec">
                  <VehicleSelect
                    label="Vehicle Type"
                    placeholder="Select a vehicle type"
                    placeholderIcon={Car}
                    value={form.vehicleType}
                    onChange={(v) => set("vehicleType", v)}
                    options={VEHICLES.map(v => ({ value: v.id, label: v.label, sub: v.sub, Icon: v.Icon }))}
                  />
                </div>
                <div className="bd-sec">
                  <VehicleSelect
                    label="Delivery Type"
                    placeholder="Select a delivery type"
                    placeholderIcon={Truck}
                    value={form.deliveryType}
                    onChange={(v) => set("deliveryType", v)}
                    options={[
                      { value: "regular", label: "Regular", sub: "Standard delivery", Icon: Clock },
                      { value: "priority", label: "Priority", sub: "Express delivery", Icon: Zap },
                    ]}
                  />
                </div>
                <div className="bd-sec"><div className="bd-sec-label">Item type <span className="bd-sec-label-note">(select all that apply)</span></div><div className="bd-grid-5">{ITEM_TYPES.map(i => (<SqCard key={i.id} size="sm" selected={form.itemTypes.includes(i.id)} onClick={() => toggle("itemTypes", i.id)} Icon={i.Icon} label={i.label} />))}</div></div>
                <div className="bd-sec">
                  <div className="bd-sec-label">Quantity &amp; Weight</div>
                  <div className="bd-row2">
                    <Field label="Quantity">
                      <div className="bd-qty"><button type="button" onClick={() => set("quantity", Math.max(1, form.quantity - 1))}>−</button><span>{form.quantity}</span><button type="button" onClick={() => set("quantity", form.quantity + 1)}>+</button></div>
                    </Field>
                    <Field label="Approx. weight"><input className="field__input" placeholder="e.g. 2 kg" value={form.itemWeight} onChange={e => set("itemWeight", e.target.value)} /></Field>
                  </div>
                </div>
                <div className="bd-sec"><div className="bd-sec-label">Item photo <span className="bd-sec-label-note">(optional)</span></div><FileUpload label="Attach photo" imageOnly value={form.itemPhoto} onChange={(f) => set("itemPhoto", f)} /></div>
                <div className="bd-sec"><div className="bd-sec-label">Handling instructions <span className="bd-sec-label-note">(optional)</span></div><div className="bd-grid-3">{HANDLING.map(i => (<SqCard key={i.id} size="sm" selected={form.handlingInstructions.includes(i.id)} onClick={() => toggle("handlingInstructions", i.id)} Icon={i.Icon} label={i.label} />))}</div></div>
                <div className="bd-sec"><div className="bd-sec-label">Notes to driver <span className="bd-sec-label-note">(optional)</span></div><textarea className="field__textarea" placeholder="Special instructions, landmarks, gate codes…" value={form.notesToDriver} onChange={e => set("notesToDriver", e.target.value)} /></div>
                <div className="bd-actions">
                  <button className="btn-bd-back" type="button" onClick={() => setStep(3)}><ArrowLeft size={14} /> Back</button>
                  <button className="btn-bd-next" type="button" onClick={() => setStep(5)} disabled={!form.vehicleType || !form.deliveryType || form.itemTypes.length === 0}>Continue <ArrowRight size={14} /></button>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="bd-step-body bd-step-body--sm">
                <ReviewGroup title="Locations" Icon={MapPin}>
                  <RR label="Pickup" value={form.pickup?.address} />
                  <RR label="Drop-off" value={form.dropoff?.address} />
                  {routeInfo && <RR label="Route" value={`${routeInfo.distance} km · ~${routeInfo.durationLabel}`} />}
                  <RR label="Schedule" value={form.scheduleType === "now" ? "Now (ASAP)" : `${form.scheduleDate} ${form.scheduleTime}`} />
                </ReviewGroup>
                <ReviewGroup title="Recipient" Icon={UserRound}><RR label="Name" value={form.recipientName} /><RR label="Contact" value={form.recipientPhone} />{form.recipientUnit && <RR label="Unit/Floor" value={form.recipientUnit} />}</ReviewGroup>
                <ReviewGroup title="Package" Icon={Package}>
                  <RR label="Vehicle" value={selVehicle?.label} />
                  <RR label="Delivery Type" value={form.deliveryType ? (form.deliveryType === "priority" ? "Priority" : "Regular") : undefined} />
                  <RR label="Items" value={selItems.map(i => i.label).join(", ") || undefined} />
                  <RR label="Qty" value={String(form.quantity)} />
                  {form.itemWeight && <RR label="Weight" value={form.itemWeight} />}
                  {selHandling.length > 0 && <RR label="Handling" value={selHandling.map(i => i.label).join(", ")} />}
                  {form.notesToDriver && <RR label="Notes" value={form.notesToDriver} />}
                </ReviewGroup>
                <ReviewGroup title="Payment" Icon={CreditCard}>
                  <RR label="Method" value="Cash (collected by driver after pickup)" />
                  <RR label="Payer" value="Sender" />
                  {estimate && <>
                    <RR label="Base fare" value={peso(estimate.base)} />
                    <RR label="First distance tier" value={peso(estimate.firstKm)} />
                    <RR label="Remaining distance" value={peso(estimate.extraKm)} />
                    {estimate.priority > 0 && <RR label="Priority surcharge (20%)" value={peso(estimate.priority)} />}
                    <RR label="Estimated total" value={peso(estimate.total)} price />
                    {credit > 0 && <RR label="Available cancellation credit" value={peso(Math.min(credit, estimate.total))} />}
                    {credit > 0 && <RR label="Estimated amount due" value={peso(Math.max(0, estimate.total-credit))} price />}
                  </>}
                </ReviewGroup>
                {bookingError && <p role="alert" style={{ color: "#b42318", marginBottom: 12 }}>{bookingError}</p>}
                <div className="bd-safe-note"><ShieldCheck size={13} /> Final amount is recalculated by the backend using the full driving route.</div>

                <div className="bd-actions bd-actions--review"><button className="btn-bd-back" type="button" onClick={() => setStep(4)}><ArrowLeft size={14} /> Back</button><button className="btn-bd-book" type="button" onClick={handleConfirm} disabled={submitting}><Check size={14} /> {submitting ? "Saving booking…" : "Confirm booking"}</button></div>
              </div>
            )}
          </div>
        </div>

        <div className={`bd-map${!isLocStep ? " bd-map--hidden" : ""}${mapExpanded ? " bd-map--expanded" : ""}`}>
          <MapPicker ref={mapRef} onPickupChange={handlePickup} onDropoffChange={handleDropoff} onRouteChange={setRouteInfo} mapMode={mapMode} pickupCoords={form.pickup} dropoffCoords={form.dropoff} />
          <MapModeSwitcher mode={mapMode} setMode={setMapMode} pickup={form.pickup} dropoff={form.dropoff} onClear={handleClear} />
          <MapZoomControls mapRef={mapRef} />
          <button type="button" className="map-expand-btn" onClick={() => setMapExpanded(v => !v)} title={mapExpanded ? "Collapse map" : "Expand map"}>{mapExpanded ? <FiMinimize2 size={16} /> : <FiMaximize2 size={16} />}</button>
          <MapSearchBar mode={mapMode} onSearch={(pin) => { if (mapMode === "pickup") handlePickup(pin); else handleDropoff(pin); }} />
        </div>

        {showSavedPicker && (<LocationChooserModal mode={showSavedPicker} addresses={savedAddresses} onPickSaved={useSaved} onPinOnMap={useMapPicker} onClose={() => setShowSavedPicker(null)} />)}

        {showSuccess && (
          <div className="success-modal" role="dialog" aria-modal="true" aria-labelledby="success-title">
            <div className="success-modal__overlay" onClick={() => setShowSuccess(false)} />
            <div className="success-modal__card">
              <div className="success-modal__icon"><Check size={32} strokeWidth={3} /></div>
              <h2 id="success-title" className="success-modal__title">Booking Confirmed!</h2>
              <p className="success-modal__desc">Your delivery has been saved in the database. We're matching you with a driver now.</p>
              <div className="success-modal__details">
                <div className="success-modal__detail"><span className="success-modal__detail-label">Booking ID</span><span className="success-modal__detail-value">{confirmedId}</span></div>
                {routeInfo && (<div className="success-modal__detail"><span className="success-modal__detail-label">Route</span><span className="success-modal__detail-value">{routeInfo.distance} km · ~{routeInfo.durationLabel}</span></div>)}
                {confirmedPrice && (<div className="success-modal__detail"><span className="success-modal__detail-label">Total fee</span><span className="success-modal__detail-value success-modal__detail-value--price">{confirmedPrice}</span></div>)}
              </div>
              <div className="success-modal__actions">
                <button type="button" className="success-modal__btn success-modal__btn--ghost" onClick={() => setShowSuccess(false)}>Close</button>
                <button type="button" className="success-modal__btn success-modal__btn--primary" onClick={() => navigate("/active-delivery")}>Track Delivery <ArrowRight size={14} /></button>
              </div>
            </div>
          </div>
        )}
      </div>
    </UserLayout>
  );
};


export default BookDeliveryPage;
