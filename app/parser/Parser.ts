import { TokenType } from "../types/TokenType"
import Scanner from "./Scanner"
import Token from "./Token"

export type ParsedData = [
    command: string,
    args: string[] | string
]

export default class Parser {
    #source

    constructor(source: string) {
        this.#source = source    
    }

    parseCommand() : ParsedData {
        const scanner = new Scanner(this.#source)
        const tokens = scanner.scanTokens()

        const commandType = tokens.at(0)?.lexeme
        
        if (commandType === "+") {
            const command = tokens.at(1)?.lexeme
            if (command === undefined) {
                throw new Error("Missing command token")
            }

            const args = this.parseSimpleString(tokens.slice(2))
            return [command, args]
        }

        throw new Error("Unsupported command type")
    }

    private parseSimpleString(tokens: Token[]) : string {
       for (const token of tokens) {
            if (token.type === TokenType.STRING) {
                return token.literal
            }
       } 

       //string part of RESP was empty 
       return ""
    }


}