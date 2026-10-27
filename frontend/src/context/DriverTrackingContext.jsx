import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useBookings } from "../hooks/useBookings.js";
import { useAuth } from "./AuthContext.jsx";
import { bookingService } from "../services/bookingService.js";
import { ACTIVE_DELIVERY_STATUSES } from "../utils/helpers.js";

// Mounted once for the entire authenticated driver route tree. Browser location
// sharing only works while the app is running and the browser permits GPS.
const DriverTrackingContext = createContext(null);
const MIN_SEND_INTERVAL_MS = 20_000;
const GPS_REFRESH_INTERVAL_MS = 30_000;
const MAX_FIX_AGE_MS = 15_000;
const MAX_DISPLAY_FIX_AGE_MS = 120_000;
const MAX_ACCURACY_METRES = 200;

export function DriverTrackingProvider({ children }) {
  const { user } = useAuth();
  const bookingState = useBookings();
  const { bookings } = bookingState;
  const [myLocation, setMyLocation] = useState(null);
  const [gpsMessage, setGpsMessage] = useState("Waiting for GPS location…");
  const activeRef = useRef([]);
  const lastFixRef = useRef(0);
  const sentRef = useRef(new Map());

  useEffect(() => {
    activeRef.current = bookings.filter(booking =>
      ACTIVE_DELIVERY_STATUSES.includes(booking.status) &&
      String(booking.driverId) === String(user?.id)
    );
    const activeIds = new Set(activeRef.current.map(booking => booking.id));
    for (const id of sentRef.current.keys()) {
      if (!activeIds.has(id)) sentRef.current.delete(id);
    }
  }, [bookings, user?.id]);

  const receiveFix = useCallback(position => {
    const now = Date.now();
    const capturedAt = Number(position?.timestamp);
    const { latitude, longitude, accuracy } = position.coords;
    if (!Number.isFinite(capturedAt) ||
        capturedAt > now + 5_000 || now - capturedAt > MAX_FIX_AGE_MS) {
      // A watchPosition/getCurrentPosition callback can replay cached or late
      // samples. Ignore them without displaying a false warning if we already
      // have a reasonably recent, accepted fix for the map.
      if (!lastFixRef.current || now - lastFixRef.current > MAX_DISPLAY_FIX_AGE_MS) {
        setGpsMessage("Waiting for a new GPS fix…");
      }
      return;
    }
    // Some browsers emit the same captured GPS fix more than once. Replays
    // must neither refresh server GPS timestamps NOR turn a working route into
    // a misleading 'waiting for GPS' alert.
    if (capturedAt <= lastFixRef.current) return;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        Math.abs(latitude) > 90 || Math.abs(longitude) > 180 ||
        !Number.isFinite(accuracy) || accuracy > MAX_ACCURACY_METRES) {
      setGpsMessage("GPS accuracy is too low. Move to a clearer area or enable precise location.");
      return;
    }

    lastFixRef.current = capturedAt;
    const fix = { lat: latitude, lng: longitude, accuracy, capturedAt };
    setMyLocation({ lat: latitude, lng: longitude });
    setGpsMessage("");
    // Booking polls NEVER cause a GPS upload. Only a new geolocation callback
    // can mark the position fresh, even when the driver has not moved.
    for (const booking of activeRef.current) {
      const last = sentRef.current.get(booking.id);
      if (last && (now - last.sentAt < MIN_SEND_INTERVAL_MS || capturedAt <= last.fixAt)) continue;
      sentRef.current.set(booking.id, { sentAt: now, fixAt: capturedAt });
      bookingService.updateLocation(booking.id, fix).catch(error => {
        console.warn("Driver GPS could not be shared:", error.message);
        // Allow retry with the NEXT real fix, never with a booking refresh.
        if (sentRef.current.get(booking.id)?.fixAt === capturedAt) sentRef.current.delete(booking.id);
        setGpsMessage("GPS sharing failed. Check your connection.");
      });
    }
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsMessage("This browser does not support location sharing.");
      return;
    }
    const onError = error => setGpsMessage(`GPS unavailable: ${error.message}`);
    const options = { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 };
    const watchId = navigator.geolocation.watchPosition(receiveFix, onError, options);
    // Some devices only fire watchPosition after movement. For stationary active
    // deliveries, explicitly request a NEW location fix at a limited interval.
    const interval = setInterval(() => {
      if (activeRef.current.length > 0) {
        navigator.geolocation.getCurrentPosition(receiveFix, onError, options);
      }
      if (lastFixRef.current && Date.now() - lastFixRef.current > MAX_DISPLAY_FIX_AGE_MS) {
        setMyLocation(null);
        setGpsMessage("GPS has not updated recently.");
      }
    }, GPS_REFRESH_INTERVAL_MS);
    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(interval);
    };
  }, [receiveFix]);

  return (
    <DriverTrackingContext.Provider value={{ ...bookingState, myLocation, gpsMessage }}>
      {children}
    </DriverTrackingContext.Provider>
  );
}

export function useDriverTracking() {
  const context = useContext(DriverTrackingContext);
  if (!context) throw new Error("useDriverTracking must be used inside DriverTrackingProvider");
  return context;
}
