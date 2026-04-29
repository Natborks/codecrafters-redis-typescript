import Scanner from "./Scanner";

export default class Parser {
  #source;
  #parsedData: string[];

  constructor(source: string) {
    this.#source = source;
    const scanner = new Scanner(this.#source);
    const tokens = scanner.scanTokens();
    console.log("TOKENS: ", tokens)
    this.#parsedData = tokens;
  }

  getParsedString() {
    return this.#parsedData;
  }
}
