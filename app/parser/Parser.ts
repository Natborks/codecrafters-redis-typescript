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
        this.#parsedData = tokens

    }

    getParsedString() {
        console.log("Parsed: ",this.#parsedData)
        return this.#parsedData
    }

}
