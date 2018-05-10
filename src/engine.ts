import Fact, {FactOptions} from './fact'
import Rule, {RuleConstructorOptions} from './rule'
import Operator from './operator'
import Almanac from './almanac'
import { EventEmitter } from 'events'
import { SuccessEventFact } from './engine-facts'
import defaultOperators from './engine-default-operators'

let debug = require('debug')('json-rules-engine')

export interface EngineOptions {
    allowUndefinedFacts?: boolean
}
export enum EngineStatus {
    READY = 'READY',
    RUNNING = 'RUNNING',
    FINISHED = 'FINISHED',
}

class Engine extends EventEmitter {
    rules: Rule[]
    allowUndefinedFacts: boolean
    operators: Map<string, Operator>
    facts: Map<string, Fact>
    status: EngineStatus
    prioritizedRules: Rule[][] | null = null

  /**
   * Returns a new Engine instance
   * @param  {Rule[]} rules - array of rules to initialize with
   * @param {EnginedOptions} options
   */
    constructor (rules: Rule[] = [], options: EngineOptions = {}) {
        super()
        this.rules = []
        this.allowUndefinedFacts = options.allowUndefinedFacts || false
        this.operators = new Map()
        this.facts = new Map()
        this.status = EngineStatus.READY
        rules.map(r => this.addRule(r))
        defaultOperators.map(o => this.addOperator(o))
    }

  /**
   * Add a rule definition to the engine
   * @param {object|Rule} properties - rule definition.  can be JSON representation, or instance of Rule
   * @param {integer} properties.priority (>1) - higher runs sooner.
   * @param {Object} properties.event - event to fire when rule evaluates as successful
   * @param {string} properties.event.type - name of event to emit
   * @param {string} properties.event.params - parameters to pass to the event listener
   * @param {Object} properties.conditions - conditions to evaluate when processing this rule
   */
    // TODO-Tom: Move this interface to the rule as RuleConstructorOptions | Rule
    // addRule (properties: {
    //     conditions: ConditionConstructorOptions,
    //     event: Action,
    //     priority?: number | string,
    // }) {
    addRule (properties: Rule) {
        if (!properties) throw new Error('Engine: addRule() requires options')
        if (!properties.hasOwnProperty('conditions')) throw new Error('Engine: addRule() argument requires "conditions" property')
        if (!properties.hasOwnProperty('event')) throw new Error('Engine: addRule() argument requires "event" property')

        let rule
        if (properties instanceof (Rule as any)) {
            rule = properties
        } else {
            rule = new Rule(properties as any)
        }
        rule.setEngine(this)

        this.rules.push(rule)
        this.prioritizedRules = null
        return this
    }

  /**
   * Remove a rule from the engine
   * @param {object|Rule} rule - rule definition. Must be a instance of Rule
   */
    removeRule (rule: Rule) {
        if ((rule instanceof (Rule as any)) === false) {
            throw new Error('Engine: removeRule() rule must be a instance of Rule')
        }

        let index = this.rules.indexOf(rule)

        if (index === -1) {
            return false
        }

        return Boolean(this.rules.splice(index, 1).length)
    }

  /**
   * Add a custom operator definition
   * @param {string}   operatorOrName - operator identifier within the condition; i.e. instead of 'equals', 'greaterThan', etc
   * @param {function(factValue, jsonValue)} cb - the method to execute when the operator is encountered.
   */
    addOperator (operatorOrName: string | Operator, cb?: (factValue: any, jsonValue: any) => boolean) {
        let operator
        if (operatorOrName instanceof Operator) {
            operator = operatorOrName
        } else {
            if (!cb) {
                throw new Error ('Engine: addOperator() if you provide an operatorName to this function' +
                'you must also provide a callback')
            }
            operator = new Operator(operatorOrName, cb)
        }
        debug(`engine::addOperator name:${operator.name}`)
        this.operators.set(operator.name, operator)
    }

  /**
   * Remove a custom operator definition
   * @param {string}   operatorOrName - operator identifier within the condition; i.e. instead of 'equals', 'greaterThan', etc
   * @param {function(factValue, jsonValue)} callback - the method to execute when the operator is encountered.
   */
    removeOperator (operatorOrName: Operator | string) {
        let operatorName
        if (operatorOrName instanceof Operator) {
            operatorName = operatorOrName.name
        } else {
            operatorName = operatorOrName
        }

        return this.operators.delete(operatorName)
    }

  /**
   * Add a fact definition to the engine.  Facts are called by rules as they are evaluated.
   * @param {object|Fact} id - fact identifier or instance of Fact
   * @param {function} valueOrMethod - function to be called when computing the fact value for a given rule
   * @param {Object} options - options to initialize the fact with. used when "id" is not a Fact instance
   */
    addFact (id: Fact | string, valueOrMethod?: any, options?: FactOptions) {
        let factId: string
        let fact
        if (id instanceof Fact) {
            factId = id.id
            fact = id
        } else {
            factId = id
            fact = new Fact(id, valueOrMethod, options)
        }
        debug(`engine::addFact id:${factId}`)
        this.facts.set(factId, fact)
        return this
    }

  /**
   * Add a fact definition to the engine.  Facts are called by rules as they are evaluated.
   * @param {Fact | string} factOrId
   */
    removeFact (factOrId: Fact | string) {
        let factId
        if (!(factOrId instanceof Fact)) {
            factId = factOrId
        } else {
            factId = factOrId.id
        }

        return this.facts.delete(factId)
    }

  /**
   * Iterates over the engine rules, organizing them by highest -> lowest priority
   * @return {Rule[][]} two dimensional array of Rules.
   *    Each outer array element represents a single priority(integer).  Inner array is
   *    all rules with that priority.
   */
    prioritizeRules (): Rule[][] {
        if (!this.prioritizedRules) {
            let ruleSets: {
                [index: string]: Rule[],
            } = this.rules.reduce((sets, rule) => {
                let priority = rule.priority

                if (priority) {
                    if (!sets[priority]) {
                        sets[priority] = []
                    }

                    sets[priority].push(rule)
                }

                return sets
            }, {})

            this.prioritizedRules = Object.keys(ruleSets).sort((a, b) => {
                return Number(a) > Number(b) ? -1 : 1 // order highest priority -> lowest
            }).map((priority) => ruleSets[priority])
        }
        return this.prioritizedRules
    }

  /**
   * Stops the rules engine from running the next priority set of Rules.  All remaining rules will be resolved as undefined,
   * and no further events emitted.  Since rules of the same priority are evaluated in parallel(not series), other rules of
   * the same priority may still emit events, even though the engine is in a "finished" state.
   * @return {Engine}
   */
    stop () {
        this.status = EngineStatus.FINISHED
        return this
    }

  /**
   * Returns a fact by fact-id
   * @param  {string} factId - fact identifier
   * @return {Fact} fact instance, or undefined if no such fact exists
   */
    getFact (factId: string): Fact | undefined {
        return this.facts.get(factId)
    }

  /**
   * Runs an array of rules
   * @param ruleArray
   * @param almanac
   * @return {Promise} resolves when all rules in the array have been evaluated
   */
    evaluateRules (ruleArray: Rule[], almanac: Almanac) {
        return Promise.all(ruleArray.map((rule) => {
            if (this.status !== EngineStatus.RUNNING) {
                debug(`engine::run status:${this.status}; skipping remaining rules`)
                return
            }
            return rule.evaluate(almanac).then((ruleResult) => {
                debug(`engine::run ruleResult:${ruleResult.result}`)
                if (ruleResult.result) {
                    this.emit('success', rule.event, almanac, ruleResult)

                    // TODO-Tom: Come back to this once I have typescripted rule.ts
                    if (rule.event) {
                        this.emit(rule.event.type, rule.event.params, almanac, ruleResult)
                    }
                    almanac.factValue('success-events', { event: rule.event })
                } else {
                    this.emit('failure', rule.event, almanac, ruleResult)
                }
            })
        }))
    }

  /**
   * Runs the rules engine
   * @param  {Object} runtimeFacts - fact values known at runtime
   * @param  {Object} runOptions - run options
   * @return {Promise} resolves when the engine has completed running
   */
    run (runtimeFacts = {}) {
        debug(`engine::run started`)
        debug(`engine::run runtimeFacts:`, runtimeFacts)
        runtimeFacts['success-events'] = new Fact('success-events', SuccessEventFact(), { cache: false })
        this.status = EngineStatus.RUNNING
        let almanac = new Almanac(this.facts, runtimeFacts)
        let orderedSets = this.prioritizeRules()
        let cursor: Promise<any> = Promise.resolve()

        // for each rule set, evaluate in parallel,
        // before proceeding to the next priority set.
        return new Promise((resolve, reject) => {
            orderedSets.map((set) => {

                cursor = cursor.then(() => {
                  return this.evaluateRules(set, almanac)
                }).catch(reject)

                return cursor
            })

            cursor.then(() => {

                this.status = EngineStatus.FINISHED
                debug(`engine::run completed`)
                resolve(almanac.factValue('success-events'))

            }).catch(reject)
        })
    }
}

export default Engine
