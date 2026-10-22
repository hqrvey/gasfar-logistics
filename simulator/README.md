# GASFAR GPS Simulator (local development tool)

A small visual browser tool for testing the **actual GASFAR driver/customer delivery flow**. It is a standalone tool: **you do not need to replace or edit `frontend/src` or `backend/src`.**

- Accepts **driver start**, **pickup**, **drop-off** latitude/longitude.
- Calls Geoapify with `mode=drive` and the same `waypoints=LAT,LNG|LAT,LNG` scheme as `frontend/src/components/common/MapComponents.jsx`. It draws the resulting actual road **shape** in a simplified preview (no background map tiles).
- Takes an estimated **total trip time** and a playback speed (e.g. 20 minutes at 20× ≈ 1 minute simulated wall-clock time).
- Opens an isolated Playwright Chromium browser where you **log in as driver**. No password or session cookie is copied into the simulator.
- Overrides GPS location with `browserContext.setGeolocation()` each second while moving through interpolated **road-distance** waypoints.
- Optionally performs **fast authenticated REST sync** (default ON), posting GPS every ~2 seconds to the **existing** `PATCH /api/bookings/:id/location` endpoint from the logged-in driver browser. No new backend endpoint is introduced. This makes a quick demo visible despite the current React driver's ~20s GPS send throttle.
- Stops at pickup until the actual driver app completes `at_pickup` and `picked_up`. It won't change stages for you.
- Allows pause, continue, and stop. At the end you confirm `arrived` and `delivered` (with PIN) in the actual app.

## 1. Folder placement

Place `gasfar-gps-simulator` alongside your existing frontend/backend, **not inside** `frontend/src`:

```text
gasfar-vite/
├── backend/
├── frontend/
└── gasfar-gps-simulator/
    ├── public/
    ├── server.js
    ├── route.js
    ├── package.json
    └── .env
```

## 2. Install once (Windows PowerShell inside simulator folder)

```powershell
npm install
npx playwright install chromium
```

Requirements: Node.js 20+, a working internet connection for Geoapify and for Playwright's one-time browser download. Run `npm test` to check the routing math (does not need credentials).

## 3. Configure `.env`

Copy `.env.example` to `.env` in this simulator folder. Example:

```dotenv
SIMULATOR_PORT=4175
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5001
GEOAPIFY_API_KEY=YOUR_EXISTING_BACKEND_GEOAPIFY_KEY
```

Use the **exact Vite frontend URL** you're using (`5173`, `5174`, etc.). The **Express CORS `CLIENT_ORIGIN`** must allow this frontend origin. Use `localhost` consistently; mixing it with `127.0.0.1` for your frontend/backend can cause cookie problems.

Store secrets only in this local `.env`, never in `public/` or GitHub. You can copy the Geoapify key from `backend/.env`. The simulator does not require your MongoDB URI, JWT secret or TextBee credentials.

## 4. Run all three programs

Start MongoDB and these three commands in three separate terminals:

```powershell
# terminal 1 (backend)
cd backend
npm run dev

# terminal 2 (frontend)
cd frontend
npm run dev

# terminal 3 (simulator)
cd gasfar-gps-simulator
npm start
```

Open **http://127.0.0.1:4175** in your regular browser. Keep the simulator terminal open.

## 5. Test a complete booking

1. In your regular Chrome/Edge customer session, log in as customer and create a booking. Note the exact **pickup and drop-off coordinates** and the public booking code `ORD-...`.
2. In the simulator, enter a plausible **driver starting coordinate**, the booking's pickup/drop-off coordinates, and click **Calculate road routes**. Geoapify calculates both legs. You can use **Use example coordinates** to try the form, but for an actual booking test use **the booking's real coordinates**.
3. Click **Open separate driver browser**. A new Chromium window opens. Log in as an approved driver **inside that window**, then open the driver dashboard and accept the booking. Keep the driver dashboard open throughout playback.
4. Back in the simulator, enter the booking code, estimated travel time, and speed. For example, 20 minutes at 10× gives about 2 minutes of playback, split between both legs by road distance.
5. Leave **Fast REST syncing ON** for a visible demo. Click **Start drive**. The orange GPS point moves along the Geoapify road route. The GASFAR customer map should show changes after polling (~8 seconds). For a pure driver-app publishing test, turn fast sync OFF and use a slower route—driver page typically sends at most once every 20 seconds.
6. When the simulator reaches pickup it pauses automatically. On the **driver app**, click **I've Arrived at Pickup**, then **Confirm Package Pickup**. Return to the simulator and click **Continue**.
7. When it reaches drop-off, use the **driver app** to mark arrival, receive the TextBee PIN on the recipient phone (or use your explicitly configured local SMS test flow), and complete delivery. The simulator does **not** mark bookings delivered.

## Why do the routes sometimes differ slightly?

The simulator uses the same routing provider and parameters (`mode=drive`, coordinate order). The map in GASFAR recalculates its blue driver-to-pickup route as the position moves, so the live suggested road route may diverge from the original planned path if Geoapify selects a different turn. This isn't an artificial straight-line simulator. Routing results can also change over time.

## What is and isn't tested?

| Tested by this tool | Not automatically tested |
|---|---|
| Geoapify road geometry and timed playback | Real physical GPS/radio accuracy |
| Separate driver login session | SMS delivery unless TextBee is set up |
| Authenticated driver GPS endpoint if fast sync is ON | Customer/driver actions without manual clicks |
| MongoDB GPS updates and customer polling when API requests succeed | Production location reliability or battery use |
| Playwright GPS override | Genuine mobile background behavior |

If **Fast REST syncing** is ON, the simulator calls the GPS REST endpoint in the driver browser and can therefore prove that database/customer tracking works—but it does **not by itself** prove `navigator.geolocation.watchPosition()` triggered React's own sending effect. To test that particular path, disable fast syncing, allow the driver page to publish location at its usual throttle, and check Chrome's Network panel.

## Troubleshooting

- **`Cannot find module playwright`** → Run `npm install` **inside simulator**, not backend.
- **`Executable doesn't exist`** → Run `npx playwright install chromium`.
- **`Could not open browser / not running`** → This tool must run on a machine with a desktop session (not a headless cloud server).
- **`Log in as approved driver`** → Use the Chromium window opened by the tool; another Chrome/Edge window's cookies are not shared.
- **`Booking must be "accepted"`** → Accept the booking in driver window first. At pickup, confirm the package is picked up before continuing.
- **`Failed to fetch`** → Check `FRONTEND_URL`, `BACKEND_URL`, Express process, `CLIENT_ORIGIN`, and the browser console; backend should respond at `http://localhost:5001/api/health`.
- **Geoapify error** → Check `GEOAPIFY_API_KEY`, API quota/network, and make sure all route coordinates are drivable road locations.
- **Customer icon not moving** → Check authenticated REST update result in simulator, `PATCH /api/bookings/:id/location` in DevTools, and `driverLocation` in MongoDB Compass. The customer UI polls roughly every 8 seconds.
- **Very fast speed** → Increase duration or lower playback speed. The tool requires the complete trip to last at least 12 real seconds; for visible customer updates, aim for 1–3 minutes total.

## Safety

**Do not deploy or expose this tool to a network.** It binds to `127.0.0.1` only and is intended for local test bookings. Use dedicated test driver/customer accounts. Never use to falsify location for real deliveries. No backend source files, authentication logic, MongoDB records or customer-facing CSS are changed by installing the tool.
