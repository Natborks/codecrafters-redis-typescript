import { TokenType } from "../types/TokenType"
import Scanner from "./Scanner"
import Token from "./Token"

const SIMPLE_STRING = "+"
const ARRAY = "*"
const BULK_STRING = "$"

const SIMPLE_STRING_OFFSET = 2
const ARRAY_OFFSET = 5
const BULK_STRING_OFFSET = 3

export default class Parser {
    #source
    #parsedData : string []

    constructor(source: string) {
        this.#source = source    
        const scanner = new Scanner(this.#source)
        const tokens = scanner.scanTokens()
        const commandType = tokens.at(0)?.lexeme

        if (commandType === undefined) {
            throw new Error("No command type found")
        }
    
        this.#parsedData = this.parseCommand(commandType, tokens, [])
    }

    private parseCommand(commandType: string, tokens: Token[], acc: string[]) : string[] {

        if (commandType === SIMPLE_STRING) {
            const command = tokens.at(1)?.lexeme
            if (command === undefined) {
                throw new Error("Missing command token")
            }

            const args = this.parseSimpleString(tokens.slice(SIMPLE_STRING_OFFSET))
            return [command, args]
        }

        if (commandType === ARRAY) {
            const commandType = tokens.at(4)?.lexeme
            
            if(!commandType) throw new Error("Missing command token")

            return this.parseCommand(commandType, tokens.slice(ARRAY_OFFSET), acc)
        }

        if (commandType === BULK_STRING) {

            const result = this.parseBulkString(tokens.slice(BULK_STRING_OFFSET))
            
            return [...acc, ...result]
        }

        throw new Error("Unsupported command type")
    }

    getParsedString() {
        // console.log(this.#parsedData)
        // const [command, ...tokens] = this.#parsedData
        // const result : [string | string[]]= [command]
        // for (let i = 1; i < tokens.length; i += 2) {
        //     const len = tokens[i - 1];
        //     const lexeme = tokens[i];

        //     result.push([len, lexeme])
        // }
        return this.#parsedData
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
            if (token.type === TokenType.STRING || token.type === TokenType.NUMBER) {
                result.push(token.literal)
            }
        }

        return result
    }

}

const parse = new Parser("*5\r\n$3\r\nSET\r\n$9\r\npineapple\r\n$5\r\ngrape\r\n$2\r\nPX\r\n$3\r\n100\r\n")

const data = parse.getParsedString()

console.log(data)