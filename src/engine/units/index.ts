// Base units and types
export const BASE_DIMENSIONS = ['L', 'V', 'T', 'Temp'] as const;

export type BaseDimension = (typeof BASE_DIMENSIONS)[number];

export type DimensionVector = Readonly<Partial<Record<BaseDimension, number>>>;

/*
Function to handle infinite and -0 values
*/
const normalizeDimensionEntry = (value:number): number => {
    if (!Number.isFinite(value)) {
        throw new Error('Dimension exponents must be finite numbers.');

    }
    return Object.is(value,-0) ? 0 : value;
};

/*
Function to further clean units, ie remove any 0 and put everything into a 
dimension vector
*/
export const createDimensionVector = (
    entries: Partial<Record<BaseDimension, number>> = {},
): DimensionVector => {
    const vector: Partial<Record<BaseDimension, number>> = {};

    for (const baseDimension of BASE_DIMENSIONS) {
        const exponent = entries[baseDimension];

        //make sure that input is a number
        if (typeof exponent !== 'number') {
            continue;
        }

        const normalizedExponent = normalizeDimensionEntry(exponent);

        // if the numer is not 0
        if (normalizedExponent !== 0) {
            vector[baseDimension] = normalizedExponent;
        }
    }
    return vector;
};

// variable for no unit numbers like 2
export const DIMENSIONLESS: DimensionVector = createDimensionVector();

/*
safe getter function for the power of a unit
prevents: undefined and non number
*/
const getExponent = (vector: DimensionVector, baseDimension: BaseDimension): number =>
    typeof vector[baseDimension] === 'number' ? vector[baseDimension] :0;

/*
operation when we multiply two units. Ie if we have mm * mm then we add the powers to become
mm^2. iterates through every unit of dimension vector and adds them
*/
export const multiplyDimensions = (
    left: DimensionVector,
    right: DimensionVector,
): DimensionVector => {
    const result: Partial<Record<BaseDimension, number>> = {};

    for (const baseDimension of BASE_DIMENSIONS) {
        const exponent = getExponent(left, baseDimension) + getExponent(right, baseDimension);
        if (exponent !== 0) {
            result[baseDimension] = exponent;
        }
    }
    return createDimensionVector(result);
};

/*
operation on units when we divide two numbers. Same process as multiplication
except we subtract instead of adding the exponents
*/
export const divideDimensions = (
    left: DimensionVector,
    right: DimensionVector,
): DimensionVector => {
    const result: Partial<Record<BaseDimension, number>> = {};

    for (const baseDimension of BASE_DIMENSIONS) {
        const exponent = getExponent(left, baseDimension) - getExponent(right, baseDimension);
        if (exponent !== 0) {
            result[baseDimension] = exponent;
        }
    }
    return createDimensionVector(result);
};

/*
deals with when we have a power to a power like (2^a)^b then it is equal to 2^(a*b)
*/
export const powDimensions = (vector: DimensionVector, exponent: number): DimensionVector => {
    const normalizedExponent = normalizeDimensionEntry(exponent);

    //if the exponent is 0, it is dimensionless
    if (normalizedExponent === 0){
        return DIMENSIONLESS;
    }

    const result: Partial<Record<BaseDimension, number>> = {};

    // loop through each unit
    for (const baseDimension of BASE_DIMENSIONS) {
        const poweredExponent = getExponent(vector, baseDimension) * normalizedExponent;
        if (poweredExponent !== 0) {
            result[baseDimension] = poweredExponent;
        }        
    }

    return createDimensionVector(result);
};

/*
helper function to compare if dimensions are equal.
Aka they have the same dimension vectors
*/
export const areDimensionsEqual = (
    left: DimensionVector,
    right: DimensionVector,
): boolean => {
    for (const baseDimension of BASE_DIMENSIONS) {
        if (getExponent(left, baseDimension) !== getExponent(right, baseDimension)) {
            return false;
        }
    }
    return true;
};

/*
put all the useful functions into one api for cleaner organization and use
*/

export const dimensionAlgebra = {
    multiply(left: DimensionVector, right: DimensionVector): DimensionVector {
        return multiplyDimensions(left, right);
    },

    divide(left: DimensionVector, right: DimensionVector): DimensionVector {
        return divideDimensions(left, right);
    },

    pow(vector: DimensionVector, exponent: number): DimensionVector {
        return powDimensions(vector, exponent);
    },

    equals(left: DimensionVector, right: DimensionVector): boolean {
        return areDimensionsEqual(left, right);
    },
} as const;

// type safe object of dimesnion ALgebra
export type UnitAlgebra = typeof dimensionAlgebra;

/*
define interface for two kinds of conversions:
Linear: length, mass etc where it is a*b
affine: temp where it is o +a*b
*/
export interface LinearUnitConversion {
    readonly kind: 'linear';
    readonly toBaseFactor: number;
}

export interface AffineUnitConversion {
    readonly kind: 'affine';
    readonly toBaseFactor: number;
    readonly toBaseOffset: number;
}

export type UnitConversion = LinearUnitConversion | AffineUnitConversion;

/*
defines what an unit should look like
*/
export interface UnitDefinition {
    readonly id: string;
    readonly label: string;
    readonly symbol: string;
    readonly category: string;
    readonly dimension: DimensionVector;
    readonly conversion: UnitConversion;
}

export type Unit = UnitDefinition;

export type UnitRegistry = ReadonlyArray<UnitDefinition>;

export interface Quantity {
    readonly valueInBaseUnits: number;
    readonly dimension: DimensionVector;
}
/*
takes inputs and creates a unitDefinition for a signgle unit
*/
const createLinearUnit = (
    id: string,
    label: string,
    symbol: string,
    category: string,
    dimension: DimensionVector,
    toBaseFactor: number,
): UnitDefinition => ({
    id, label, symbol, category, dimension, conversion:{
        kind: 'linear',
        toBaseFactor,
    },
});

const createAffineUnit = (
    id: string,
    label: string,
    symbol: string,
    category: string,
    dimension: DimensionVector,
    toBaseFactor: number,
    toBaseOffset: number,
): UnitDefinition => ({
    id,
    label,
    symbol,
    category,
    dimension,
    conversion: {
        kind: 'affine',
        toBaseFactor,
        toBaseOffset,
    },
});

/*
create the units that will be used in the unit calculator
 */
export const UNIT_DEFINITIONS = {
  // Length (base: meter)
  meter: createLinearUnit('meter', 'Meter', 'm', 'length', createDimensionVector({ L: 1 }), 1),
  millimeter: createLinearUnit(
    'millimeter',
    'Millimeter',
    'mm',
    'length',
    createDimensionVector({ L: 1 }),
    0.001,
  ),
  centimeter: createLinearUnit(
    'centimeter',
    'Centimeter',
    'cm',
    'length',
    createDimensionVector({ L: 1 }),
    0.01,
  ),
  kilometer: createLinearUnit(
    'kilometer',
    'Kilometer',
    'km',
    'length',
    createDimensionVector({ L: 1 }),
    1000,
  ),
  inch: createLinearUnit('inch', 'Inch', 'in', 'length', createDimensionVector({ L: 1 }), 0.0254),
  foot: createLinearUnit('foot', 'Foot', 'ft', 'length', createDimensionVector({ L: 1 }), 0.3048),
  yard: createLinearUnit('yard', 'Yard', 'yd', 'length', createDimensionVector({ L: 1 }), 0.9144),
  mile: createLinearUnit('mile', 'Mile', 'mi', 'length', createDimensionVector({ L: 1 }), 1609.344),

  // Volume (base: liter)
  liter: createLinearUnit('liter', 'Liter', 'L', 'volume', createDimensionVector({ V: 1 }), 1),
  milliliter: createLinearUnit(
    'milliliter',
    'Milliliter',
    'mL',
    'volume',
    createDimensionVector({ V: 1 }),
    0.001,
  ),

  // Time (base: second)
  second: createLinearUnit('second', 'Second', 's', 'time', createDimensionVector({ T: 1 }), 1),
  millisecond: createLinearUnit(
    'millisecond',
    'Millisecond',
    'ms',
    'time',
    createDimensionVector({ T: 1 }),
    0.001,
  ),
  minute: createLinearUnit('minute', 'Minute', 'min', 'time', createDimensionVector({ T: 1 }), 60),
  hour: createLinearUnit('hour', 'Hour', 'hr', 'time', createDimensionVector({ T: 1 }), 3600),
  hourShort: createLinearUnit('hour-short', 'Hour', 'h', 'time', createDimensionVector({ T: 1 }), 3600),
  day: createLinearUnit('day', 'Day', 'day', 'time', createDimensionVector({ T: 1 }), 86400),

  // Temperature (base: kelvin) - requires affine conversion
  celsius: createAffineUnit(
    'celsius',
    'Celsius',
    'C',
    'temperature',
    createDimensionVector({ Temp: 1 }),
    1,
    273.15,
  ),
  fahrenheit: createAffineUnit(
    'fahrenheit',
    'Fahrenheit',
    'F',
    'temperature',
    createDimensionVector({ Temp: 1 }),
    5 / 9,
    273.15 - 32 * (5 / 9),
  ),
  kelvin: createLinearUnit(
    'kelvin',
    'Kelvin',
    'K',
    'temperature',
    createDimensionVector({ Temp: 1 }),
    1,
  ),
} as const;

export const DEFAULT_UNIT_REGISTRY: UnitRegistry = Object.values(UNIT_DEFINITIONS)

/*
converts the inputed unit into the base value for calculation
*/
export const convertValueToBaseUnits = (value:number, unit: UnitDefinition): number  => {
    if (unit.conversion.kind === 'affine') {
        return value * unit.conversion.toBaseFactor + unit.conversion.toBaseOffset;
    }

    return value * unit.conversion.toBaseFactor;
}

/*
converts the finished calculation into it's original unit
*/
export const convertValueFromBaseUnits = (baseValue: number, unit: UnitDefinition): number => {
    if (unit.conversion.kind === 'affine') {
    return (baseValue - unit.conversion.toBaseOffset) / unit.conversion.toBaseFactor;
    }

    return baseValue / unit.conversion.toBaseFactor;
};