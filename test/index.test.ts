import subject from '../src/index'
import { ruleFactory } from './support/rule-factory'

describe('json-business-subject', () => {
    test('treats each rule engine independently', () => {
        let engine1 = subject()
        let engine2 = subject()
        engine1.addRule(ruleFactory())
        engine2.addRule(ruleFactory())
        expect(engine1.rules.length).toBe(1)
        expect(engine2.rules.length).toBe(1)
    })
})
