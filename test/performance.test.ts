import engineFactory from '../src/index'
import perfy from 'perfy'
import deepClone from 'clone'
import { ruleFactory } from './support/rule-factory'

describe('Performance', () => {
    let baseConditions: {any?: any; all?: any} = {
        any: [
            {
                'fact': 'age',
                'operator': 'lessThan',
                'value': 50,
            },
            {
                'fact': 'segment',
                'operator': 'equal',
                'value': 'european',
            },
        ],
    }
    let event = {
        type: 'ageTrigger',
        params: {
            demographic: 'under50',
        },
    }
  /*
    * Generates an array of integers of length 'num'
    */
    function range (length: number) {
        return Array.from(Array(length).keys())
    }

    function setup (conditions: {any?: any; all?: any}) {
        let engine = engineFactory([], {})
        const config = deepClone({ conditions, event })
        range(1000).forEach(() => {
            let rule = ruleFactory(config)
            engine.addRule(rule)
        })
        engine.addFact('segment', 'european', { cache: true })
        engine.addFact('age', 15, { cache: true })
        return engine
    }

    test('performs "any" quickly', async () => {
        let engine = setup(baseConditions)
        perfy.start('any')
        await engine.run()
        const result = perfy.end('any')
        expect(result.time).toBeGreaterThan(0.02)
        expect(result.time).toBeLessThan(0.5)
    })

    test('performs "all" quickly', async () => {
        const conditions = deepClone(baseConditions)
        conditions.all = conditions.any
        delete conditions.any
        let engine = setup(conditions)
        perfy.start('all')
        await engine.run()
        const result = perfy.end('all')
        expect(result.time).toBeGreaterThan(0.02) // assert lower value
        expect(result.time).toBeLessThan(0.5)
    })
})
