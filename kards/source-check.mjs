// source-check.mjs - the static rules every PixelWhisperer kernel keeps, for the tests to apply: integer arithmetic only,
// deterministic, browser-safe. Test-side only; no kernel imports it.

/** The source with comments and string contents blanked (regex literals and templates are left as code: the kernels use none
 *  that hold a quote), so only code is left to look at. */
export function bare(src) {
  const out = src.split('');
  let state = 'code';
  for (let i = 0; i < src.length; i++) {
    const c = src[i], d = src[i + 1];
    if (state === 'code') {
      if (c === '/' && d === '/') { out[i] = out[i + 1] = ' '; i++; state = 'line'; }
      else if (c === '/' && d === '*') { out[i] = out[i + 1] = ' '; i++; state = 'block'; }
      else if (c === "'" || c === '"') state = c;
    } else if (state === 'line') { if (c === '\n') state = 'code'; else out[i] = ' '; }
    else if (state === 'block') { if (c === '*' && d === '/') { out[i] = out[i + 1] = ' '; i++; state = 'code'; } else if (c !== '\n') out[i] = ' '; }
    else if (c === '\\') { out[i] = out[i + 1] = ' '; i++; }
    else if (c === state) state = 'code';
    else out[i] = ' ';
  }
  return out.join('');
}

const ALLOWED_MATH = ['floor', 'min', 'max', 'imul', 'abs'];
const BANNED_WORDS = ['Date', 'performance', 'crypto', 'random', 'parseFloat', 'toFixed', 'toPrecision', 'eval(', 'Function(', 'setTimeout', 'process', 'require', 'await', 'async', 'Intl', 'localeCompare', 'toLocale', 'Float32', 'Float64', 'globalThis', 'window', 'document', 'fetch'];
/** Every way the source breaks the rules, as plain sentences (empty when it keeps them all). */
export function violations(src, { imports = [] } = {}) {
  const code = bare(src), bad = [];
  if (/[^\x00-\x7f]/.test(src)) bad.push('the source is not pure ASCII');
  if (code.includes('`')) bad.push('a template literal');
  for (const m of code.matchAll(/Math\s*\.\s*(\w+)/g)) if (!ALLOWED_MATH.includes(m[1])) bad.push('Math.' + m[1]);
  if ((code.match(/Math/g) || []).length !== (code.match(/Math\s*\.\s*\w+/g) || []).length) bad.push('Math used other than by a direct call');
  for (const w of BANNED_WORDS) if (code.includes(w)) bad.push(w);
  if (code.includes('**')) bad.push('** (pow)');
  if (/\d\.\d|\.\d/.test(code.replace(/0x[0-9a-fA-F]+/g, ''))) bad.push('a float literal');
  if (/\d[eE][+-]?\d/.test(code.replace(/0x[0-9a-fA-F]+/g, ''))) bad.push('an exponent literal');
  for (const m of src.matchAll(/^import\s.*from\s+'([^']+)'/gm)) if (!imports.includes(m[1])) bad.push('imports ' + m[1]);
  if (/\bimport\s*\(/.test(code)) bad.push('a dynamic import');
  return bad;
}
