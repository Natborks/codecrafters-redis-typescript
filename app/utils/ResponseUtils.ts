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

  static writeSimpleError(error: string): string {
    return `-${error}\r\n`
  }
}
