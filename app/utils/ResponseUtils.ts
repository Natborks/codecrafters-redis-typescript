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

  static writeArrayString(args: any[]): string {
    let response = `` 

    console.log("ARGS: ",args)
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

  static writeStreamArray(
    // args: Array<{id: string, values: string[]}>,
    args: any[],
  ): string {
    let response = ""
    response.concat(`*1\r\n`)
    // if (key) {
    //   response = `*1\r\n*2\r\n${this.writeBulkString([key])}\r\n*1`
    // }
    // response.concat(`*${args.length}\r\n`)

    // for (const {id, values} of args) {
    //   response = response.concat("*2\r\n")
    //   response = response.concat(ResponseUtils.writeBulkString([id]))
    //   response = response.concat(ResponseUtils.writeArrayString(values))
    // }

    for (const item in args) {
      if (Array.isArray(item)) {
        response.concat(this.writeArrayString(item))
      } else if (typeof item === "string") {
        response.concat(this.writeBulkString([item]))
      }

    }
    return response
  }

  static writeSimpleError(error: string): string {
    return `-${error}\r\n`
  }
}
