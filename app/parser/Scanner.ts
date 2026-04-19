import Token from "./Token.ts"
import { TokenType } from "../types/TokenType.ts"

export default class Scanner {
    #source
    #tokens: Token[]
    #start = 0
    #current = 0

    constructor(source: string) {
        this.#source = source.split('\r\n')
        this.#tokens = []
    }

    scanTokens(): string[] {
        const tokens = []
        for (const token of this.#source) {
            const firstChar = token[0]
            if (token.length > 1) {
                if (firstChar === "*" && token.length > 1|| firstChar === "$")
                    continue
            }
            tokens.push(token)
        }

        return tokens.slice(0, tokens.length - 1)
    } 
}