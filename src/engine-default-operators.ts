import Operator from './operator'

let Operators: Operator[] = []
Operators.push(new Operator('equal', (a: any, b: any) => a === b))
Operators.push(new Operator('notEqual', (a: any, b: any) => a !== b))
Operators.push(new Operator('in', (a: any, b: any) => b.indexOf(a) > -1))
Operators.push(new Operator('notIn', (a: any, b: any) => b.indexOf(a) === -1))

Operators.push(
  new Operator('contains', (a: any, b: any) => a.indexOf(b) > -1, Array.isArray),
)
Operators.push(
  new Operator(
    'doesNotContain',
    (a: any, b: any) => a.indexOf(b) === -1,
    Array.isArray,
  ),
)

function numberValidator (factValue: string) {
    return Number.parseFloat(factValue).toString() !== 'NaN'
}
Operators.push(
  new Operator('lessThan', (a: any, b: any) => a < b, numberValidator),
)
Operators.push(
  new Operator('lessThanInclusive', (a: any, b: any) => a <= b, numberValidator),
)
Operators.push(
  new Operator('greaterThan', (a: any, b: any) => a > b, numberValidator),
)
Operators.push(
  new Operator(
    'greaterThanInclusive',
    (a: any, b: any) => a >= b,
    numberValidator,
  ),
)

export default Operators
