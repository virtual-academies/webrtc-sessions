
'use strict'

import Connection from './connection'
import { log, getTime } from './utils'

class Network {

  constructor(clientId, meta={}, config={}) {
    this.clientId = clientId
    this.meta = meta || {}
    this.timeStamp = getTime()
    this.connected = false
    this.sendCallback = null
    this.stream = null
    this.events = {}
    this.connections = {}
    this.audioTimeout = null
    this.desktopId = null
    this.configure(config)
    this.bindUnload()
    this.bindLog()
    this.log('session started as', clientId)
  }

  configure(config) {
    this.config = Object.assign({
      connection: {},
      audioDelay: 3000,
      openDataChannel: false,
      trackAudio: true,
      forceOffer: false,
      forceAnswer: false,
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
    })
    clearTimeout(this.audioTimeout)
    this.connected = false
    this.stream = null
    this.timeStamp = null
    this.events = {}
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

  open(clientId, meta, timeStamp) {
    if((this.config.forceOffer && !this.config.forceAnswer) ||
      (!this.config.forceOffer && !this.config.forceAnswer && clientId > this.clientId)) {
      this.openConnection(clientId, meta, 'offer', timeStamp)
    } else {
      this.openConnection(clientId, meta, 'answer', timeStamp)
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
    } else {
      this.connections[clientId].peer()
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

  detach({ clientId }) {
    if(this.connections[clientId]) {
      this.connections[clientId].disconnect()
    }
  }

  openConnection(clientId, meta, type, timeStamp) {
    if(this.connections[clientId]) {
      this.connections[clientId].reconnect()
    } else {
      this.log('opening to', type, clientId)
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
    this.log('connected to', clientId, meta)
    if(this.stream) this.connections[clientId].addStream(this.stream)
    this.trigger('connect', clientId, meta)
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
    this.trigger('inactive')
  }

  startStreaming(video=true, audio=true) {
    if(!this.connected) {
      this.reconnect()
    }
    navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    }).then(stream => {
      this.setStream(stream, video, audio)
    }).catch(err => {
      this.log('error in startStreaming', err.message)
    })
  }

  /*
  if (navigator.getDisplayMedia) {
    return navigator.getDisplayMedia({video: true});
  } else if (navigator.mediaDevices.getDisplayMedia) {
    return navigator.mediaDevices.getDisplayMedia({video: true});
  } else {
    return navigator.mediaDevices.getUserMedia({video: {mediaSource: 'screen'}});
  }
  */

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
        if(this.stream) {
          this.stream.getVideoTracks().forEach(track => track.stop())
          this.stream.getAudioTracks().forEach(track => {
            stream.addTrack(track)
          })
        }

        stream.oninactive = this.onInactive.bind(this)
        this.setStream(stream, true, true)
      }
    }).catch(err => {
      this.onInactive()
    })
  }

  /*startRecording() {

  }*/

  setStream(stream, video=true, audio=true) {

    this.stream = stream
    if(!video) this.toggleVideo()
    if(!audio) this.toggleAudio()

    Object.keys(this.connections).forEach(clientId => {
      if(this.connections[clientId]) {
        this.connections[clientId].addStream(this.stream, true)
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

  getClientStatus(clientId) {
    if(this.connections[clientId]) {
      return this.connections[clientId].status
    }
    return 'offline'
  }
}

export default Network
