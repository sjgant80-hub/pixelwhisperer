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

// --- wordFrequencyHistogram -------------------------------------------------

test('wordFrequencyHistogram counts and normalizes to the 0-1000 scale', async () => {
    const result = K.wordFrequencyHistogram('cat cat cat dog dog bird');
    assert.strictEqual(result.ok, true);
    assert.deepStrictEqual(result.result, [1000, 667, 333]);
});

test('wordFrequencyHistogram is case-insensitive', async () => {
    const result = K.wordFrequencyHistogram('Cat CAT cat');
    assert.strictEqual(result.ok, true);
    assert.deepStrictEqual(result.result, [1000]);
});

test('wordFrequencyHistogram rejects non-string input', async () => {
    const result = K.wordFrequencyHistogram(12345);
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.why, 'Text must be a string');
});

test('wordFrequencyHistogram rejects an empty string', async () => {
    const result = K.wordFrequencyHistogram('');
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.why, 'Text must be a non-empty string');
});

test('wordFrequencyHistogram rejects a whitespace-only string', async () => {
    const result = K.wordFrequencyHistogram('   \n\t  ');
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.why, 'Text must be a non-empty string');
});

test('wordFrequencyHistogram rejects text with no word characters', async () => {
    const result = K.wordFrequencyHistogram('!!! --- ... ???');
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.why, 'Text must contain at least one word');
});

test('wordFrequencyHistogram caps at the top 64 distinct words, tie order = first-seen', async () => {
    const words = Array.from({ length: 70 }, (_, i) => 'w' + i);
    const result = K.wordFrequencyHistogram(words.join(' '));
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.result.length, 64);
    // every word appears exactly once, so every kept word normalizes to the max: 1000
    assert.ok(result.result.every((f) => f === 1000));
});

// --- textToVisualSummary ----------------------------------------------------

test('textToVisualSummary renders a word-frequency histogram through generatePixelArt', async () => {
    const result = K.textToVisualSummary('cat cat cat dog dog bird', 3, 1);
    assert.strictEqual(result.ok, true);
    const row = result.result[0];
    assert.strictEqual(row.length, 3);
    assert.strictEqual(row[0].brightness, 10); // freq 1000 -> floor(10) % 11 = 10
    assert.strictEqual(row[1].brightness, 6);  // freq  667 -> floor(6.67) = 6
    assert.strictEqual(row[2].brightness, 3);  // freq  333 -> floor(3.33) = 3
});

test('textToVisualSummary rejects non-string text before touching dimensions', async () => {
    const result = K.textToVisualSummary(null, 10, 10);
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.why, 'Text must be a string');
});

test('textToVisualSummary rejects empty text', async () => {
    const result = K.textToVisualSummary('', 10, 10);
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.why, 'Text must be a non-empty string');
});

test('textToVisualSummary delegates dimension validation to generatePixelArt', async () => {
    const badWidth = K.textToVisualSummary('hello world', 0, 5);
    assert.strictEqual(badWidth.ok, false);
    assert.strictEqual(badWidth.why, 'Width must be a positive number');

    const badHeight = K.textToVisualSummary('hello world', 5, -1);
    assert.strictEqual(badHeight.ok, false);
    assert.strictEqual(badHeight.why, 'Height must be a positive number');
});
