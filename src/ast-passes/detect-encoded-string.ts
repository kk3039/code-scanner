import * as walk from 'acorn-walk'
import * as _ from "lodash";

const IDENTIFIER = 'Identifier'
const LITERAL = 'Literal'
const ARRAY_EXPR = 'ArrayExpression'
const ARRAY_PATTERN = 'ArrayPattern'
const PROPERTY = 'Property'
const SPREAD_ELEMENT = 'SpreadElement'
const RETURN_STMT = 'ReturnStatement'

// const print = console.log

export function markEncodedString(ast: any) {

  const isType = (node: any, type: string) => {
    return node.type === type
  }

  const isEncodedString = (node: any) => {
    return _.has(node, "isEncodedString")
  }

  let encodedStringTable = new Set<string>();

  walk.simple(ast, {
    // Literal(node: any) {
    //   if (typeof node.value === "string") {
    //     if (encodingList.includes(node.value.toLocaleString())) {
    //       node.isEncoding = true
    //     }
    //     node.isString = true
    //   }
    // },
    Identifier(node: any) {
      // console.log('Identifier')
      if (encodedStringTable.has(node.name)) {
        node.isEncodedString = true;
      }
    },
    VariableDeclarator(node: any) {
      // console.log('VariableDeclarator')
      if (isType(node.id, IDENTIFIER)) {
        if (isEncodedString(node.init)) {
            encodedStringTable.add(node.id.name)
        }
      }
    },
    AssignmentExpression(node: any) {
      // console.log('AssignmentExpression')
      if (isType(node.left, IDENTIFIER)) {
        if (isEncodedString(node.right)) {
          encodedStringTable.add(node.left.name)
        }
      }
    },
    CallExpression(node: any) {
      // console.log('CallExpression')
      let args = node.arguments as Array<any>
      if (isEncodedString(node.callee)) {
        node.isEncodedString = true;
      } else {
        let expr = node as any
        let callee = expr.callee
        if (callee.type === "MemberExpression" && callee.object.name === "Buffer" && callee.property.name === "from") {
          node.isEncodedString = true;
        }
      }

    },
    MemberExpression(node: any) {
      // console.log('MemberExpression')
      let expr = node as any
      let callee = expr.object
      let member = expr.property
      if (!node.computed && isType(member, IDENTIFIER)) {
        if (isEncodedString(callee)) {
          node.isEncodedString = true;
        }
      }
    },
  })

}

