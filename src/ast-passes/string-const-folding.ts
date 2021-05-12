import * as walk from 'acorn-walk'
import * as _ from "lodash";

const IDENTIFIER = 'Identifier'
const LITERAL = 'Literal'
const ARRAY_EXPR = 'ArrayExpression'
const ARRAY_PATTERN = 'ArrayPattern'
const PROPERTY = 'Property'
const SPREAD_ELEMENT = 'SpreadElement'
const RETURN_STMT = 'ReturnStatement'

const print = console.log

export function foldConstant(ast: any) {

    function hasConstVal(node: any): boolean {
        return _.has(node, 'constVal')
    }

    function isType(node: any, type: string): boolean {
        return node.type === type
    }

    let symbolTable = new Map<string, any>([
        ["String", String],
        ["Object", Object],
        ["Array", Array],
    ])

    walk.simple(ast, {
        Literal(node: any) {
            node.constVal = node.value
        },
        Identifier(node: any) {
            if (symbolTable.has(node.name)) {
                node.constVal = symbolTable.get(node.name)
            }
        },
        VariableDeclarator(node: any) {
            if (hasConstVal(node.init)) {
                if (isType(node.id, IDENTIFIER)) {
                    symbolTable.set(node.id.name, node.init.constVal)
                }
            }
        },
        AssignmentExpression(node: any) {
            if (hasConstVal(node.right)) {
                symbolTable.set(node.left.name, node.right.constVal)
            }
        },
        BinaryExpression(node: any) {
            if (hasConstVal(node.left) && hasConstVal(node.right)) {
                let result = eval(`node.left.constVal ${node.operator} node.right.constVal`)
                node.constVal = result
            }
        },
        ObjectExpression(node: any) {
            let obj = {} as any
            for (let prop of node.properties) {
                if (isType(prop, PROPERTY)) {
                    if (isType(prop.key, LITERAL)) {
                        // {'a': 1, 'b': 2}, 'a' is literal
                        obj[prop.key.value] = prop.value.constVal
                    } else if (isType(prop.key, IDENTIFIER) && hasConstVal(prop.value)) {
                        // {a: 1, b: 2}, a is Id, b is Id
                        obj[prop.key.name] = prop.value.constVal
                    }
                } else if (isType(prop, SPREAD_ELEMENT) && hasConstVal(prop.argument)) {
                    let arg = prop.argument.constVal
                    if (Array.isArray(arg)) {
                        // {...[1,2,3]} --> {0: 1, 1: 2, 2: 3}
                        (arg as any[]).forEach((v, i) => {
                            obj[i] = v
                        });
                    } else if (typeof arg === 'object') {
                        // {...{a:1, b:2}} -> {a: 1, b: 2}
                        obj = Object.assign(obj, arg)
                    }
                }
            }
            node.constVal = obj
        },
        ArrayExpression(node: any) {
            let elements = node.elements as Array<any>
            // const val of array is the const val of all its elements
            // [Node(const=1), Node(?), Node(const='a')] => [1,null,'a']
            node.constVal = elements.map(e => hasConstVal(e) ? e.constVal : null)
        },
        CallExpression(node: any) {
            let args = node.arguments as Array<any>
            if (hasConstVal(node.callee) && args.every(e => hasConstVal(e))) {
                // f(a) => f.apply(this, [a])
                node.constVal = node.callee.constVal.apply(null, args.map(e => e.constVal))
            }
        },
        MemberExpression(node: any) {
            let expr = node as any
            let callee = expr.object
            let member = expr.property
            // computed: a['b'] not computed: a.b, diff from a[b]
            if (!node.computed && isType(member, IDENTIFIER)) {
                // a.b => a['b']
                member.constVal = member.name
            }
            if (hasConstVal(callee) && hasConstVal(member)) {
                let memExpr = callee.constVal[member.constVal]
                // if a has b as its prop
                if (_.hasIn(callee.constVal, member.constVal) && memExpr) {
                    node.constVal = callee.constVal[member.constVal]
                }
                // closure
                if (typeof node.constVal === 'function') {
                    node.constVal = (...args: any[]) => {
                        return memExpr.apply(callee.constVal, args)
                    }
                }
            }
        },
        ReturnStatement(node: any) {
            if (hasConstVal(node.argument)) {
                node.constVal = node.argument.constVal
            }
        },
        BlockStatement(node: any) {
            let ret = (node.body as any[]).filter(e => isType(e, RETURN_STMT))
            if (ret.length === 1 && hasConstVal(ret[0])) {
                node.constVal = ret[0].constVal
            }
        },
        FunctionDeclaration(node: any) {
            if (hasConstVal(node.body)) {
                if (isType(node.id, IDENTIFIER)) {
                    let constClosure = (...args: any[]) => {
                        return node.body.constVal
                    }
                    symbolTable.set(node.id.name, constClosure)
                }
            }
        },
        ArrowFunctionExpression(node: any) {
            if (hasConstVal(node.body)) {
                let constClosure = (...args: any[]) => {
                    return node.body.constVal
                }
                node.constVal = constClosure
            }
        }
    })
    return symbolTable
}

