export class EventWatcher {
  private url: string
  private ws?: WebSocket

  constructor(relpath: string) {
    const protocol = location.protocol === 'http:' ? 'ws' : 'wss'
    const { host, pathname } = location
    this.url = `${protocol}://${host}${pathname}${relpath}`
  }

  connect() {
    this.ws = new WebSocket(this.url)
    this.ws.addEventListener('open', e => {
      this.ws?.send('hello world')
    })
    this.ws.addEventListener('message', e => {
      for (const cb of this.listeners) {
        cb(e.data)
      }
    })
  }

  private listeners: ((data: any) => void)[] = []

  addListener<T = any>(cb: (data: T) => void) {
    this.listeners.push(cb)
  }

  disconnect() {
    if (this.ws) {
      while (this.listeners.length > 0) {
        this.ws.removeEventListener('message', this.listeners.pop()!)
      }
      this.ws.close()
    }
  }
}