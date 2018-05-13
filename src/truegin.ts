import Engine, {EngineOptions} from './engine'
import Fact from './fact'
import Rule from './rule'
import Operator from './operator'

export { Fact, Rule, Operator, Engine }
export default function (rules?: Rule[], options?: EngineOptions) {
    return new Engine(rules, options)
}
