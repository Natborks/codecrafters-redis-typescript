import Cache from "../Cache"
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
        for (let i = 0; i < tokens.length; i+= 1) {
            const token = tokens[i]

            //skip string length values
            if (token.type === TokenType.DOLLAR) {
                i = i + 2
                continue
            }

            if (token.type === TokenType.STRING || token.type === TokenType.NUMBER) {
                result.push(token.literal)
            }
        }

        return result
    }

}

const parse = new Parser("*7\r\n$5\r\nLPUSH\r\n$9\r\npineapple\r\n$4\r\npear\r\n$9\r\nraspberry\r\n$6\r\norange\r\n$9\r\npineapple\r\n$5\r\ngrape\r\n")

const data = parse.getParsedString()

console.log(data)
const cache = new Cache()
const [command, key, ...args] = data
console.log(command, "KEY", key, args)
const inserted = cache.lpush(key, args)
console.log("INSERTED", inserted)
const values = cache.get(key)
console.log("LPOP",cache.lpop(key))
console.log("BLPOP: ", await cache.blpop(key, 2000))
const insert= cache.lpush("key", args)
console.log(values)
console.log(cache.lrange(key, 0, -1))