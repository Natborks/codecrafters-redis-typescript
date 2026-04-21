import Store from "../Store";
import IdUtils from "../utils/IdUtils";
import ResponseUtils from "../utils/ResponseUtils";

export default class StreamService {
  private streamRequestQueue : Map<string, Array<() => void>> = new Map()
  private STREAM_ITEM_ADDED = 'strea item added'

  constructor(private store: Store) {
    this.registerQueueDrain()
  }

  xadd(args: string[]): string {
    const [key, rawEntryId, ...entries] = args;
    let entryId = rawEntryId

    const topItemId = this.store.getTopItem(key)

    if (entryId === "*") {
      const millisecondsPart = Date.now().toString()
      const streamObj = this.store.hasStreamObj(key, millisecondsPart)
      entryId = IdUtils.autogenerateId(streamObj, millisecondsPart)
    } else {
      const [, sequence] = entryId.split("-")
      if (sequence === "*") entryId = IdUtils.generateSequence(topItemId, entryId)
    }

    if (topItemId) {
      const comp = IdUtils.validateId(topItemId, entryId)

      if (comp === 0) {
        return ResponseUtils.writeSimpleError(
          "ERR The ID specified in XADD must be greater than 0-0"
        )
      }

      if (comp === -1) {
        return ResponseUtils.writeSimpleError(
          "ERR The ID specified in XADD is equal or smaller than the target stream top item"
        )
      }
    }

    const result = this.store.xadd(key, entryId, entries);
    return ResponseUtils.writeBulkString([result]);
  }

  xrange(args: string[]): string {
    const [key, startId, endId] = args

    const result = this.store.xrange(key, startId, endId)

    return ResponseUtils.writeArrayString(result)
  }

  async xread(args: string[]): Promise<string> {
    try {
      const result = await this.handleXread(args)
      return ResponseUtils.writeArrayString(result)
    }catch {
      return "*-1\r\n";
    }
  }

  private handleXread(args: string[]) : Promise<any[]> {
    const getResponse = (args: string[]) => {
      let key = 0
      let id = args.length / 2
      const result = []

      while (id < args.length) {
        const streamKey = args[key]
        const startId = args[id]
        const res = this.store.xread(streamKey, startId)
        result.push([streamKey, res])
        key++
        id++
      }

      return result
    }

    if (args[0] !== "block") {
      const [, ...rest] = args
      return Promise.resolve(getResponse(rest))
    }

    const [block, milliseconds, streams, ...rest] = args
    let delay = parseFloat(milliseconds)

    console.log("DELAY: ", delay)

    const data = getResponse(rest)

    if(data && data.length > 1) {
      return Promise.resolve(data)
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject("*-1\r\n")
      }, delay)

      const command = () => {
        const data = getResponse(rest)
        clearTimeout(timeout)
        return resolve(data)
      }

      const streamKey = rest[0]
      const stream = this.streamRequestQueue.get(streamKey) || []
      stream.push(command)
      this.streamRequestQueue.set(streamKey, stream)
    })
  }

  private registerQueueDrain() {
    this.store.on(this.STREAM_ITEM_ADDED, ([type, itemKey]) => {
      if (!this.streamRequestQueue.has(itemKey)) return

      const commands = this.streamRequestQueue.get(itemKey)
      const nextCommand = commands?.shift()

      if (!nextCommand) return

      nextCommand()
    })
  }
}
