import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as K from './kernel.mjs';

test('generatePixelArt with valid frequencies and dimensions', async () => {
    const result = K.generatePixelArt([1000, 2000, 3000, 4000, 5000], 10, 5);
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.result.length, 5);
    assert.strictEqual(result.result[0].length, 10);
});

test('generatePixelArt with zero frequencies', async () => {
    const result = K.generatePixelArt([], 10, 5);
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.why, 'Frequencies must be a non-empty array');
});

test('generatePixelArt with zero width', async () => {
    const result = K.generatePixelArt([1000, 2000, 3000], 0, 5);
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.why, 'Width must be a positive number');
});

test('generatePixelArt with zero height', async () => {
    const result = K.generatePixelArt([1000, 2000, 3000], 10, 0);
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.why, 'Height must be a positive number');
});
