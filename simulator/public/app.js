const $ = (id) => document.getElementById(id);
let route;
let previousPhase = '';
let currentGps;
let operationBusy = false;

async function api(path, body) {
  const response = await fetch(`/api/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json', 'x-gasfar-simulator': 'local-ui' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || `Request failed (${response.status})`);
  return result;
}
async function operation(action) {
  if (operationBusy) return;
  operationBusy = true;
  $('error').hidden = true;
  try { await action(); await refresh(); }
  catch (error) { $('error').textContent = error.message; $('error').hidden = false; }
  finally { operationBusy = false; }
}
function point(prefix) {
  const lat = Number($(`${prefix}Lat`).value);
  const lng = Number($(`${prefix}Lng`).value);
  if (!$(`${prefix}Lat`).value || !$(`${prefix}Lng`).value || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw new Error(`Enter valid coordinates for ${prefix}.`);
  }
  return { lat, lng };
}
$('example').addEventListener('click', () => {
  const example = { startLat: 14.8433, startLng: 120.8107, pickupLat: 14.8470, pickupLng: 120.8180, dropoffLat: 14.8340, dropoffLng: 120.7920 };
  for (const [name, value] of Object.entries(example)) $(name).value = value;
});
$('routeForm').addEventListener('submit', event => {
  event.preventDefault();
  operation(async () => {
    const result = await api('route', { start: point('start'), pickup: point('pickup'), dropoff: point('dropoff') });
    console.log("Geoapify route result:", result);

    const newRoute = result.route;

    if (!newRoute?.toPickup || !newRoute?.toDropoff) {
      throw new Error(
        "Missing pickup or drop-off route. Check the console for details."
      );
    }

    route = newRoute;

    updateRouteSummary();
    paint();
  });
});
$('openDriver').addEventListener('click', () => operation(async () => {
  await api('browser/open', {});
}));
$('start').addEventListener('click', () => operation(async () => {
  await api('simulation/start', {
    bookingCode: $('bookingCode').value.trim(),
    minutes: Number($('minutes').value), speed: Number($('speed').value), fastSync: $('fastSync').checked,
  });
}));
$('pause').addEventListener('click', () => operation(async () => { await api('simulation/pause', {}); }));
$('resume').addEventListener('click', () => operation(async () => { await api('simulation/resume', {}); }));
$('stop').addEventListener('click', () => operation(async () => { await api('simulation/stop', {}); }));
function durationPreview() {
  const minutes = Number($('minutes').value), speed = Number($('speed').value);
  if (!(minutes > 0) || !(speed > 0)) return;
  const actualSeconds = minutes * 60 / speed;
  $('durationPreview').textContent = `A ${minutes}-minute trip plays in roughly ${actualSeconds.toFixed(0)} real seconds at ${speed}×. The simulator pauses at pickup.`;
}
$('minutes').addEventListener('input', durationPreview);
$('speed').addEventListener('change', durationPreview);
durationPreview();
function updateRouteSummary() {
  if (!route) return;
  const stat = leg => `${(leg.distanceMeters / 1000).toFixed(1)} km · ${Math.ceil(leg.estimatedSeconds / 60)} min estimated`;
  $('pickupStat').textContent = stat(route.toPickup);
  $('dropoffStat').textContent = stat(route.toDropoff);
}
function refreshLabels(state) {
  const phase = state.phase;
  const names = {
    idle: 'Ready for driver login', to_pickup: 'Driving to pickup', waiting_pickup: 'Arrived at pickup',
    paused: 'Simulation paused', to_dropoff: 'Delivering to drop-off', finished: 'Reached drop-off',
  };
  const help = {
    idle: 'Log in as driver in the separate browser, accept the booking, then click Start.',
    to_pickup: 'The driver is traveling toward pickup. Watch the customer map update after REST polling.',
    waiting_pickup: 'In GASFAR, click “I Have Arrived at Pickup”, then “Confirm Package Pickup”, and return here to continue.',
    paused: 'GPS is paused. Click Continue to resume.',
    to_dropoff: 'The parcel has been picked up; the driver is traveling toward the recipient.',
    finished: 'In GASFAR, click “I Have Arrived at Drop-off” and complete delivery with the recipient PIN.',
  };
  $('status').textContent = names[phase] || 'Ready';
  $('stageTitle').textContent = names[phase] || 'Calculate a route to begin';
  $('stageHelp').textContent = help[phase] || '';
  $('percent').textContent = `${state.progress || 0}%`;
  $('bar').style.width = `${state.progress || 0}%`;
  $('sent').textContent = state.sent || 0;
  $('apiResult').textContent = state.latestApiStatus || 'No GPS requests sent yet.';
  const p = state.current;
  $('gps').textContent = p ? `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}` : '—';
  $('start').disabled = !route || !state.browserOpen || !['idle', 'finished'].includes(phase);
  $('pause').disabled = !['to_pickup', 'to_dropoff'].includes(phase);
  $('resume').disabled = !['paused', 'waiting_pickup'].includes(phase);
  $('stop').disabled = phase === 'idle';
  $('calculate').disabled = !['idle', 'finished'].includes(phase);
  $('openDriver').disabled = !route;
  if (state.message && !['idle', 'finished'].includes(phase)) {
    $('error').textContent = state.message;
    $('error').hidden = false;
  }
}
async function refresh() {
  try {
    const state = await api('status');
    const coords = state.current;
    if (coords && (!currentGps || coords.lat !== currentGps.lat || coords.lng !== currentGps.lng)) {
      currentGps = coords;
      paint();
    }
    refreshLabels(state);
    if (state.phase !== previousPhase) {
      previousPhase = state.phase;
      if (state.phase === 'waiting_pickup') {
        $('status').style.background = '#fff0e2';
      } else {
        $('status').style.background = '#edf1f7';
      }
    }
  } catch (error) {
    $('status').textContent = 'Simulator server disconnected';
  }
}
function paint() {
  const canvas = $('map');
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  if (!route) {
    ctx.fillStyle = '#7c8ba2';
    ctx.textAlign = 'center';
    ctx.font = '18px system-ui';
    ctx.fillText('Your calculated road route appears here', w / 2, h / 2 - 4);
    ctx.font = '13px system-ui';
    ctx.fillText('Enter coordinates and click “Calculate road routes”', w / 2, h / 2 + 25);
    return;
  }
  const points = [...route.toPickup.coords, ...route.toDropoff.coords];
  const midLat = points.reduce((sum, point) => sum + point.lat, 0) / points.length;
  const xscale = Math.cos(midLat * Math.PI / 180);
  const xs = points.map(p => p.lng * xscale), ys = points.map(p => p.lat);
  const minX = xs.reduce((a,b) => Math.min(a,b), Infinity);
  const maxX = xs.reduce((a,b) => Math.max(a,b), -Infinity);
  const minY = ys.reduce((a,b) => Math.min(a,b), Infinity);
  const maxY = ys.reduce((a,b) => Math.max(a,b), -Infinity);
  const scale = Math.min((w - 120) / Math.max(.00001, maxX - minX), (h - 110) / Math.max(.00001, maxY - minY));
  const offsetX = (w - (maxX - minX) * scale) / 2;
  const offsetY = (h - (maxY - minY) * scale) / 2;
  const pixel = p => ({ x: (p.lng * xscale - minX) * scale + offsetX, y: h - ((p.lat - minY) * scale + offsetY) });
  function line(points, color, width) {
    ctx.beginPath();
    points.forEach((p, i) => { const c = pixel(p); i ? ctx.lineTo(c.x, c.y) : ctx.moveTo(c.x, c.y); });
    ctx.lineCap = 'round';ctx.lineJoin = 'round';ctx.strokeStyle = '#fff';ctx.lineWidth = width + 5;ctx.stroke();
    ctx.strokeStyle = color;ctx.lineWidth = width;ctx.stroke();
  }
  line(route.toDropoff.coords, '#14264c', 7);
  line(route.toPickup.coords, '#258bda', 8);
  function pin(point, color, text, right = false) {
    const p = pixel(point);
    ctx.fillStyle = '#fff';ctx.beginPath();ctx.arc(p.x,p.y,13,0,Math.PI*2);ctx.fill();
    ctx.fillStyle = color;ctx.beginPath();ctx.arc(p.x,p.y,9,0,Math.PI*2);ctx.fill();
    ctx.textAlign = right ? 'right' : 'left';ctx.font = 'bold 13px system-ui';ctx.fillStyle = '#253650';
    ctx.fillText(text,p.x + (right ? -18 : 18),p.y - 13);
  }
  pin(route.pickup,'#2188d1','Pickup');
  pin(route.dropoff,'#14264c','Drop-off',true);
  const d = pixel(currentGps || route.start);
  ctx.shadowColor='#f47b2066';ctx.shadowBlur=14;ctx.fillStyle='#f47b20';ctx.beginPath();ctx.arc(d.x,d.y,15,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke();
  ctx.fillStyle='#fff';ctx.font='bold 14px system-ui';ctx.textAlign='center';ctx.fillText('➤',d.x,d.y+5);
}
paint();
refresh();
setInterval(refresh, 1000);
