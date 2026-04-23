export default class ResponseUtils {
  static writeSimpleString(value: string): string {
    return `+${value}\r\n`
  }

  static writeNullArray(): string {
    return "$-1\r\n"
  }

  static writeBulkString(args: string[]): string {
    let response = "";
    for (const literal of args) {
      const length = literal.length;
      response = response.concat(`$${length}\r\n${literal}\r\n`);
    }

    return response;
  }

  static writeArrayString(args: any[]): string {
    let response = `` 
    for (const item of args) {
      if (Array.isArray(item)) {
        response = response.concat(ResponseUtils.writeArrayString(item))
      } else if (Object.prototype.toString.call(item) === '[object Object]') {
        response = response.concat(this.writeArrayString(Object.values(item)))
      } 
      else {
        response = response.concat(this.writeBulkString([item]))
      }
    }
    return `*${args.length}\r\n${response}`;
  }

  static writeSimpleError(error: string): string {
    return `-${error}\r\n`
  }

  static writeInteger(value: number): string {
    return `:${value}\r\n`
  }
}
