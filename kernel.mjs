export function generatePixelArt(frequencies, width, height) {
    if (!Array.isArray(frequencies) || frequencies.length === 0) {
        return { ok: false, why: 'Frequencies must be a non-empty array' };
    }
    if (typeof width !== 'number' || width <= 0) {
        return { ok: false, why: 'Width must be a positive number' };
    }
    if (typeof height !== 'number' || height <= 0) {
        return { ok: false, why: 'Height must be a positive number' };
    }
    const pixelArt = [];
    for (let y = 0; y < height; y++) {
        const row = [];
        for (let x = 0; x < width; x++) {
            const index = (y * width + x) % frequencies.length;
            const frequency = frequencies[index];
            const brightness = Math.floor((frequency / 1000) * 10) % 11;
            const color = `rgb(${brightness * 25}, ${brightness * 25}, ${brightness * 25})`;
            row.push({ x, y, color, brightness });
        }
        pixelArt.push(row);
    }
    return { ok: true, result: pixelArt };
}

// The most distinct words counted before the tail is dropped. A fixed, honest cap —
// not a claim that word #65 doesn't matter, just that the grid has to stop somewhere.
const MAX_DISTINCT_WORDS = 64;

export function wordFrequencyHistogram(text) {
    if (typeof text !== 'string') {
        return { ok: false, why: 'Text must be a string' };
    }
    if (text.trim().length === 0) {
        return { ok: false, why: 'Text must be a non-empty string' };
    }
    const words = text.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 0);
    if (words.length === 0) {
        return { ok: false, why: 'Text must contain at least one word' };
    }
    const counts = new Map();
    for (const w of words) {
        counts.set(w, (counts.get(w) || 0) + 1);
    }
    // Array.prototype.sort is stable (guaranteed since ES2019), so words tied on count
    // keep their first-appearance order — deterministic from the text alone, no hidden tiebreak.
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, MAX_DISTINCT_WORDS);
    const maxCount = ranked[0][1];
    const frequencies = ranked.map(([, count]) => Math.round((count / maxCount) * 1000));
    return { ok: true, result: frequencies };
}

// textToVisualSummary: NOT semantic summarization, NOT AI. It is a word-frequency
// histogram — count how often each distinct word appears, normalize the top words'
// counts to the 0-1000 scale generatePixelArt already expects, and render that
// histogram with the same kernel used for raw frequencies. The picture shows which
// words repeat most in the text; it does not show what the text means.
export function textToVisualSummary(text, width, height) {
    const histogram = wordFrequencyHistogram(text);
    if (!histogram.ok) {
        return histogram;
    }
    return generatePixelArt(histogram.result, width, height);
}
