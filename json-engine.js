(function initJsonEngine(global) {
  function getErrorLocation(rawInput, error) {
    const match = /position\s(\d+)/i.exec(error.message || '');
    const position = match ? Number(match[1]) : -1;

    if (position < 0) return { line: '?', column: '?' };

    const before = rawInput.slice(0, position);
    const line = before.split('\n').length;
    const lineStart = before.lastIndexOf('\n') + 1;
    const column = position - lineStart + 1;
    return { line, column };
  }

  function parse(input) {
    try {
      return { ok: true, value: JSON.parse(input), error: null };
    } catch (error) {
      const loc = getErrorLocation(input, error);
      return {
        ok: false,
        value: null,
        error: `Invalid JSON at line ${loc.line}, column ${loc.column}: ${error.message}`,
      };
    }
  }

  function format(input, indent = 2) {
    const result = parse(input);
    if (!result.ok) return result;
    return { ok: true, value: JSON.stringify(result.value, null, indent), error: null };
  }

  function minify(input) {
    const result = parse(input);
    if (!result.ok) return result;
    return { ok: true, value: JSON.stringify(result.value), error: null };
  }

  function toOneLine(input) {
    return minify(input);
  }

  function validate(input) {
    const result = parse(input);
    if (!result.ok) return { ok: false, value: 'Invalid JSON ❌', error: result.error };
    return { ok: true, value: 'Valid JSON ✅', error: null };
  }

  function stringify(text) {
    return { ok: true, value: JSON.stringify(String(text)), error: null };
  }

  global.JsonEngine = {
    parse,
    format,
    minify,
    toOneLine,
    validate,
    stringify,
  };
})(window);
