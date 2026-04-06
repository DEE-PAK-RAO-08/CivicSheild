// ═══════════════════════════════════════════════════════
// CivicShield — Event Stream (Server-Sent Events)
// Real-time broadcast to all connected clients
// ═══════════════════════════════════════════════════════

class EventStream {
  static clients = [];
  static eventLog = [];
  static MAX_LOG = 200;

  static addClient(res) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Send initial connection event
    const connectEvent = {
      type: 'CONNECTED',
      data: { message: 'Connected to CivicShield event stream' },
      timestamp: new Date().toISOString()
    };
    res.write(`data: ${JSON.stringify(connectEvent)}\n\n`);

    this.clients.push(res);

    res.on('close', () => {
      this.clients = this.clients.filter(c => c !== res);
    });
  }

  static broadcast(type, data) {
    const event = {
      type,
      data,
      timestamp: new Date().toISOString()
    };

    this.eventLog.push(event);
    if (this.eventLog.length > this.MAX_LOG) {
      this.eventLog = this.eventLog.slice(-this.MAX_LOG);
    }

    const payload = `data: ${JSON.stringify(event)}\n\n`;
    this.clients.forEach(client => {
      try {
        client.write(payload);
      } catch (e) {
        // Client disconnected
      }
    });
  }

  static getRecent(count = 50) {
    return this.eventLog.slice(-count);
  }

  static reset() {
    this.eventLog = [];
  }
}

module.exports = EventStream;
