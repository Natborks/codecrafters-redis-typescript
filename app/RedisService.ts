import Store from "./Store";
import Parser from "./parser/Parser";
import StreamService from "./StreamService";
import StringService from "./StringService";

export default class RedisService {
  private store = new Store();
  private stringService = new StringService(this.store)
  private streamService = new StreamService(this.store)

  parse(data: string): string[] {
    const parser = new Parser(data);
    return parser.getParsedString();
  }

  ping(): string {
    return this.stringService.ping()
  }

  echo(args: string[]): string {
    return this.stringService.echo(args)
  }

  set(args: string[]): string {
    return this.stringService.set(args)
  }

  rpush(args: string[]): string {
    return this.stringService.rpush(args)
  }

  lpush(args: string[]): string {
    return this.stringService.lpush(args)
  }

  get(args: string[]): string {
    return this.stringService.get(args)
  }

  lrange(args: string[]): string {
    return this.stringService.lrange(args)
  }

  llen(args: string[]): string {
    return this.stringService.llen(args)
  }

  lpop(args: string[]): string {
    return this.stringService.lpop(args)
  }

  async blpop(args: string[]): Promise<string> {
    return this.stringService.blpop(args)
  }

  async getType(args: string[]) {
    return this.stringService.getType(args)
  }

  xadd(args: string[]): string {
    return this.streamService.xadd(args)
  }

  xrange(args: string[]): string {
    return this.streamService.xrange(args)
  }

  async xread(args: string[]): Promise<string> {
    return this.streamService.xread(args)
  }

  unknownCommand(command: string): string {
    return `-ERR unknown command '${command}'\r\n`;
  }
}
