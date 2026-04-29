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

  parseTokens(tokens: string[]) {
    let idx = 0;
    const result = [];

    while (idx < tokens.length) {
      if (tokens[idx][0] !== "*") {
        idx += 1;
        continue;
      }

      const count = parseInt(tokens[idx].slice(1), 10);
      idx += 1;

      const bulkString = [];

      for (let i = 0; i < count && idx < tokens.length; i++) {
        if (tokens[idx][0] === "$") {
          idx += 1;
        }

        bulkString.push(tokens[idx]);
        idx += 1;
      }

      result.push(bulkString);
    }

    return result;
  }

  private parseBulkString(tokens: string[]): string[] {
    const response = [];
    for (const token of tokens) {
      const firstChar = token[0];
      if (firstChar === "*") {
        return this.parseTokens(tokens.slice(tokens.indexOf(token)));
      }
      if (token.length > 1) {
        if ((firstChar === "*" && token.length > 1) || firstChar === "$")
          continue;
      }

      response.push(token);
    }

    return response;
  }

  getParsedString() {
    return this.#parsedData;
  }
}
