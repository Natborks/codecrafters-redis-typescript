import Token from "./Token.ts"
import { TokenType } from "../types/TokenType.ts"

export default class Scanner {
    #source
    #tokens: Token[]
    #start = 0
    #current = 0

    constructor(source: string) {
        this.#source = source
        this.#tokens = []
    }

    scanTokens(): Token[] {

        while (!this.isAtEnd()) {
            this.#start = this.#current
            this.scanToken()
        }
        return this.#tokens
    } 

    private isAtEnd() : boolean {
        return this.#current >= this.#source.length
    }


    private scanToken() : void  {
        const c = this.advance()

        if (this.isAlpha(c)) {
            this.extractString()
            return
        }

        if (this.isNum(c)) {
            this.extractNum()
            return
        }

        switch (c) {
            case '*':
                this.addToken(TokenType.STAR, null)
                break
            case '$':
                this.addToken(TokenType.DOLLAR, null)
                break
            case '\r':
                this.addToken(TokenType.CR, null)
                break
            case '\n':
                this.addToken(TokenType.LF, null)
                break
            default:
                throw new Error("Unexpected Character")
        }
    }

    private extractString() {
        while (!this.isAtEnd()) {
           const currentChar = this.#source[this.#current] 
           if (!this.isAlpha(currentChar)) {
                const literal = this.extractLiteral()
                this.addToken(TokenType.STRING, literal)
                return 
           }

           this.advance()
        }
        const literal = this.extractLiteral()
        this.addToken(TokenType.STRING, literal)
    }

    private advance() : string {
       return this.#source[this.#current++] 
    }

    private extractNum() {
        while (!this.isAtEnd()) {
            const char = this.#source[this.#current]
            if (!this.isNum(char)) {
                const literal = this.extractLiteral()
                this.addToken(TokenType.NUMBER, literal)
                return
            } 

            this.advance()
        }

        const literal = this.extractLiteral()
        this.addToken(TokenType.NUMBER, literal)

    }

    private addToken(type: TokenType, literal: any) : void {
        const lexeme = this.extractLiteral()
        this.#tokens.push(new Token(type, lexeme, literal))
    }

    private isAlpha(c: string) : boolean {
       return /[A-Za-z_]/.test(c) 
    }
     
    private isNum(c: string): boolean {
        return /\d/.test(c)
    }

    private extractLiteral(): string {
        return this.#source.substring(this.#start, this.#current)
    }

}