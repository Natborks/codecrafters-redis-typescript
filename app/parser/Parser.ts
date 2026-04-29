import Scanner from "./Scanner";

export default class Parser {
  #source;
  #parsedData: string[];

  constructor(source: string) {
    this.#source = source;
    const scanner = new Scanner(this.#source);
    const tokens = scanner.scanTokens();
    console.log("TOKENS: ", this.parseTokens(tokens));
    this.#parsedData = tokens;
  }

  parseTokens(tokens: string[]): any{
    let idx = 0
    const result = []

    while (idx < tokens.length) {
      const buldString = []
      let count = idx
      while (tokens[count][0] !== "*") {
        if (tokens[count][0] === "$") {
          continue
        }
        buldString.push(tokens[idx])
        count += 1
      }

      idx =  count
      result.push(buldString)
    }

    // console.log("parsing tokens: ", tokens)
    // const response = new Array();
    // const [first, ...rest] = tokens;
    // if (first[0] === "*") {
    //   response.push(this.parseTokens(rest));
    // } else if (first === "$") {
    //   response.push(this.parseBulkString(rest));
    // }

    // return response;
  }

  private parseBulkString(tokens: string[]) : string[]{
    const response = [];
    for (const token of tokens) {
      const firstChar = token[0];
      if (firstChar === "*") {
        return this.parseTokens(tokens.slice(tokens.indexOf(token)))
      }
      if (token.length > 1) {
        if ((firstChar === "*" && token.length > 1) || firstChar === "$")
          continue;
      }

      response.push(token);
    }

    return response
  }

  getParsedString() {
    return this.#parsedData;
  }
}
