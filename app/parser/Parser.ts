import Scanner from "./Scanner";

export default class Parser {
  #source;
  #parsedData: string[][];
  #remainder: string;

  constructor(source: string) {
    this.#source = source;
    const scanner = new Scanner(this.#source);
    const { commands, remainder } = scanner.scanTokens();
    this.#parsedData = commands;
    this.#remainder = remainder;
  }

  getParsedString() {
    return this.#parsedData[0] ?? [];
  }

  getParsedCommands() {
    return this.#parsedData;
  }

  getRemainder() {
    return this.#remainder;
  }
}
