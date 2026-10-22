// Geoapify route utilities. Used by the simulator and its small test suite.
export function validPoint(point) {
  return point && Number.isFinite(point.lat) && point.lat >= -90 && point.lat <= 90 &&
    Number.isFinite(point.lng) && point.lng >= -180 && point.lng <= 180;
}

// Exactly the same Geoapify parameters as GASFAR MapComponents.jsx:
// routing?waypoints=LAT,LNG|LAT,LNG&mode=drive
export function geoapifyUrl(from, to, apiKey) {
  const url = new URL('https://api.geoapify.com/v1/routing');
  url.searchParams.set('waypoints', `${from.lat},${from.lng}|${to.lat},${to.lng}`);
  url.searchParams.set('mode', 'drive');
  url.searchParams.set('apiKey', apiKey);
  return url;
}

export function decodeRoute(geojson) {
  const feature = geojson.features?.[0];
  if (!feature) throw new Error('Geoapify returned no driving route for these coordinates.');
  const shape = feature.geometry;
  const segments = shape?.type === 'MultiLineString' ? shape.coordinates :
    shape?.type === 'LineString' ? [shape.coordinates] : [];
  const coords = segments.flatMap(segment => segment.map(([lng, lat]) => ({ lat, lng })));
  if (coords.length < 2 || coords.some(point => !validPoint(point))) {
    throw new Error('Geoapify returned an invalid route geometry.');
  }
  return {
    coords,
    distanceMeters: feature.properties.distance,
    estimatedSeconds: feature.properties.time,
  };
}

export async function requestRoute(from, to, apiKey, fetchFn = fetch) {
  const response = await fetchFn(
    geoapifyUrl(from, to, apiKey),
    {
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Geoapify routing failed (HTTP ${response.status}).`
    );
  }

  // Get Geoapify's response
  const data = await response.json();

  // Convert the response into coordinates, distance, and time
  const route = decodeRoute(data);

  // IMPORTANT: Return the calculated route!
  return route;
}

// Find a position by *road distance*, not by the route point index. This
// prevents speeding up on straight sections and slowing down around corners.
export function interpolateRoute(coords, fraction) {
  const clamped = Math.min(1, Math.max(0, fraction));
  if (clamped === 0) return coords[0];
  if (clamped === 1) return coords.at(-1);
  const distances = [];
  let total = 0;
  for (let i = 1; i < coords.length; i += 1) {
    const a = coords[i - 1], b = coords[i];
    const latAvg = (a.lat + b.lat) * Math.PI / 360;
    const north = (b.lat - a.lat) * 111320;
    const east = (b.lng - a.lng) * 111320 * Math.cos(latAvg);
    const distance = Math.hypot(north, east);
    distances.push(distance);
    total += distance;
  }
  if (!total) return coords[0];
  const target = total * clamped;
  let traveled = 0;
  for (let i = 0; i < distances.length; i += 1) {
    if (traveled + distances[i] >= target) {
      const t = distances[i] ? (target - traveled) / distances[i] : 0;
      return {
        lat: coords[i].lat + (coords[i + 1].lat - coords[i].lat) * t,
        lng: coords[i].lng + (coords[i + 1].lng - coords[i].lng) * t,
      };
    }
    traveled += distances[i];
  }
  return coords.at(-1);
}
