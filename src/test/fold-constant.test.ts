import * as acorn from 'acorn'
import {foldConstant} from '../utils/string-const-folding'

describe(`foldConstant tests`, () => {
    test("varibles should be recognized", () => {
        const code = `var a = {}
        var b = "b"
        var c = 2`
        const ast = acorn.parse(code, {ecmaVersion: "latest"}) as any
        const symbolTable = foldConstant(ast)
        expect(symbolTable.get("a")).toStrictEqual({})
        expect(symbolTable.get("b")).toBe("b")
        expect(symbolTable.get("c")).toEqual(2)
    });

    test("function should be executed", () => {
        const code = `
        var f = (x) => {
            return 1+1
        }
        var c = f(2)`
        const ast = acorn.parse(code, {ecmaVersion: "latest"}) as any
        const symbolTable = foldConstant(ast)
        expect(symbolTable.get("c")).toEqual(2)
    });

    test("adding variables should produce concatentation result", () => {
        const code = `var a = "a"
        var b = "b"
        var c = "c"
        var res = a + b + c`
        const ast = acorn.parse(code, {ecmaVersion: "latest"}) as any
        const symbolTable = foldConstant(ast)
        expect(symbolTable.get("a")).toBe("a")
        expect(symbolTable.get("b")).toBe("b")
        expect(symbolTable.get("c")).toBe("c")
    });

    test("complicated string concatentation", () => {
        const code = `
        var url_part_1 = 'h' + 't' + 't' + 'p://' // <--- disguised http keyword
        var url_part_2 = ['api.github', '.com/repos'].join('')
        var getAddress = url_part_1 + url_part_2;
        `
        const ast = acorn.parse(code, {ecmaVersion: "latest"}) as any
        const symbolTable = foldConstant(ast)
        expect(symbolTable.get("getAddress")).toBe("http://api.github.com/repos")
    });
    test("function should be executed", () => {
        const code = `
        var f = (x) => {
            return "a"+x
        }
        var c = f(2)`
        const ast = acorn.parse(code, {ecmaVersion: "latest"}) as any
        const symbolTable = foldConstant(ast)
        expect(symbolTable.get("c")).toBe("a2")
    });
});


