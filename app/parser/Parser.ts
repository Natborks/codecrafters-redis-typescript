import Scanner from "./Scanner";

export default class Parser {
  #source;
  #parsedData: string[];

  constructor(source: string) {
    console.log(source);
    this.#source = source;
    const scanner = new Scanner(this.#source);
    const tokens = scanner.scanTokens();
    console.log("TOKENS: ", this.parseTokens(tokens));
    this.#parsedData = tokens;
  }

  parseTokens(tokens: string[]): string[] | string {
    const response = new Array();
    const [first, ...rest] = tokens;
    if (first[0] === "*") {
      response.push(this.parseTokens(rest));
    } else if (first === "$") {
      response.push(this.parseBulkString(rest));
    }

    return response;
  }

  private parseBulkString(tokens: string[]) {
    const response = [];
    for (const token of tokens) {
      const firstChar = token[0];
      if (token.length > 1) {
        if ((firstChar === "*" && token.length > 1) || firstChar === "$")
          continue;
      }

      response.push(token);
    }
  }

  getParsedString() {
    return this.#parsedData;
  }
}
