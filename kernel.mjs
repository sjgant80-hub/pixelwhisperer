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
