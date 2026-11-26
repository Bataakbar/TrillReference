import test from 'node:test';
import assert from 'node:assert/strict';
import {
  serializeOverlays,
  parseSerializedOverlays,
  formatCompactVolume,
} from './drawingStorage';

test('serializeOverlays keeps valid overlays and strips incomplete entries', () => {
  const result = serializeOverlays([
    {
      name: 'segment',
      points: [
        { timestamp: 1700000000000, value: 9100 },
        { timestamp: 1700086400000, value: 9450 },
      ],
    },
    {
      name: '',
      points: [{ timestamp: 1700000000000, value: 100 }],
    },
    {
      name: 'rectZone',
      points: [],
    },
  ]);

  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'segment');
  assert.equal(result[0].points.length, 2);
  assert.equal(result[0].points[1].value, 9450);
});

test('parseSerializedOverlays safely handles corrupt JSON and non-array inputs', () => {
  assert.deepEqual(parseSerializedOverlays(null), []);
  assert.deepEqual(parseSerializedOverlays('{invalid json'), []);
  assert.deepEqual(parseSerializedOverlays('{"name":"segment"}'), []);

  const validJson = JSON.stringify([
    { name: 'horizontalStraightLine', points: [{ timestamp: 1700000000000, value: 5800 }] },
  ]);
  const parsed = parseSerializedOverlays(validJson);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].name, 'horizontalStraightLine');
});

test('formatCompactVolume formats market volumes cleanly', () => {
  assert.equal(formatCompactVolume(0), '—');
  assert.equal(formatCompactVolume(850), '850');
  assert.equal(formatCompactVolume(42_500), '42.5K');
  assert.equal(formatCompactVolume(18_450_000), '18.45M');
  assert.equal(formatCompactVolume(2_340_000_000), '2.34B');
});

test('serializeOverlays preserves custom line color, thickness, and dash style', () => {
  const result = serializeOverlays([
    {
      name: 'segment',
      points: [
        { timestamp: 1700000000000, value: 9100 },
        { timestamp: 1700086400000, value: 9450 },
      ],
      styles: {
        line: {
          color: '#FACC15',
          size: 4,
          style: 'dashed',
          dashedValue: [6, 4],
        },
      },
    },
  ]);

  assert.equal(result.length, 1);
  assert.deepEqual(result[0].style, {
    color: '#FACC15',
    size: 4,
    lineStyle: 'dashed',
  });
});
