
'use strict'

class Connection {

  constructor(network, clientId, type, timeStamp, config={}) {
    this.network = network
    this.clientId = clientId
    this.type = type
    this.timeStamp = timeStamp
    this.status = 'closed'
    this.connection = null
    this.channel = null
    this.events = {}
    this.remoteCandidates = []
    this.localCandidates = []
    this.connectedAt = null
    this.stream = null
    this.signalingState = null
    this.audioLevel = 0
    this.reconnectTimeout = null
    this.reconnectDelay = 5000
    this.reconnectCount = 0
    this.reconnectLimit = 3
    this.configure(config)
  }

  configure(config) {
    this.config = Object.assign({
      iceServers: [{
        urls: ['stun:stun.l.google.com:19302']
      }],
      iceTransportPolicy: 'all',
      bundlePolicy: 'balanced',
      iceCandidatePoolSize: 0,
      sdpSemantics: 'unified-plan',
      rtcpMuxPolicy: 'require'
    }, config)
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

  offer(sdp) {
    if (this.connection) {
      this.connection.setRemoteDescription(new RTCSessionDescription(sdp)).then(() => {
        log('creating answer for', this.clientId)
        this.connection.createAnswer().then(answer => {
          log('setting local description for', this.clientId)
          this.connection.setLocalDescription(answer).then(() => {
            log('sending answer to', this.clientId)
            this.network.send(this.clientId, {
              type: 'answer',
              sdp: answer
            })
          })
        })
      }).catch(err => {
        this.reconnect()
      })
    } else {
      this.connect()
    }
  }

  answer(sdp) {
    this.connection.setRemoteDescription(new RTCSessionDescription(sdp)).catch(err => {
      this.reconnect()
    })
  }

  ice(candidate) {
    if (candidate && this.connection) {
      if (this.connection.signalingState == 'stable') {
        this.connection.addIceCandidate(candidate).catch(err => {
          // ignore this error, the connection is closed
        })
      } else {
        this.remoteCandidates.push(candidate)
      }
    }
  }

  addCandidates() {
    this.remoteCandidates.forEach(candidate => {
      this.connection.addIceCandidate(candidate).catch(err => {
        // ignore this error, the connection is closed
      })
    })
  }

  sendCandidate(candidate) {
    if (this.isStable()) {
      this.network.send(this.clientId, {
        candidate: candidate,
        type: 'ice'
      })
    } else {
      this.localCandidates.push(candidate)
    }
  }

  sendCandidates() {
    this.localCandidates.forEach(candidate => {
      this.sendCandidate(candidate)
    })
  }

  connect() {
    clearTimeout(this.reconnectTimeout)
    this.status = 'connecting'
    this.connection = new RTCPeerConnection(this.config)
    this.connection.onnegotiationneeded = this.onNegotiationNeeded.bind(this)
    this.connection.oniceconnectionstatechange = this.onIceConnectionStateChange.bind(this)
    this.connection.onicecandidate = this.onIceCandidate.bind(this)
    this.connection.onsignalingstatechange = this.onSignalingStateChange.bind(this)
    this.connection.ondatachannel = this.onDataChannel.bind(this)
    this.connection.ontrack = this.onTrack.bind(this)
  }

  disconnect() {
    clearTimeout(this.reconnectTimeout)
    if (this.channel) this.channel.close()
    if (this.connection) this.connection.close()
    // this.localStream.getTracks().forEach(track => track.stop())
    this.processEvent('close')
  }

  reconnect() {
    if (this.reconnectCount <= this.reconnectLimit) {
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectCount += 1
        this.disconnect()
        this.connect()
      }, this.reconnectDelay)
    } else {
      this.processEvent('fail')
    }
  }

  onNegotiationNeeded() {
    if (this.type == 'offer') {
      log('creating offer for', this.clientId)
      this.connection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        iceRestart: true
      }).then(offer => {
        if (this.connection) {
          log('setting local description for', this.clientId)
          this.connection.setLocalDescription(offer).then(() => {
            log('sending offer to', this.clientId)
            this.network.send(this.clientId, {
              timeStamp: this.network.timeStamp,
              type: 'offer',
              sdp: offer
            })
          })
        }
      })
    }
  }

  onIceConnectionStateChange() {
    if (this.connection) {
      clearTimeout(this.reconnectTimeout)
      log('ice connection state changed to', this.connection.iceConnectionState, 'for', this.clientId)
      if (this.connection.iceConnectionState === 'connected') {
        this.status = 'connected'
      } else if (this.connection.iceConnectionState === 'disconnected') {
        this.disconnect()
      } else if (this.connection.iceConnectionState === 'checking') {
        this.reconnect()
      }
    }
  }

  onIceCandidate(event) {
    if (event.candidate) {
      this.sendCandidate(event.candidate)
    }
  }

  onSignalingStateChange() {
    log('signaling state changed to', this.connection.signalingState, 'for', this.clientId)
    clearTimeout(this.reconnectTimeout)
    if (this.connection.signalingState == 'stable') {
      this.sendCandidates()
      this.addCandidates()
    } else if (this.connection.signalingState == 'closed') {
      if(this.signalingState == 'stable') {
        setTimeout(() => {
          this.reconnect()
        }, 500)
      }
    }
    this.signalingState = this.connection.signalingState
  }

  startStreaming(audio=true, video=true) {
    navigator.mediaDevices.getUserMedia(mediaOptions).then(stream => {
      this.stream = stream
    }).catch(err => {
    })
  }

  onTrack(event) {
    /*srcObject = event.streams[0]
    attachAudioAnalyser(event.streams[0], (audioLevel) => {
      this.audioLevel = audioLevel
    })*/
  }

  openDataChannel() {
    this.channel = this.connection.createDataChannel(this.clientId, {
      maxPacketLifeTime: 3000, // in milliseconds
      ordered: true
    })
    this.channel.onopen = this.onOpen.bind(this)
  }

  onDataChannel(event) {
    event.channel.onmessage = this.onMessage.bind(this)
    event.channel.onerror = this.onError.bind(this)
    event.channel.onclose = this.onClose.bind(this)
  }

  onOpen() {
    clearTimeout(this.reconnectTimeout)
    this.status = 'open'
    this.connectedAt = getTime()
    this.processEvent('open')
  }

  onMessage(event) {
    const data = JSON.parse(event.data)
    this.processEvent(data.type, data)
  }

  onError(err) {
    throw new Error(err)
  }

  onClose() {
    this.reconnectCount = 0
    this.connection = null
    this.channel = null
    this.status = 'closed'
  }

  send(data) {
    if (this.status == 'ready') {
      if (this.channel.readyState == 'open') {
        this.channel.send(JSON.stringify(data))
      }
    }
  }

  isStable() {
    if (this.connection) {
      return this.connection.signalingState == 'stable'
    }
    return false
  }

}