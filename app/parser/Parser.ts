import Scanner from "./Scanner";

export default class Parser {
  #source;
  #parsedData: string[];

  constructor(source: string) {
    console.log(source)
    this.#source = source;
    const scanner = new Scanner(this.#source);
    const tokens = scanner.scanTokens();
    console.log("TOKENS: ", tokens)
    this.#parsedData = tokens;
  }

  // parseTokens(tokens: string[]) : string[] | string {
  //   if (tokens.length === 1) return tokens[0]

  //   const [first, ...rest] = tokens
    
  //   if (first[0] === "*") {
  //     const result = []
  //   } 
  // }

  getParsedString() {
    return this.#parsedData;
  }
}
