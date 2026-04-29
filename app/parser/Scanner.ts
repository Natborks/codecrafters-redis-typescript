export default class Scanner {
  #source: string;

  constructor(source: string) {
    this.#source = source;
  }

  scanTokens(): { commands: string[][]; remainder: string } {
    const commands: string[][] = [];
    let current = 0;

    while (current < this.#source.length) {
      if (this.#source.startsWith("\r\n", current)) {
        current += 2;
        continue;
      }

      if (this.#source[current] !== "*") {
        break;
      }

      const arrayEnd = this.#source.indexOf("\r\n", current);
      if (arrayEnd === -1) break;

      const elementCount = Number.parseInt(
        this.#source.slice(current + 1, arrayEnd),
        10,
      );

      if (Number.isNaN(elementCount)) break;

      let cursor = arrayEnd + 2;
      const command: string[] = [];
      let isCompleteCommand = true;

      for (let index = 0; index < elementCount; index++) {
        if (this.#source[cursor] !== "$") {
          isCompleteCommand = false;
          break;
        }

        const bulkEnd = this.#source.indexOf("\r\n", cursor);
        if (bulkEnd === -1) {
          isCompleteCommand = false;
          break;
        }

        const bulkLength = Number.parseInt(
          this.#source.slice(cursor + 1, bulkEnd),
          10,
        );
        if (Number.isNaN(bulkLength)) {
          isCompleteCommand = false;
          break;
        }

        const valueStart = bulkEnd + 2;
        const valueEnd = valueStart + bulkLength;
        if (this.#source.length < valueEnd + 2) {
          isCompleteCommand = false;
          break;
        }

        command.push(this.#source.slice(valueStart, valueEnd));
        cursor = valueEnd + 2;
      }

      if (!isCompleteCommand) break;

      commands.push(command);
      current = cursor;
    }

    return { commands, remainder: this.#source.slice(current) };
  }
}
