import test from 'node:test';
import assert from 'node:assert/strict';
import { validPoint, geoapifyUrl, decodeRoute, interpolateRoute, requestRoute } from '../route.js';

test('uses the same Geoapify drive waypoints as GASFAR', () => {
  const url = geoapifyUrl({lat:14.84,lng:120.81}, {lat:14.83,lng:120.79}, 'test-key');
  assert.equal(url.searchParams.get('waypoints'), '14.84,120.81|14.83,120.79');
  assert.equal(url.searchParams.get('mode'), 'drive');
  assert.equal(url.searchParams.get('apiKey'), 'test-key');
});
test('parses Geoapify MultiLineString coordinates into lat/lng', () => {
  const result = decodeRoute({ features: [{
    geometry: { type:'MultiLineString', coordinates:[[[120.8,14.8],[120.9,14.9]]] },
    properties: {distance:1200, time:120},
  }] });
  assert.deepEqual(result.coords, [{lat:14.8,lng:120.8},{lat:14.9,lng:120.9}]);
  assert.equal(result.distanceMeters, 1200);
});
test('handles ordinary LineString route geometry', () => {
  const result = decodeRoute({features:[{
    geometry:{type:'LineString',coordinates:[[120.8,14.8],[120.9,14.9]]},
    properties:{distance:1400,time:200},
  }]});
  assert.equal(result.coords.length,2);
});
test('interpolates by distance along road geometry instead of by index', () => {
  const points = [{lat:0,lng:0},{lat:0,lng:.001},{lat:0,lng:.011}];
  const middle = interpolateRoute(points,.5);
  assert.ok(Math.abs(middle.lng - .0055) < .00001);
  assert.deepEqual(interpolateRoute(points,0),points[0]);
  assert.deepEqual(interpolateRoute(points,1),points[2]);
});
test('coordinates are validated before using the route service', () => {
  assert.equal(validPoint({lat:14.8,lng:120.8}),true);
  assert.equal(validPoint({lat:999,lng:120.8}),false);
  assert.equal(validPoint({lat:NaN,lng:120.8}),false);
});
test('fetch function receives Geoapify URL and returns route', async () => {
  const fakeFetch = async (url) => {
    assert.equal(url.searchParams.get('mode'),'drive');
    return {ok:true,json:async()=>({features:[{
      geometry:{type:'LineString',coordinates:[[120.8,14.8],[120.9,14.9]]},
      properties:{distance:2500,time:1200},
    }]})};
  };
  const route = await requestRoute({lat:14.8,lng:120.8},{lat:14.9,lng:120.9},'test-key',fakeFetch);
  assert.equal(route.estimatedSeconds,1200);
});
