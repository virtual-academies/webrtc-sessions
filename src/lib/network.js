
'use strict'

import Connection from './connection'
import { log, getTime } from './utils'

class Network {

  constructor(clientId, meta, config) {
    log('session started as', clientId)
    this.clientId = clientId
    this.meta = meta || {}
    this.timeStamp = getTime()
    this.connected = false
    this.sendCallback = null
    this.stream = null
    this.events = {}
    this.connections = {}
    this.audioTimeout = null
    this.audioDelay = 1000
    this.configure(config)
    this.bindUnload()
  }

  configure(config) {
    this.config = Object.assign({
      connection: {}
    }, config)
  }

  bindUnload() {
    window.onunload = event => {
      this.disconnect()
    }
  }

  on(event, callback) {
    if(!this.events[event]) {
      this.events[event] = []
    }
    this.events[event].push(callback)
  }

  trigger(event, ...args) {
    if(this.events[event] && this.events[event].length > 0) {
      this.events[event].forEach(callback => {
        callback.apply(null, args)
      })
    }
  }

  send(data) {
    if(typeof(this.sendCallback) == 'function') {
      this.sendCallback(JSON.stringify(Object.assign(data, {
        clientId: this.clientId
      })))
    }
  }

  broadcast(data) {
    Object.keys(this.connections).forEach(clientId => {
      this.connections[clientId].send(Object.assign(data, {
        clientId: this.clientId
      }))
    })
  }

  /*
   * https://www.w3.org/TR/websockets/
   */
  connect(sendCallback) {
    this.sendCallback = sendCallback
    this.connected = true
    return {
      onOpen: this.onOpen.bind(this),
      onError: this.onError.bind(this),
      onMessage: this.onMessage.bind(this),
      onClose: this.onClose.bind(this)
    }
  }

  disconnect() {
    this.send({ type: 'leave' })
    Object.keys(this.connections).forEach(clientId => {
      this.connections[clientId].disconnect()
      delete this.connections[clientId]
    })
    clearTimeout(this.audioTimeout)
    this.connected = false
    this.stream = null
    this.trigger('stream', null)
  }

  reconnect() {
    this.send({
      timeStamp: this.timeStamp,
      meta: this.meta,
      type: 'join'
    })
  }

  /*
   * Callback for socket onopen event
   */
  onOpen() {
    this.send({
      timeStamp: this.timeStamp,
      meta: this.meta,
      type: 'join'
    })
  }

  /*
   * Callback for socket onmessage event
   */
  onMessage(message) {

    if(typeof(message) == 'string') {
      message = JSON.parse(message)
    }

    if(message.clientId == this.clientId) return
    if(message.peerId && message.peerId != this.clientId) return

    log('received', message.type, 'from', message.clientId)

    switch (message.type) {
      case 'join': this.join(message); break
      case 'peer': this.peer(message); break
      case 'offer': this.offer(message); break
      case 'answer': this.answer(message); break
      case 'ice': this.ice(message); break
      case 'rollback': this.rollback(message); break
      case 'leave': this.leave(message); break
      default:
        log('unexpected message type', message.type)
        break
    }
  }

  /*
   * Callback for socket onerror event
   */
  onError(err) {
    log('socket connection error', err.message)
  }

  /*
   * Callback for socket onclose event
   */
  onClose(event) {
    log('socket connection closed')
  }

  open(clientId, meta, timeStamp) {
    if(clientId < this.clientId) {
      this.openConnection(clientId, meta, 'answer', timeStamp)
    } else {
      this.openConnection(clientId, meta, 'offer', timeStamp)
    }
  }

  join({ clientId, timeStamp, meta }) {
    this.open(clientId, meta, timeStamp)
    this.send({
      peerId: clientId,
      timeStamp: this.timeStamp,
      meta: this.meta,
      type: 'peer'
    })
  }

  peer({ clientId, timeStamp, meta }) {
    if(!this.connections[clientId]) {
      this.open(clientId, meta, timeStamp)
    } else if(this.stream) {
      this.connections[clientId].onNegotiationNeeded()
    }
  }

  offer({ clientId, sdp, timeStamp }) {
    if(this.connections[clientId]) {
      this.connections[clientId].offer(sdp)
    }
  }

  answer({ clientId, sdp }) {
    if(this.connections[clientId]) {
      this.connections[clientId].answer(sdp)
    }
  }

  ice({ clientId, candidate }) {
    if(this.connections[clientId]) {
      this.connections[clientId].ice(candidate)
    }
  }

  rollback({ clientId }) {
    if(this.connections[clientId]) {
      this.connections[clientId].reconnect()
    }
  }

  leave({ clientId }) {
    if(this.connections[clientId]) {
      this.connections[clientId].disconnect()
    }
  }

  openConnection(clientId, meta, type, timeStamp) {
    if(this.connections[clientId]) {
      this.connections[clientId].reconnect()
    } else {
      log('opening to', type, clientId)
      this.connections[clientId] = new Connection(this, clientId, meta, type, timeStamp, this.config.connection)
      this.connections[clientId].on('connect', this.onConnect.bind(this))
      this.connections[clientId].on('open', () => this.onReady(clientId))
      this.connections[clientId].on('disconnect', () => this.onDisconnect(clientId))
      this.connections[clientId].on('fail', () => this.onFail(clientId))
      this.connections[clientId].on('stream', () => this.onStream(clientId))
      this.connections[clientId].on('data', this.onData.bind(this))
      this.connections[clientId].connect()
    }
  }

  onConnect(clientId, meta) {
    log('connected to', clientId, meta)
    if(this.stream) this.connections[clientId].addStream(this.stream)
    this.trigger('connect', clientId, meta)
  }

  onReady(clientId) {
    this.trigger('ready', clientId)
  }

  onDisconnect(clientId) {
    log('disconnected from', clientId)
    this.trigger('disconnect', clientId)
  }

  onFail(clientId) {
    log('connection to', clientId, 'failed')
    this.trigger('fail', clientId)
  }

  onStream(clientId) {
    this.trigger('remote', clientId, this.connections[clientId].stream)
  }

  startStreaming(video=true, audio=true) {
    if(!this.connected) {
      this.reconnect()
    }
    navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    }).then(stream => {
      this.stream = stream
      if(!video) this.toggleVideo()
      if(!audio) this.toggleAudio()
      Object.keys(this.connections).forEach(clientId => {
        this.connections[clientId].addStream(this.stream)
      })
      this.trigger('stream', this.stream)
      this.trackAudio()
    }).catch(err => {
      log('error in startStreaming', err.message)
    })
  }

  stopStreaming() {
    this.stream.getTracks().forEach(track => track.stop())
    Object.keys(this.connections).forEach(clientId => {
      this.connections[clientId].removeStream()
      this.connections[clientId].clearStream()
    })
    //this.disconnect()
  }

  isStreaming() {
    return !!this.stream
  }

  toggleVideo() {
    this.stream.getVideoTracks().forEach(track => {
      track.enabled = !track.enabled
    })
  }

  toggleAudio() {
    this.stream.getAudioTracks().forEach(track => {
      track.enabled = !track.enabled
    })
  }

  checkAudio() {
    let maxAudioLevel = 0, mainId = null
    Object.keys(this.connections).forEach(clientId => {
      if(this.connections[clientId].audioLevel > maxAudioLevel) {
        maxAudioLevel = this.connections[clientId].audioLevel
        mainId = clientId
      }
    })
    if(mainId) {
      this.trigger('audio', mainId, this.connections[mainId].stream)
    }
  }

  trackAudio() {
    this.audioTimeout = setTimeout(() => {
      this.checkAudio()
      this.trackAudio()
    }, this.audioDelay)
  }

  onData(clientId, data) {
    switch(data.type) {
      case 'meta': this.onmeta(data); break
      default: this.trigger('data', data)
    }
  }

  setmeta(meta) {
    this.meta = meta
    this.broadcast({
      type: 'meta',
      meta: meta
    })
  }

  onmeta({ clientId, meta }) {
    this.connections[clientId].meta = meta
    this.trigger('meta', clientId, meta)
  }

  getClients() {
    return Object.keys(this.connections).map(clientId => {
      if(this.connections[clientId].status != 'closed') {
        return {
          meta: this.connections[clientId].meta,
          clientId: clientId
        }
      }
    })
  }
}

export default Network
