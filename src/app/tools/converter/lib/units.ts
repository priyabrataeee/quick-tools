export interface Unit {
  id: string;
  name: string;
  symbol: string;
  /** How many base units one of this unit is worth. */
  factor: number;
}

export interface UnitGroup {
  /** Name of the base unit, used in the explanatory footnote. */
  base: string;
  units: Unit[];
}

export const LENGTH: UnitGroup = {
  base: 'metre',
  units: [
    { id: 'nm', name: 'Nanometre', symbol: 'nm', factor: 1e-9 },
    { id: 'mm', name: 'Millimetre', symbol: 'mm', factor: 0.001 },
    { id: 'cm', name: 'Centimetre', symbol: 'cm', factor: 0.01 },
    { id: 'm', name: 'Metre', symbol: 'm', factor: 1 },
    { id: 'km', name: 'Kilometre', symbol: 'km', factor: 1000 },
    { id: 'in', name: 'Inch', symbol: 'in', factor: 0.0254 },
    { id: 'ft', name: 'Foot', symbol: 'ft', factor: 0.3048 },
    { id: 'yd', name: 'Yard', symbol: 'yd', factor: 0.9144 },
    { id: 'mi', name: 'Mile', symbol: 'mi', factor: 1609.344 },
    { id: 'nmi', name: 'Nautical mile', symbol: 'nmi', factor: 1852 },
    { id: 'ly', name: 'Light year', symbol: 'ly', factor: 9.4607304725808e15 },
  ],
};

export const WEIGHT: UnitGroup = {
  base: 'kilogram',
  units: [
    { id: 'mg', name: 'Milligram', symbol: 'mg', factor: 1e-6 },
    { id: 'g', name: 'Gram', symbol: 'g', factor: 0.001 },
    { id: 'kg', name: 'Kilogram', symbol: 'kg', factor: 1 },
    { id: 't', name: 'Tonne (metric)', symbol: 't', factor: 1000 },
    { id: 'oz', name: 'Ounce', symbol: 'oz', factor: 0.028349523125 },
    { id: 'lb', name: 'Pound', symbol: 'lb', factor: 0.45359237 },
    { id: 'st', name: 'Stone', symbol: 'st', factor: 6.35029318 },
    { id: 'ton_us', name: 'Short ton (US)', symbol: 'ton', factor: 907.18474 },
    { id: 'ton_uk', name: 'Long ton (UK)', symbol: 'long ton', factor: 1016.0469088 },
  ],
};

export const AREA: UnitGroup = {
  base: 'square metre',
  units: [
    { id: 'mm2', name: 'Square millimetre', symbol: 'mm²', factor: 1e-6 },
    { id: 'cm2', name: 'Square centimetre', symbol: 'cm²', factor: 1e-4 },
    { id: 'm2', name: 'Square metre', symbol: 'm²', factor: 1 },
    { id: 'ha', name: 'Hectare', symbol: 'ha', factor: 10000 },
    { id: 'km2', name: 'Square kilometre', symbol: 'km²', factor: 1e6 },
    { id: 'in2', name: 'Square inch', symbol: 'in²', factor: 0.00064516 },
    { id: 'ft2', name: 'Square foot', symbol: 'ft²', factor: 0.09290304 },
    { id: 'yd2', name: 'Square yard', symbol: 'yd²', factor: 0.83612736 },
    { id: 'ac', name: 'Acre', symbol: 'ac', factor: 4046.8564224 },
    { id: 'mi2', name: 'Square mile', symbol: 'mi²', factor: 2589988.110336 },
  ],
};

export const SPEED: UnitGroup = {
  base: 'metre per second',
  units: [
    { id: 'mps', name: 'Metres per second', symbol: 'm/s', factor: 1 },
    { id: 'kph', name: 'Kilometres per hour', symbol: 'km/h', factor: 1 / 3.6 },
    { id: 'mph', name: 'Miles per hour', symbol: 'mph', factor: 0.44704 },
    { id: 'fps', name: 'Feet per second', symbol: 'ft/s', factor: 0.3048 },
    { id: 'kn', name: 'Knot', symbol: 'kn', factor: 0.514444444 },
    { id: 'mach', name: 'Mach (sea level)', symbol: 'M', factor: 340.29 },
  ],
};

export const VOLUME: UnitGroup = {
  base: 'litre',
  units: [
    { id: 'ml', name: 'Millilitre', symbol: 'ml', factor: 0.001 },
    { id: 'l', name: 'Litre', symbol: 'l', factor: 1 },
    { id: 'm3', name: 'Cubic metre', symbol: 'm³', factor: 1000 },
    { id: 'tsp_us', name: 'Teaspoon (US)', symbol: 'tsp', factor: 0.00492892159375 },
    { id: 'tbsp_us', name: 'Tablespoon (US)', symbol: 'tbsp', factor: 0.01478676478125 },
    { id: 'floz_us', name: 'Fluid ounce (US)', symbol: 'fl oz', factor: 0.0295735295625 },
    { id: 'cup_us', name: 'Cup (US legal)', symbol: 'cup', factor: 0.24 },
    { id: 'cup_metric', name: 'Cup (metric)', symbol: 'cup', factor: 0.25 },
    { id: 'pt_us', name: 'Pint (US)', symbol: 'pt', factor: 0.473176473 },
    { id: 'pt_uk', name: 'Pint (imperial)', symbol: 'pt', factor: 0.56826125 },
    { id: 'gal_us', name: 'Gallon (US)', symbol: 'gal', factor: 3.785411784 },
    { id: 'gal_uk', name: 'Gallon (imperial)', symbol: 'gal', factor: 4.54609 },
    { id: 'in3', name: 'Cubic inch', symbol: 'in³', factor: 0.016387064 },
    { id: 'ft3', name: 'Cubic foot', symbol: 'ft³', factor: 28.316846592 },
  ],
};

/**
 * Temperature needs an offset as well as a scale factor, so it is handled
 * separately from the multiplicative unit groups above.
 */
export const TEMPERATURE_UNITS = [
  { id: 'c', name: 'Celsius', symbol: '°C' },
  { id: 'f', name: 'Fahrenheit', symbol: '°F' },
  { id: 'k', name: 'Kelvin', symbol: 'K' },
  { id: 'r', name: 'Rankine', symbol: '°R' },
] as const;

export type TemperatureUnit = (typeof TEMPERATURE_UNITS)[number]['id'];

/** Converts any supported temperature scale to Kelvin. */
export function toKelvin(value: number, unit: TemperatureUnit): number {
  switch (unit) {
    case 'c':
      return value + 273.15;
    case 'f':
      return (value - 32) * (5 / 9) + 273.15;
    case 'r':
      return value * (5 / 9);
    default:
      return value;
  }
}

export function fromKelvin(kelvin: number, unit: TemperatureUnit): number {
  switch (unit) {
    case 'c':
      return kelvin - 273.15;
    case 'f':
      return (kelvin - 273.15) * (9 / 5) + 32;
    case 'r':
      return kelvin * (9 / 5);
    default:
      return kelvin;
  }
}

/**
 * Formats a converted value readably: very large and very small magnitudes get
 * exponential notation, everything else gets grouped decimals.
 */
export function formatUnitValue(value: number, precision: number): string {
  if (!Number.isFinite(value)) return '—';
  if (value !== 0 && (Math.abs(value) >= 1e12 || Math.abs(value) < 1e-6)) {
    return value.toExponential(Math.min(precision, 10));
  }
  return value.toLocaleString(undefined, {
    maximumFractionDigits: precision,
    minimumFractionDigits: 0,
  });
}
