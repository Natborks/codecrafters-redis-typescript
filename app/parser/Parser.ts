import { TokenType } from "../types/TokenType"
import Scanner from "./Scanner"
import Token from "./Token"

export default class Parser {
    #source

    constructor(source: string) {
        this.#source = source    
        const scanner = new Scanner(this.#source)
        const tokens = scanner.scanTokens()
        const commandType = tokens.at(0)?.lexeme

        if (commandType === undefined) {
            throw new Error("No command type found")
        }
    
        this.parseCommand(commandType, tokens, [])
    }

    private parseCommand(commandType: string, tokens: Token[], acc: string[]) : sting[] {

        if (commandType === "+") {
            const command = tokens.at(1)?.lexeme
            if (command === undefined) {
                throw new Error("Missing command token")
            }

            const args = this.parseSimpleString(tokens.slice(2))
            return [command, args]
        }

        if (commandType === "*") {
            const commandType = tokens.at(4)?.lexeme
            
            if(!commandType) throw new Error("Missing command token")

            return this.parseCommand(commandType, tokens.slice(5), acc)
        }

        if (commandType === "$") {

            const result = this.parseBulkString(tokens.slice(3))
            
            return [...acc, ...result]
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

    private parseBulkString(tokens: Token[]) : string[] {
        const result = []
        for (const token of tokens) {
            if (token.type === TokenType.STRING) {
                result.push(token.literal)
            }
        }

        return result
    }




}