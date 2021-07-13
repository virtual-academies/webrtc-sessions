
'use strict'

import Connection from './connection'
import { log, getTime } from './utils'

class Network {

  constructor(clientId, meta={}, config={}) {
    this.clientId = clientId
    this.meta = meta || {}
    this.timeStamp = getTime()
    this.connected = false
    this.status = 'pending'
    this.sendCallback = null
    this.stream = null
    this.events = {}
    this.connections = {}
    this.audioTimeout = null
    this.desktopId = null
    this.pendingConnections = []
    this.connectionCount = 0
    this.relayStream = null
    this.relayChain = []
    this.configure(config)
    this.bindUnload()
    this.bindLog()
    this.log('session started as', clientId)
  }

  configure(config) {
    this.config = Object.assign({
      connection: {},
      trackAudio: true,
      audioDelay: 3000,
      openDataChannel: false,
      forceType: false,
      maxConnections: false,
      enableRelay: false,
      maxRelay: false,
      debug: false
    }, config)
  }

  bindUnload() {
    window.onunload = event => {
      this.disconnect()
    }
  }

  bindLog() {
    this.log = log.bind(this, this.config.debug)
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
    this.timeStamp = getTime()
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
      this.connectionCount -= 1
    })
    clearTimeout(this.audioTimeout)
    this.connected = false
    this.stream = null
    this.timeStamp = null
    this.trigger('stream', null)
  }

  kill(clientId) {
    if(this.connections[clientId]) {
      this.connections[clientId].disconnect()
      delete this.connections[clientId]
      this.connectionCount -= 1
    }
  }

  reconnect() {
    this.sendJoin()
  }

  /*
   * Callback for socket onopen event
   */
  onOpen() {
    this.sendJoin()
  }

  sendJoin() {
    this.send({
      timeStamp: this.timeStamp,
      meta: this.meta,
      forcedType: this.config.forceType,
      relayChain: this.relayChain,
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

    this.log('received', message.type, 'from', message.clientId)

    switch (message.type) {
      case 'join': this.join(message); break
      case 'peer': this.peer(message); break
      case 'offer': this.offer(message); break
      case 'answer': this.answer(message); break
      case 'ice': this.ice(message); break
      case 'rollback': this.rollback(message); break
      case 'leave': this.leave(message); break
      case 'disconnect': this.detach(message); break
      default:
        this.trigger(message.type, message)
        break
    }
  }

  /*
   * Callback for socket onerror event
   */
  onError(err) {
    this.log('socket connection error', err.message)
  }

  /*
   * Callback for socket onclose event
   */
  onClose(event) {
    this.log('socket connection closed')
  }

  open(clientId, meta, forcedType, relayChain, timeStamp) {
    if(this.status == 'pending') {

      this.status = 'opening'

      let type = 'offer'
      if(this.config.forceType == 'answer') {
        if(forcedType == 'offer') {
          type = 'answer'
        } else if(relayChain.length > 0) {
          type = 'answer'
        } else if(timeStamp < this.timeStamp) {
          type = 'answer'
        } else if(timeStamp == this.timeStamp && clientId < this.clientId) {
          type = 'answer'
        }
      } else if(clientId < this.clientId) {
        type = 'answer'
      }

      this.openConnection(clientId, meta, type, relayChain, timeStamp)

    } else {

      this.pendingConnections.push({ clientId, meta, forcedType, relayChain, timeStamp })

    }
  }

  join({ clientId, timeStamp, forcedType, relayChain, meta }) {
    this.open(clientId, meta, forcedType, relayChain, timeStamp)
    this.send({
      peerId: clientId,
      timeStamp: this.timeStamp,
      meta: this.meta,
      forcedType: this.config.forceType,
      relayChain: this.relayChain,
      type: 'peer'
    })
  }

  peer({ clientId, timeStamp, forcedType, relayChain, meta }) {
    if(!this.connections[clientId] || !this.connections[clientId].connection) {
      this.open(clientId, meta, forcedType, relayChain, timeStamp)
    } else {
      this.connections[clientId].peer()
    }
  }

  offer({ clientId, sdp }) {
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

  detach({ clientId }) {
    if(this.connections[clientId]) {
      this.connections[clientId].disconnect()
    }
  }

  negotiate() {
    Object.keys(this.connections).forEach(clientId => {
      if(this.connections[clientId]) {
        this.connections[clientId].onNegotiationNeeded()
      }
    })
  }

  processPendingConnections() {
    if(this.pendingConnections.length > 0) {
      this.open(...Object.values(this.pendingConnections.shift()))
    }
  }

  openConnection(clientId, meta, type, relayChain, timeStamp) {

    if(this.config.enableRelay) {
      if(this.relayChain.length == 0) {
        this.relayChain = relayChain
      } else if(this.relayChain.filter(x => relayChain.includes(x)).length > 0) {
        this.kill(clientId)
        return
      }
    }

    if(this.connections[clientId]) {
      this.connections[clientId].reopenConnection(type, timeStamp)
    } else if(!this.config.maxConnections || this.connectionCount < this.config.maxConnections) {
      this.log('opening to', type, clientId)
      this.connections[clientId] = new Connection(this, clientId, meta, type, timeStamp, this.config.connection)
      this.connections[clientId].on('connect', this.onConnect.bind(this))
      this.connections[clientId].on('open', () => this.onReady(clientId))
      this.connections[clientId].on('disconnect', () => this.onDisconnect(clientId))
      this.connections[clientId].on('fail', () => this.onFail(clientId))
      this.connections[clientId].on('stream', () => this.onStream(clientId))
      this.connections[clientId].on('data', this.onData.bind(this))
      this.connections[clientId].connect()
      this.connectionCount += 1
    } else {
      this.pendingConnections.push({ clientId, meta, forcedType: type, relayChain, timeStamp })
    }
  }

  onConnect(clientId, meta) {
    this.log('connected to', clientId)

    if(this.connections[clientId]) {
      if(this.config.enableRelay) {
        if(this.relayStream && this.connections[clientId].type == 'offer') {
          this.log('attempting to relay stream from 1 to', clientId)
          this.connections[clientId].addStream(true)
        }
      } else if(this.stream) {
        this.connections[clientId].addStream()
      }

      this.trigger('connect', clientId, meta)
    }

    this.status = 'pending'

    this.processPendingConnections()
  }

  onReady(clientId) {
    this.trigger('ready', clientId)
  }

  onDisconnect(clientId) {
    this.log('disconnected from', clientId)
    this.trigger('disconnect', { clientId })
  }

  onFail(clientId) {
    this.log('connection to', clientId, 'failed')
    this.trigger('fail', clientId)
  }

  onStream(clientId) {
    this.trigger('remote', clientId, this.connections[clientId].stream)
  }

  onInactive(){
    this.log('share inactive')
    this.trigger('inactive')
  }

  startStreaming(video=true, audio=true) {
    if(!this.connected) {
      this.reconnect()
    }
    navigator.mediaDevices.getUserMedia({
      audio: true,
      video: {
        optional: [
          { width: { max: 1980 }},
          { frameRate: { ideal: 30 }},
          { facingMode: 'user' }
        ]
      }
    }).then(stream => {
      this.setStream(stream, video, audio)
    }).catch(err => {
      this.log('error in startStreaming', err.message)
    })
  }

  // https://developer.mozilla.org/en-US/docs/Web/API/Screen_Capture_API/Using_Screen_Capture
  startSharing() {
    if(!this.connected) {
      this.reconnect()
    }

    navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: 'always'
      },
      audio: true
    }).then(stream => {
      if(stream)
      {
        stream.onended = this.onInactive.bind(this)
        stream.oninactive = this.onInactive.bind(this)
        stream.getVideoTracks().forEach(track => {
          track.onended = this.onInactive.bind(this)
        })

        if(this.stream) {
          this.stream.getVideoTracks().forEach(track => track.stop())
          this.stream.getAudioTracks().forEach(track => {
            stream.addTrack(track)
          })
        }

        this.setStream(stream, true, true)
      }
    }).catch(err => {
      this.onInactive()
    })
  }

  // https://stackoverflow.com/questions/4429440/html5-display-video-inside-canvas
  /*startRecording() {

  }*/

  setStream(stream, video=true, audio=true) {

    this.stream = stream
    if(!video) this.toggleVideo()
    if(!audio) this.toggleAudio()

    Object.keys(this.connections).forEach(clientId => {
      if(this.connections[clientId]) {
        this.connections[clientId].addStream(true)
      }
    })

    this.trigger('stream', this.stream)

    if(this.stream) {
      this.trackAudio()
    }
  }

  getCombinedStream(clientId) {

    let combinedStream = new MediaStream()
    if(this.connections[clientId] && this.connections[clientId].stream) {
      this.connections[clientId].stream.getVideoTracks().forEach(track => {
        combinedStream.addTrack(track)
      })
    } else if(this.stream) {
      this.stream.getVideoTracks().forEach(track => {
        combinedStream.addTrack(track)
      })
    }

    Object.values(this.connections).forEach(connection => {
      if (connection.stream) {
        connection.stream.getAudioTracks().forEach(track => {
          combinedStream.addTrack(track)
        })
      }
    })

    /*if(this.stream) {
      this.stream.getAudioTracks().forEach(track => {
        combinedStream.addTrack(track)
      })
    }*/

    return combinedStream
  }

  stopStreaming() {
    if(this.stream){
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }

    if(this.audioTimeout) {
      clearTimeout(this.audioTimeout)
    }

    Object.keys(this.connections).forEach(clientId => {
      this.connections[clientId].removeStream()
      this.connections[clientId].clearStream()
    })

    this.send({ type: 'disconnect' })
    this.disconnect()
  }

  stopSharing() {
    if(this.stream){
      this.stream.oninactive = null
      this.stopStreaming()
    }
  }

  isStreaming() {
    return !!this.stream
  }

  toggleVideo() {
    if(this.stream) {
      let toggle = false
      this.stream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled
        toggle = track.enabled
      })
      this.send({
        type: 'video',
        state: toggle
      })
    }
  }

  toggleAudio() {
    if(this.stream) {
      let toggle = false
      this.stream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled
        toggle = track.enabled
      })
      this.send({
        type: 'sound',
        state: toggle
      })
    }
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
    }, this.config.audioDelay)
  }

  onData(clientId, data) {
    switch(data.type) {
      case 'meta': this.onMeta(data); break
      case 'relay': this.onRelay(clientId, data); break
      default: this.trigger('data', data)
    }
  }

  setMeta(meta) {
    this.meta = meta
    this.broadcast({
      type: 'meta',
      meta: meta
    })
  }

  onMeta({ clientId, meta }) {
    this.connections[clientId].meta = meta
    this.trigger('meta', clientId, meta)
  }

  onRelay(clientId, { relayChain }) {

    if(this.relayChain.length > 0 || this.relayChain.filter(x => relayChain.includes(x)).length > 0) {
      this.kill(clientId)
      return
    }

    this.relayChain = relayChain

    this.relayChain.forEach(relayClientId => {
      if(this.connections[relayClientId]) {
        this.connections[relayClientId].disconnect()
        delete this.connections[relayClientId]
        this.connectionCount -= 1
      }
    })

    relayChain.push(clientId)

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

  getClientCount() {
    return Object.keys(this.connections).length
  }

  getClientStatus(clientId) {
    if(this.connections[clientId]) {
      return this.connections[clientId].status
    }
    return 'offline'
  }
}

export default Network
