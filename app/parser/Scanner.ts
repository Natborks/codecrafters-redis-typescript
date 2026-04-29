export default class Scanner {
  #source;

  constructor(source: string) {
    this.#source = source.split("\r\n");
  }

  scanTokens(): string[] {
    const tokens = [];
    for (const token of this.#source) {
      const firstChar = token[0];
      if (token.length > 1) {
        if ((firstChar === "*" && token.length > 1) || firstChar === "$")
          continue;
      }
      tokens.push(token);
    }

    return tokens.slice(0, tokens.length - 1);
  }
}
