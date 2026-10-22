import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { validPoint, requestRoute, interpolateRoute } from './route.js';

const DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(DIRECTORY, '.env') });
const PORT = Number(process.env.SIMULATOR_PORT || 4175);
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5178').replace(/\/$/, '');
const BACKEND_URL = (process.env.BACKEND_URL || 'http://localhost:5001').replace(/\/$/, '');
const GEOAPIFY_KEY = process.env.GEOAPIFY_API_KEY;

let browser;
let driverContext;
let driverPage;
let plannedRoute;
let session;
let timer;
let tickRunning = false;
let lastProblem = '';

function respond(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
}
function ensure(ok, reason, status = 400) {
  if (!ok) throw Object.assign(new Error(reason), { status });
}
function publicState() {
  return {
    browserOpen: Boolean(driverPage && !driverPage.isClosed()),
    routeReady: Boolean(plannedRoute),
    phase: session?.phase || 'idle',
    progress: session?.progress || 0,
    current: session?.current || plannedRoute?.start || null,
    bookingCode: session?.bookingCode || '',
    message: lastProblem,
    sent: session?.sent || 0,
    latestApiStatus: session?.latestApiStatus || '',
  };
}
async function bodyJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    ensure(raw.length < 20000, 'Request body is too large.', 413);
  }
  try { return JSON.parse(raw || '{}'); }
  catch { throw Object.assign(new Error('Invalid JSON body.'), { status: 400 }); }
}

// The browser window opened here has its own cookies, separate from your
// normal Chrome/Edge customer session. Log in as driver in that window.
async function openDriverBrowser() {
  ensure(plannedRoute, 'Calculate a route before opening the driver browser.');
  if (driverPage && !driverPage.isClosed()) {
    await driverPage.bringToFront();
    return;
  }
  const { chromium } = await import('playwright');
  browser = await chromium.launch({ headless: false });
  driverContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    geolocation: {
      latitude: plannedRoute.start.lat,
      longitude: plannedRoute.start.lng,
      accuracy: 10,
    },
  });
  await driverContext.grantPermissions(['geolocation'], { origin: new URL(FRONTEND_URL).origin });
  driverPage = await driverContext.newPage();
  await driverPage.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
  browser.on('disconnected', () => {
    browser = undefined;
    driverContext = undefined;
    driverPage = undefined;
    if (session?.phase === 'to_pickup' || session?.phase === 'to_dropoff') pauseSimulation();
  });
}

// Check GASFAR auth/booking through the ACTUAL driver browser, so the
// HTTP-only gasfar_session cookie stays in its intended browser session.
async function driverApi(endpoint, method = 'GET', payload) {
  ensure(driverPage && !driverPage.isClosed(), 'Open the driver browser and log in first.');
  return driverPage.evaluate(async ({ backend, endpoint, method, payload }) => {
    try {
      const response = await fetch(`${backend}${endpoint}`, {
        method, credentials: 'include',
        headers: payload ? { 'Content-Type': 'application/json' } : {},
        body: payload ? JSON.stringify(payload) : undefined,
      });
      const result = await response.json().catch(() => ({}));
      return { ok: response.ok, status: response.status, result };
    } catch (error) {
      return { ok: false, status: 0, result: { message: error.message } };
    }
  }, { backend: BACKEND_URL, endpoint, method, payload });
}
async function checkBooking(bookingCode, expectedStatus) {
  const auth = await driverApi('/api/auth/me');
  ensure(auth.ok && auth.result.user?.role === 'driver', 'Log in as an approved driver in the opened browser window first.', 403);
  const current = await driverApi(`/api/bookings/${encodeURIComponent(bookingCode)}`);
  ensure(current.ok, current.result.message || 'Booking not found or not assigned to your driver.', 403);
  ensure(current.result.booking?.driverId === auth.result.user.id,
    'This booking is not assigned to the logged-in driver.', 403);
  ensure(current.result.booking.status === expectedStatus,
    `Booking must be "${expectedStatus}" before this leg. Current status: "${current.result.booking.status}".`, 409);
  return current.result.booking;
}
function stopTimer() {
  clearTimeout(timer);
  timer = undefined;
}
function pauseSimulation() {
  if (!session || !['to_pickup', 'to_dropoff'].includes(session.phase)) return;
  session.remainingMs = Math.max(0, session.durationMs - (Date.now() - session.startedAt));
  session.phaseBeforePause = session.phase;
  session.phase = 'paused';
  stopTimer();
}

async function tick() {
  if (!session || !['to_pickup', 'to_dropoff'].includes(session.phase) || tickRunning) return;
  tickRunning = true;
  try {
    const phase = session.phase;
    const legPart = Math.min(1, (Date.now() - session.startedAt) / session.durationMs);
    const progress = session.startFraction + (1 - session.startFraction) * legPart;
    const points = phase === 'to_pickup' ? plannedRoute.toPickup.coords : plannedRoute.toDropoff.coords;
    const position = interpolateRoute(points, progress);
    session.progress = Math.round(progress * 100);
    session.current = position;
    await driverContext.setGeolocation({
      latitude: position.lat,
      longitude: position.lng,
      accuracy: 10,
    });

    // Optional fast demo: use the SAME protected REST endpoint as the React
    // driver app. This sends through the driver's logged-in browser session,
    // not through an admin credential or a simulated server-side driver.
    // Useful because the existing React driver page rate-limits sends to 20s.
    if (session.fastSync && Date.now() - session.lastSendAt >= 2000) {
      const result = await driverApi(`/api/bookings/${encodeURIComponent(session.bookingCode)}/location`, 'PATCH', position);
      session.lastSendAt = Date.now();
      session.latestApiStatus = result.ok ? 'Location saved via REST API' : (result.result.message || `HTTP ${result.status}`);
      if (result.ok) session.sent += 1;
      else lastProblem = session.latestApiStatus;
    }

    if (progress >= 1) {
      session.phase = phase === 'to_pickup' ? 'waiting_pickup' : 'finished';
      session.progress = 100;
      stopTimer();
    }
  } catch (error) {
    lastProblem = `GPS update failed: ${error.message}`;
    pauseSimulation();
  } finally {
    tickRunning = false;
    if (session && ['to_pickup', 'to_dropoff'].includes(session.phase)) {
      timer = setTimeout(tick, 1000);
    }
  }
}
function beginLeg(phase, durationMs, startFraction = 0) {
  stopTimer();
  session.phase = phase;
  session.startedAt = Date.now();
  session.durationMs = Math.max(1000, durationMs);
  session.startFraction = startFraction;
  session.progress = Math.round(startFraction * 100);
  tick();
}
async function loadStatic(req, res, file) {
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
  const name = file === '/' ? 'index.html' : path.basename(file);
  ensure(['index.html', 'style.css', 'app.js'].includes(name), 'Not found.', 404);
  const data = await fs.readFile(path.join(DIRECTORY, 'public', name));
  res.writeHead(200, { 'Content-Type': `${types[path.extname(name)]}; charset=utf-8`, 'Cache-Control': 'no-store' });
  res.end(data);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/api/status') return respond(res, 200, publicState());
    if (req.method === 'GET') return await loadStatic(req, res, req.url);
    ensure(req.method === 'POST', 'Method not allowed.', 405);
    // Prevent ordinary web pages from making cross-site requests to this local simulator.
    ensure(req.headers['x-gasfar-simulator'] === 'local-ui', 'Request must come from the local simulator interface.', 403);
    ensure(!req.headers.origin || req.headers.origin === `http://127.0.0.1:${PORT}`, 'Unexpected browser origin.', 403);
    const input = await bodyJson(req);
    if (req.url === '/api/route') {
      ensure(!session || ['idle', 'finished'].includes(session.phase), 'Stop the simulation before changing the route.');
      ensure([input.start, input.pickup, input.dropoff].every(validPoint), 'Enter valid latitude/longitude for all three locations.');
      ensure(GEOAPIFY_KEY, 'Set GEOAPIFY_API_KEY in gasfar-gps-simulator/.env (same key as your backend).');
      const toPickup = await requestRoute(input.start, input.pickup, GEOAPIFY_KEY);
      const toDropoff = await requestRoute(input.pickup, input.dropoff, GEOAPIFY_KEY);
      // Make sure both calculated routes exist
      if (!toPickup || !toDropoff) {
        throw new Error(
          "Geoapify did not return both calculated routes."
        );
      }

      console.log("Driver to pickup:", toPickup.distanceMeters);
      console.log("Pickup to drop-off:", toDropoff.distanceMeters);
      // Check that Geoapify returned complete routing data
      const routesAreValid = [toPickup, toDropoff].every((leg) => {
        return (
          leg &&
          Array.isArray(leg.coords) &&
          leg.coords.length >= 2 &&
          Number.isFinite(leg.distanceMeters) &&
          Number.isFinite(leg.estimatedSeconds)
        );
      });

      ensure(
        routesAreValid,
        "Incomplete route data received. Check the Geoapify response.",
        502
      );

      plannedRoute = { start: input.start, pickup: input.pickup, dropoff: input.dropoff, toPickup, toDropoff };
      session = undefined;
      lastProblem = '';
      return respond(res, 200, { route: plannedRoute });
    }
    if (req.url === '/api/browser/open') {
      await openDriverBrowser();
      return respond(res, 200, publicState());
    }
    if (req.url === '/api/simulation/start') {
      ensure(plannedRoute, 'Calculate the route first.');
      ensure(driverContext && driverPage && !driverPage.isClosed(), 'Open the driver browser first.');
      ensure(!session || !['to_pickup', 'to_dropoff', 'paused', 'waiting_pickup'].includes(session.phase), 'Stop the current simulation first.');
      const bookingCode = String(input.bookingCode || '').trim();
      ensure(/^ORD-[\w-]{6,64}$/i.test(bookingCode), 'Enter the booking code shown on the driver dashboard.');
      const minutes = Number(input.minutes), speed = Number(input.speed);
      ensure(Number.isFinite(minutes) && minutes >= 1 && minutes <= 240, 'Travel time must be 1–240 minutes.');
      ensure(Number.isFinite(speed) && speed >= 1 && speed <= 120, 'Playback speed must be 1–120×.');
      await checkBooking(bookingCode, 'accepted');
      const totalMs = minutes * 60000 / speed;
      ensure(totalMs >= 12000, 'Slow down playback: give the complete trip at least 12 real seconds.');
      const a = Math.max(1, plannedRoute.toPickup.distanceMeters);
      const b = Math.max(1, plannedRoute.toDropoff.distanceMeters);
      session = {
        bookingCode, fastSync: Boolean(input.fastSync), minutes, speed,
        pickupMs: Math.max(5000, totalMs * a / (a + b)), dropoffMs: Math.max(5000, totalMs * b / (a + b)),
        phase: 'idle', current: plannedRoute.start, sent: 0, lastSendAt: 0,
        latestApiStatus: '', progress: 0,
      };
      lastProblem = '';
      await driverContext.setGeolocation({
        latitude: plannedRoute.start.lat,
        longitude: plannedRoute.start.lng,
        accuracy: 10,
      });
      beginLeg('to_pickup', session.pickupMs);
      return respond(res, 200, publicState());
    }
    if (req.url === '/api/simulation/pause') {
      ensure(session && ['to_pickup', 'to_dropoff'].includes(session.phase), 'Simulation is not currently moving.');
      pauseSimulation();
      return respond(res, 200, publicState());
    }
    if (req.url === '/api/simulation/resume') {
      ensure(session, 'Start a simulation first.');
      if (session.phase === 'waiting_pickup') {
        await checkBooking(session.bookingCode, 'picked_up');
        beginLeg('to_dropoff', session.dropoffMs);
      } else if (session.phase === 'paused') {
        const phase = session.phaseBeforePause;
        // Before drop-off leg, require pickup confirmation to remain complete.
        if (phase === 'to_dropoff') await checkBooking(session.bookingCode, 'picked_up');
        beginLeg(phase, session.remainingMs, session.progress / 100);
      } else {
        throw Object.assign(new Error('Nothing is paused or waiting for pickup.'), { status: 409 });
      }
      return respond(res, 200, publicState());
    }
    if (req.url === '/api/simulation/stop') {
      stopTimer();
      session = undefined;
      lastProblem = '';
      return respond(res, 200, publicState());
    }
    throw Object.assign(new Error('Not found.'), { status: 404 });
  } catch (error) {
    const msg = error.message || 'Unexpected error.';
    console.error('[GPS simulator]', msg);
    respond(res, error.status || 500, { message: msg });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`GASFAR GPS Simulator: http://127.0.0.1:${PORT}`);
  console.log('Local development tool only. Do not deploy or port-forward it.');
});

async function shutdown() {
  stopTimer();
  if (browser) await browser.close().catch(() => {});
  server.close();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
