
'use strict'

class Network {

  constructor(clientId, targetId) {
    this.clientId = clientId
    this.targetId = targetId
    this.loaded = false
    this.timeStamp = getTime()
    this.sendCallback = null
    this.events = {}
    this.connections = {}
    this.readyTimeout = null
    this.readyDelay = 3000
  }

  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(callback)
  }

  trigger(event, ...args) {
    if (this.events[event] && this.events[event].length > 0) {
      this.events[event].forEach(callback => {
        callback.apply(null, args)
      })
    }
  }

  send(topic, data) {
    if(typeof(this.sendCallback) == 'function') {
      this.sendCallback(JSON.stringify(
        Object.assign(data, {
          clientId: this.clientId
        })
      ))
    }
  }

  broadcast(data) {
    Object.values(this.connections).forEach(connection => {
      connection.send(
        Object.assign(data, {
          clientId: this.clientId
        })
      )
    })
  }

  /*
   * https://www.w3.org/TR/websockets/
   */
  connect(sendCallback) {
    this.sendCallback = sendCallback
    return {
      onOpen: this.onOpen.bind(this),
      onError: this.onError.bind(this),
      onMessage: this.onMessage.bind(this),
      onClose: this.onClose.bind(this)
    }
  }

  disconnect() {
    Object.values(this.connections).forEach(connection => {
      connection.signalingState = 'closing'
      connection.disconnect()
    })
  }

  readyCheck() {
    this.readyTimeout = setTimeout(() => {
      this.onReady({})
    }, this.readyDelay)
  }

  onOpen() {
    log('publish join to target', this.targetId)
    this.send(this.targetId, {
      clientId: this.clientId,
      timeStamp: this.timeStamp,
      type: 'join'
    })
    this.readyCheck()
  }

  onMessage(topic, message) {
    message = JSON.parse(message)
    if (message.clientId == this.clientId) {
      return
    }
    clearTimeout(this.readyTimeout)
    log('received', message.type, 'from', message.clientId)
    switch (message.type) {
      case 'join': this.join(message); break
      case 'peer': this.peer(message); break
      case 'offer': this.offer(message); break
      case 'answer': this.answer(message); break
      case 'ice': this.ice(message); break
    }
  }

  onError(err) {
    this.processEvent('error', err)
  }

  join({ clientId, timeStamp, username }) {
    if (this.getConnectionCount() == 0) {
      this.setLoaded(false)
      this.loaded = false
    }
    if (clientId < this.clientId) {
      this.peer({ clientId, timeStamp, username })
    } else {
      this.send(clientId, {
        clientId: this.clientId,
        timeStamp: this.timeStamp,
        type: 'peer'
      })
    }
  }

  peer({ clientId, timeStamp, username }) {
    this.openConnection(clientId, 'offer', timeStamp, username)
  }

  offer({ clientId, sdp, timeStamp, username }) {
    this.openConnection(clientId, 'answer', timeStamp, username)
    this.connections[clientId].offer(sdp)
  }

  answer({ clientId, sdp }) {
    if (this.connections[clientId]) {
      this.connections[clientId].answer(sdp)
    }
  }

  ice({ clientId, candidate }) {
    if (this.connections[clientId]) {
      this.connections[clientId].ice(candidate)
    }
  }

  openConnection(clientId, type, timeStamp, username) {
    if (this.connections[clientId]) {
      this.connections[clientId].disconnect()
      this.connections[clientId].connect()
    } else {
      this.connections[clientId] = new Connection(this, clientId, type, timeStamp, username)
      this.connections[clientId].on('connect', () => this.onConnect(clientId))
      this.connections[clientId].on('ready', this.onReady.bind(this))
      this.connections[clientId].on('disconnect', () => this.onDisconnect(clientId))
      this.connections[clientId].on('fail', () => this.onFail(clientId))
    }
  }

  onConnect(clientId) {
    log('connection open to', clientId, 'at', new Date(this.connections[clientId].connectedAt))
    this.processEvent('open', clientId)
  }

  onReady(data) {
    this.processEvent('ready', data)
    let readyConnections = 0
    Object.values(this.connections).forEach(connection => {
      if(connection.status == 'ready') {
        readyConnections += 1
      }
    })
    if(!this.loaded && this.getConnectionCount() == readyConnections) {
      this.processEvent('open', this.clientId)
      this.loaded = true
    }
  }

  onClose(clientId) {
    log('connection closed to', clientId)
    this.processEvent('close', clientId)
  }

  onFail(clientId) {
    this.processEvent('fail', clientId)
  }

  getConnectionCount() {
    return Object.values(this.connections).length
  }

}