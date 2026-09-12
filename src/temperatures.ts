/** Celsius is canonical. Temperatures never pass through ingredient rounding/scaling. */
export const temperatureSources = {
  fahrenheit: 'https://www.nist.gov/pml/owm/si-units-temperature',
  gas: 'https://www.deliaonline.com/information-centre/oven-temperatures-and-conversions',
  lowGas:
    'https://support.aeg.co.uk/support-articles/article/what-do-the-gas-mark-numbers-mean-relate-to-temperatures',
};

// Practical conventional-oven settings, not an exact temperature scale.
// Marks 1–9 follow Delia; the low settings round AEG's 107°C and 121°C values.
export const gasMarks = [
  { mark: '1/4', celsius: 110 },
  { mark: '1/2', celsius: 120 },
  { mark: '1', celsius: 140 },
  { mark: '2', celsius: 150 },
  { mark: '3', celsius: 170 },
  { mark: '4', celsius: 180 },
  { mark: '5', celsius: 190 },
  { mark: '6', celsius: 200 },
  { mark: '7', celsius: 220 },
  { mark: '8', celsius: 230 },
  { mark: '9', celsius: 240 },
] as const;

export const fahrenheitToCelsius = (value: number) => (value - 32) / 1.8;
export const celsiusToFahrenheit = (value: number) => value * 1.8 + 32;
const readable = (value: number) => Number(value.toFixed(1)).toString();
export function nearestGasMark(celsius: number): string | undefined {
  // Do not extrapolate beyond supported conventional oven settings.
  if (celsius < 105 || celsius > 250) return undefined;
  return gasMarks.reduce((best, entry) =>
    Math.abs(entry.celsius - celsius) < Math.abs(best.celsius - celsius) ? entry : best,
  ).mark;
}

interface TemperatureToken {
  start: number;
  end: number;
  source: string;
  scale: 'C' | 'F' | 'gas';
  value: number;
  fan: boolean;
}
export interface TemperatureGroup {
  start: number;
  end: number;
  source: string;
  values: { celsius: number; fan: boolean }[];
  oven: boolean;
}

function isOvenContext(text: string, start: number, end: number): boolean {
  const before =
    text
      .slice(0, start)
      .split(/[.!?\n]/)
      .at(-1) || '';
  const near = before.slice(-180) + text.slice(end, end + 30);
  // A thermometer reading for oil, sauce, or the centre of food isn't an oven dial.
  if (
    /\binternal\b|\bcore\b|\bdeep[- ](?:fat|fry)|\b(?:heat|fry|heated|frying)\b[^.!?]*\boil\b/i.test(
      before,
    )
  )
    return false;
  return /\boven\b(?!-proof)|\bbak(?:e|ing)\b|\broast(?:ing)?\b/i.test(near);
}

export function temperatureGroups(text: string): TemperatureGroup[] {
  const tokenPattern =
    /(?<![\w.])(?:(-?\d+(?:\.\d+)?)\s*([°º˚०\u030a]\s*|degrees?\s*)?(Celsius|Fahrenheit|[CF])\b|gas\s*(?:mark\s*)?(1\s*[/⁄]\s*[24]|[¼½]|\d+(?:\.\d+)?))(\s+(?:fan(?:[- ]assisted)?|convection))?/gi;
  const tokens: TemperatureToken[] = [];
  for (const match of text.matchAll(tokenPattern)) {
    const scale = match[4] ? 'gas' : match[3].toUpperCase().startsWith('C') ? 'C' : 'F';
    const rawGas = match[4]
      ?.replace(/\s/g, '')
      .replace('⁄', '/')
      .replace('¼', '1/4')
      .replace('½', '1/2');
    const value = rawGas
      ? rawGas.includes('/')
        ? Number(rawGas.split('/')[0]) / Number(rawGas.split('/')[1])
        : Number(rawGas)
      : Number(match[1]);
    // Bare c/C at ingredient-sized values denotes cups, not a temperature.
    if (scale === 'C' && match[3].length === 1 && !match[2] && value >= 0 && value < 40) continue;
    if (
      scale === 'gas' &&
      !gasMarks.some(
        (entry) =>
          Number(
            entry.mark.includes('/')
              ? Number(entry.mark.split('/')[0]) / Number(entry.mark.split('/')[1])
              : entry.mark,
          ) === value,
      )
    )
      throw new Error(`Unsupported Gas Mark: ${match[0]}`);
    tokens.push({
      start: match.index,
      end: match.index + match[0].length,
      source: match[0],
      scale,
      value,
      fan: Boolean(match[5]),
    });
  }
  const grouped: TemperatureToken[][] = [];
  for (const token of tokens) {
    const previous = grouped.at(-1)?.at(-1);
    const gap = previous ? text.slice(previous.end, token.start) : '';
    if (previous && /^(?:[\s/,()]*|\s+or\s+)$/.test(gap)) grouped.at(-1)!.push(token);
    else grouped.push([token]);
  }
  return grouped.map((group) => {
    let end = group.at(-1)!.end;
    const start = group[0].start;
    // Consume a closing parenthesis only if it was opened inside this group.
    const inside = text.slice(start, end);
    if ((inside.match(/\(/g)?.length || 0) > (inside.match(/\)/g)?.length || 0)) {
      const close = text.slice(end).match(/^\s*\)/);
      if (close) end += close[0].length;
    }
    const values: TemperatureGroup['values'] = [];
    for (const fan of [false, true]) {
      const celsius = group.filter((token) => token.scale === 'C' && token.fan === fan);
      const fahrenheit = group.filter((token) => token.scale === 'F' && token.fan === fan);
      const chosen = celsius.length
        ? celsius.map((token) => token.value)
        : fahrenheit.map((token) => Number(fahrenheitToCelsius(token.value).toFixed(1)));
      for (const value of [...new Set(chosen)]) values.push({ celsius: value, fan });
    }
    if (!values.length) {
      for (const token of group) {
        const row = gasMarks.find(
          (entry) =>
            (entry.mark === '1/4' ? 0.25 : entry.mark === '1/2' ? 0.5 : Number(entry.mark)) ===
            token.value,
        )!;
        values.push({ celsius: row.celsius, fan: false });
      }
    }
    return {
      start,
      end,
      source: text.slice(start, end),
      values,
      oven: group.some((token) => token.scale === 'gas') || isOvenContext(text, start, end),
    };
  });
}

export function normalizeTemperatureText(text: string): string {
  let result = text;
  for (const group of temperatureGroups(text).reverse()) {
    let replacement = group.values
      .map((value) => `${readable(value.celsius)}°C${value.fan ? ' fan' : ''}`)
      .join(' / ');
    // Retain the meaning of standalone Gas Marks when the sentence doesn't say oven.
    if (group.oven && !isOvenContext(text, group.start, group.end)) replacement += ' (oven)';
    result = result.slice(0, group.start) + replacement + result.slice(group.end);
  }
  return result;
}

export interface TemperaturePart {
  text: string;
  equivalents?: string;
}
export function temperatureParts(text: string, allowGas = true): TemperaturePart[] {
  const parts: TemperaturePart[] = [];
  let cursor = 0;
  for (const group of temperatureGroups(text)) {
    parts.push({ text: text.slice(cursor, group.start) });
    group.values.forEach((value, index) => {
      if (index) parts.push({ text: ' / ' });
      const fahrenheit = Math.round(celsiusToFahrenheit(value.celsius));
      let equivalents = `${fahrenheit}°F${value.fan ? ' fan' : ''}`;
      if (allowGas && group.oven && !value.fan) {
        const gas = nearestGasMark(value.celsius);
        equivalents += gas ? `; approx. Gas Mark ${gas}` : '; outside the supported Gas Mark range';
      }
      parts.push({ text: `${readable(value.celsius)}°C${value.fan ? ' fan' : ''}`, equivalents });
    });
    cursor = group.end;
  }
  parts.push({ text: text.slice(cursor) });
  return parts;
}
