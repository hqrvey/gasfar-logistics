import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiCheck, FiClock, FiMapPin, FiPlus, FiX, FiMaximize2, FiMinimize2, FiUpload } from "react-icons/fi";
import { ArrowLeft, ArrowRight, Bike, Car, CarFront, CalendarDays, Check, CircleDollarSign, Clock, CreditCard, FileText, Hand, MapPin, Navigation, Package, Pill, Search, Shirt, Thermometer, TriangleAlert, Truck, Utensils, Van, Armchair, BookOpen, Cog, User, UserRound, ArrowUp, Droplets, Layers, Monitor, ShieldCheck, Zap } from "lucide-react";
import { peso } from "../../utils/helpers.js";
import { bookingStore } from "../../services/bookingStore.js";
import { MapPicker, MapModeSwitcher, MapSearchBar, MapZoomControls } from "../../components/common/MapComponents.jsx";
import { SqCard, LocCard, Field, RR, EmptyState, ReviewGroup } from "../../components/common/BookingUI.jsx";
import UserLayout from "../../layouts/UserLayout.jsx";
import { LocationChooserModal } from "../../components/common/ProfileComponents.jsx";
import { FileUpload, VehicleSelect } from "../../components/common/FormComponents.jsx";
import { MOCK_NOTIFICATIONS_USER } from "../../data/demo/clientMockData.js";

// All choices for this booking form are defined here, next to the page.
// Options shown in the multi-step booking form.
// Choices for this form. These are only used by BookDeliveryPage.

const STEPS = ["Locations", "Schedule", "Recipient", "Package", "Payment", "Review"];
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
const PAYMENT_METHODS = [
  { id: "cash", label: "Cash", desc: "Pay on pickup", Icon: CircleDollarSign },
  { id: "gcash", label: "GCash", desc: "via GCash wallet", Icon: CreditCard },
  { id: "maya", label: "Maya", desc: "via Maya wallet", Icon: CreditCard },
];
const BOOKING_INITIAL = {
  pickup: null, dropoff: null, recipientName: "", recipientPhone: "", recipientUnit: "",
   scheduleType: "now", scheduleDate: "", scheduleTime: "", vehicleType: "", deliveryType: "", itemTypes: [], quantity: 1, itemWeight: "",
  handlingInstructions: [], notesToDriver: "", itemPhoto: null, paymentMethod: "cash", paymentSide: "sender",
};
/* ═══ BookDeliveryPage ═══ */
const BookDeliveryPage = ({ savedAddresses = [], onSaveAddress }) => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(BOOKING_INITIAL);
  const [routeInfo, setRouteInfo] = useState(null);
  const [mapMode, setMapMode] = useState("pickup");
  const [mapExpanded, setMapExpanded] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [confirmedId, setConfirmedId] = useState("");
  const [showSavedPicker, setShowSavedPicker] = useState(null);
  const mapRef = useRef(null);
  const navigate = useNavigate();

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
  const estimatedFee = routeInfo ? Math.round(parseFloat(routeInfo.distance) * 12 + 50) : null;

  const handlePickup = (pin) => { set("pickup", pin); setMapMode("dropoff"); };
  const handleDropoff = (pin) => { set("dropoff", pin); setMapMode("pickup"); };
  const handleClear = () => { setForm(f => ({ ...f, pickup: null, dropoff: null })); setRouteInfo(null); setMapMode("pickup"); };

  const selVehicle = VEHICLES.find(v => v.id === form.vehicleType);
  const selItems = ITEM_TYPES.filter(i => form.itemTypes.includes(i.id));
  const selHandling = HANDLING.filter(i => form.handlingInstructions.includes(i.id));

  // Save locally for now. Replace bookingStore with the booking API later.
  const handleConfirm = () => {
    const id = `ORD-${Date.now()}`;
    bookingStore.create({
      id,
      status: "pending",
      pickup: form.pickup,
      dropoff: form.dropoff,
      vehicleType: (selVehicle?.label) || form.vehicleType,
      itemDetails: `${selItems.map(i => i.label).join(", ")} · Qty: ${form.quantity}`,
      handlingInstructions: form.handlingInstructions,
      notesToDriver: form.notesToDriver,
      recipientName: form.recipientName,
      recipientPhone: form.recipientPhone,
      recipientUnit: form.recipientUnit,
      scheduleType: form.scheduleType,
      scheduleDate: form.scheduleDate,
      scheduleTime: form.scheduleTime,
      itemTypes: form.itemTypes,
      itemWeight: form.itemWeight,
      quantity: form.quantity,
      paymentSide: form.paymentSide,
      // Files cannot be stored directly as JSON in localStorage.
      // When you build Express file uploads, send itemPhoto separately.
      price: peso(estimatedFee ?? 0),
      paymentMethod: form.paymentMethod.charAt(0).toUpperCase() + form.paymentMethod.slice(1),
      customerName: "Juan Dela Cruz",
      contactNumber: form.recipientPhone,
      deliveryType: form.deliveryType,
      driver: null,
      driverLocation: null,
      etaMins: null,
      bookedAt: new Date().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }),
    });
    setConfirmedId(id);
    setShowSuccess(true);
  };

  const useSaved = (addr) => { const pin = { lat: addr.lat, lng: addr.lng, address: addr.address }; if (showSavedPicker === "pickup") handlePickup(pin); else handleDropoff(pin); setShowSavedPicker(null); };
  const useMapPicker = () => { setMapMode(showSavedPicker); setShowSavedPicker(null); };

  const EYEBROWS = ["Set Locations", "Schedule", "Recipient", "Package Details", "Payment", "Review & Confirm"];
  const TITLES = ["Where to?", "When should we pick it up?", "Who's receiving it?", "What are you sending?", "How will this be paid?", "Looks good?"];
  const DESCS = [
    "Search or pin your pickup and drop-off locations on the map.",
    "Send it right now, or schedule for later.",
    "Tell us who will receive the package at the drop-off.",
    "Tell us about your package and any handling requirements.",
    "Choose a payment method and who covers the delivery fee.",
    "Review your booking details before confirming.",
  ];

  return (
    <UserLayout hideFooter user={{ name: "Juan Dela Cruz" }} notifications={MOCK_NOTIFICATIONS_USER}>
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
                  <LocCard type="dropoff" pin={form.dropoff} onEdit={() => setShowSavedPicker("dropoff")} />
                  {routeInfo && (<div className="bd-route-info"><span><strong>{routeInfo.distance} km</strong> distance</span><span><strong>~{routeInfo.durationLabel}</strong> estimated</span></div>)}
                </div>
                <div className="bd-actions"><button className="btn-bd-next" onClick={() => setStep(2)} type="button" disabled={!form.pickup || !form.dropoff}>Continue <ArrowRight size={14} /></button></div>
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
                  <button className="btn-bd-next" type="button" onClick={() => setStep(4)}>Continue <ArrowRight size={14} /></button>
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
              <div className="bd-step-body bd-step-body--lg">
                <div className="bd-sec"><div className="bd-sec-label">Payment method</div><div className="bd-grid-3">{PAYMENT_METHODS.map(m => (<SqCard key={m.id} selected={form.paymentMethod === m.id} onClick={() => set("paymentMethod", m.id)} Icon={m.Icon} label={m.label} sub={m.desc} />))}</div></div>
                <div className="bd-sec"><div className="bd-sec-label">Who pays?</div><div className="bd-grid-2"><SqCard selected={form.paymentSide === "sender"} onClick={() => set("paymentSide", "sender")} Icon={User} label="Sender" sub="I'll pay" /><SqCard selected={form.paymentSide === "recipient"} onClick={() => set("paymentSide", "recipient")} Icon={UserRound} label="Recipient" sub="They'll pay" /></div></div>
                {estimatedFee !== null && (<div className="bd-fee"><div><div className="bd-fee__label">Estimated fee</div><div className="bd-fee__meta">{routeInfo?.distance} km · ~{routeInfo?.durationLabel}</div></div><div className="bd-fee__value">{peso(estimatedFee)}</div></div>)}
                <div className="bd-secure"><ShieldCheck size={14} /><span>Payment is collected on pickup or delivery. Final fee may vary based on actual route.</span></div>
                <div className="bd-actions"><button className="btn-bd-back" type="button" onClick={() => setStep(4)}><ArrowLeft size={14} /> Back</button><button className="btn-bd-next" type="button" onClick={() => setStep(6)}>Review booking <ArrowRight size={14} /></button></div>
              </div>
            )}

            {step === 6 && (
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
                  <RR label="Method" value={form.paymentMethod.charAt(0).toUpperCase() + form.paymentMethod.slice(1)} />
                  <RR label="Payer" value={form.paymentSide === "sender" ? "Sender (you)" : "Recipient"} />
                  {estimatedFee !== null && <RR label="Est. fee" value={peso(estimatedFee)} price />}
                </ReviewGroup>
                <div className="bd-safe-note"><ShieldCheck size={13} /> Your details are safe and secure with GASFAR.</div>
                <div className="bd-actions bd-actions--review"><button className="btn-bd-back" type="button" onClick={() => setStep(5)}><ArrowLeft size={14} /> Back</button><button className="btn-bd-book" type="button" onClick={handleConfirm}><Check size={14} /> Confirm booking</button></div>
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
              <p className="success-modal__desc">Your delivery has been booked. We're matching you with a driver now.</p>
              <div className="success-modal__details">
                <div className="success-modal__detail"><span className="success-modal__detail-label">Booking ID</span><span className="success-modal__detail-value">{confirmedId}</span></div>
                {routeInfo && (<div className="success-modal__detail"><span className="success-modal__detail-label">Route</span><span className="success-modal__detail-value">{routeInfo.distance} km · ~{routeInfo.durationLabel}</span></div>)}
                {estimatedFee !== null && (<div className="success-modal__detail"><span className="success-modal__detail-label">Total fee</span><span className="success-modal__detail-value success-modal__detail-value--price">{peso(estimatedFee)}</span></div>)}
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
