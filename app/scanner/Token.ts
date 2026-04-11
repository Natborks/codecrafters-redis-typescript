import type { TokenType } from "../types/TokenType.ts"

export default class Token {
    type : TokenType
    literal : any
    lexeme : string

    constructor(type: TokenType, lexeme: string, literal: any,) {
        this.type = type,
        this. literal = literal,
        this.lexeme = lexeme
    }
}