export default class ResponseUtils {
  static writeSimpleString(value: string): string {
    return `+${value}\r\n`
  }

  static writeBulkString(args: string[]): string {
    let response = "";
    for (const literal of args) {
      const length = literal.length;
      response = response.concat(`$${length}\r\n${literal}\r\n`);
    }

    return response;
  }

  static writeArrayString(args: string[]): string {
    const response = ResponseUtils.writeBulkString(args);
    return `*${args.length}\r\n${response}`;
  }

  static writeStreamArray(
    args: Array<{id: string, values: string[]}>,
    key: string = "", 
  ): string {
    let response = ""
    if (key) {
      response = `*1\r\n*2\r\n${this.writeBulkString([key])}\r\n`
    }
    response.concat(`*${args.length}\r\n`)

    for (const {id, values} of args) {
      response = response.concat("*2\r\n")
      response = response.concat(ResponseUtils.writeBulkString([id]))
      response = response.concat(ResponseUtils.writeArrayString(values))
    }

    return response
  }

  static writeSimpleError(error: string): string {
    return `-${error}\r\n`
  }
}
