// Base units and types
export const BASE_DIMENSIONS = ['L', 'V', 'T', 'TEMP'] as const;

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
export const multiplyDeimnsions = (
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
}



