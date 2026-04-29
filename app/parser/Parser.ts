import Scanner from "./Scanner";

export default class Parser {
  #source;
  #parsedData: string[][];

  constructor(source: string) {
    this.#source = source;
    const scanner = new Scanner(this.#source);
    const tokens = scanner.scanTokens();
    this.#parsedData = this.parseTokens(tokens);
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

  getParsedString() : string[][]{
    return this.#parsedData;
  }
}
