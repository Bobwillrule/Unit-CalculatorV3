import type { BinaryExpression, ExpressionNode, ParsedExpression, PowerExpression } from '../../parser';

import {
    DIMENSIONLESS,
    areDimensionsEqual,
    divideDimensions,
    multiplyDimensions,
    powDimensions,
    type DimensionVector,
    type UnitDefinition,
    type UnitRegistry,
} from '../units';

/*
help pass around currently available units
*/
export interface EvaluationContext {
    readonly units: UnitRegistry;
}

/*
return intergface of the result
*/
export interface EvaluationResult {
    readonly value: number;
    readonly dimension: DimensionVector;
}

/*Anything claiming to be an ExpressionEvaluator must have an evaluate function*/
export interface ExpressionEvaluator {
    evaluate(parsedExpression: ParsedExpression, context: EvaluationContext): EvaluationResult;
}

/*
loops throgh list of units to find the first instance of the unit
*/
const findUnit = (symbol: string, units: UnitRegistry): UnitDefinition | undefined =>
  units.find((unit) => unit.symbol === symbol || unit.id === symbol);

const evaluateNumberNode = (value: number): EvaluationResult => ({
  value,
  dimension: DIMENSIONLESS,
});

/*
helps check if the unit is a valid unit in the unit registry
*/
const evaluateUnitNode = (symbol: string, units: UnitRegistry): EvaluationResult => {
  const unit = findUnit(symbol, units);

  if (!unit) { // check if unit exists
    throw new Error(`Unknown unit: ${symbol}`);
  }

  return {
    value: unit.conversion.toBaseFactor,
    dimension: unit.dimension,
  };
};

/*
evaluate addition or subtraction of two numbers
ensures that units are the same. Ie, 2mm + 3mm^2 is not a valid operation
*/
const evaluateAdditiveOperation = (
  left: EvaluationResult, //make sure that input is an evaluation result ie number + unit
  right: EvaluationResult,
  operator: '+' | '-',
): EvaluationResult => {
  if (!areDimensionsEqual(left.dimension, right.dimension)) { // checks if the units are the same
    throw new Error(`Dimension mismatch for "${operator}" operation.`);
  }

  return { // returns an evaluation result, add if operator field is + and subtract otherwise
    value: operator === '+' ? left.value + right.value : left.value - right.value,
    dimension: left.dimension,
  };
};

/*
evaluate multiplication and division of two number units
ensures that it cannot divide by 0
*/
const evaluateMultiplicativeOperation = (
  left: EvaluationResult,
  right: EvaluationResult,
  operator: '*' | '/',
): EvaluationResult => {
  if (operator === '/' && right.value === 0) { //check for 0 division
    throw new Error('Cannot divide by zero.');
  }

  return { // multiply if * divide otherise
    value: operator === '*' ? left.value * right.value : left.value / right.value,
    dimension:
      operator === '*'
        ? multiplyDimensions(left.dimension, right.dimension)
        : divideDimensions(left.dimension, right.dimension),
  };
};

/**
evaluates a binary operation. Ie, 2+2
**/
const evaluateBinaryExpression = (
  node: BinaryExpression,
  units: UnitRegistry,
): EvaluationResult => {
  const left = evaluateNode(node.left, units); // recursively evalueate the left side
  const right = evaluateNode(node.right, units); // recursively evaluate the right side

  if (node.operator === '+' || node.operator === '-') { // add operations
    return evaluateAdditiveOperation(left, right, node.operator);
  }

  return evaluateMultiplicativeOperation(left, right, node.operator); // else multiply opeartions
};

/**
evaluates power expressions ie 2^(2+2)
 */
const evaluatePowerExpression = (node: PowerExpression, units: UnitRegistry): EvaluationResult => {
  const base = evaluateNode(node.base, units); //recursively evaluate the base
  const exponent = evaluateNode(node.exponent, units); // recursively evaluate the top part

  if (!areDimensionsEqual(exponent.dimension, DIMENSIONLESS)) { // cannot have units in exponent. Ie, 2^2mm is not valid
    throw new Error('Exponent must be dimensionless.');
  }


  // for future exponent typing. for now they are the same
  const evaluateNumberExponent = (): EvaluationResult => ({  // 
    value: Math.pow(base.value, exponent.value),
    dimension: powDimensions(base.dimension, exponent.value),
  });

  const evaluateUnitExponent = (): EvaluationResult => ({ //
    value: Math.pow(base.value, exponent.value),
    dimension: powDimensions(base.dimension, exponent.value),
  });

  const evaluateExpressionExponent = (): EvaluationResult => ({ // uh redundent after I added recursion
    value: Math.pow(base.value, exponent.value),
    dimension: powDimensions(base.dimension, exponent.value),
  });


  switch (node.exponentType) {
    case 'number':
      return evaluateNumberExponent();
    case 'unit':
      return evaluateUnitExponent();
    case 'expression':
      return evaluateExpressionExponent();
    default:
      throw new Error('Unsupported exponent type.');
  }
};

/**
    main entry way to evaluate the function
 */
const evaluateNode = (node: ExpressionNode, units: UnitRegistry): EvaluationResult => {
  switch (node.kind) {
    case 'number':
      return evaluateNumberNode(node.value);
    case 'unit':
      return evaluateUnitNode(node.symbol, units);
    case 'binary-expression':
      return evaluateBinaryExpression(node, units);
    case 'power-expression':
      return evaluatePowerExpression(node, units);
    default:
      throw new Error('Unsupported expression node kind.');
  }
};

/*
main api
*/
export const createExpressionEvaluator = (): ExpressionEvaluator => ({
  evaluate(parsedExpression: ParsedExpression, context: EvaluationContext): EvaluationResult {
    return evaluateNode(parsedExpression.ast, context.units);
  },
});

export const expressionEvaluator: ExpressionEvaluator = createExpressionEvaluator();

