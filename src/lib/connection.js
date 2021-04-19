
'use strict'

/* eslint-disable-next-line no-unused-vars */
import webrtcAdaptor from 'webrtc-adapter'

import {
  log,
  getTime,
  attachAudioAnalyser,
  detachAudioAnalyser
} from './utils'

// https://www.w3.org/TR/webrtc/#peer-to-peer-data-example

class Connection {

  constructor(network, clientId, meta, type, timeStamp, config={}) {
    this.network = network
    this.clientId = clientId
    this.meta = meta
    this.type = type
    this.timeStamp = timeStamp
    this.status = 'new'
    this.connection = null
    this.channel = null
    this.stream = null
    this.localStream = null
    this.events = {}
    this.remoteCandidates = []
    this.localCandidates = []
    this.connectedAt = null
    this.audioContext = null
    this.audioLevel = 0
    this.negotiationNeeded = false
    this.streamAdded = false;
    this.configure(config)
    this.bindLog()
  }

  bindLog() {
    this.log = log.bind(this, this.network.config.debug)
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

  connect() {
    this.status = 'connecting'
    this.connection = new RTCPeerConnection(this.config)
    this.connection.clientId = this.clientId
    this.connection.onnegotiationneeded = this.onNegotiationNeeded.bind(this)
    this.connection.oniceconnectionstatechange = this.onIceConnectionStateChange.bind(this)
    this.connection.onicecandidate = this.onIceCandidate.bind(this)
    this.connection.onsignalingstatechange = this.onSignalingStateChange.bind(this)
    this.connection.ondatachannel = this.onDataChannel.bind(this)
    this.connection.ontrack = this.onTrack.bind(this)
    this.connection.onaddstream = this.onAddStream.bind(this)
    if(this.network.config.openDataChannel) this.openDataChannel()
    this.trigger('connect', this.clientId, this.meta)
  }

  disconnect() {

    this.log('disconnect', this.clientId)

    if(this.channel) {
      this.channel.close()
      this.channel = null
    }

    if(this.audioContext) {
      detachAudioAnalyser(this.clientId)
      this.audioContext = false
    }

    if(this.connection) {
      this.connection.onnegotiationneeded = null
      this.connection.oniceconnectionstatechange = null
      this.connection.onicecandidate = null
      this.connection.onsignalingstatechange = null
      this.connection.ondatachannel = null
      this.connection.ontrack = null
      this.connection.onaddstream = null
      this.connection.close()
      this.connection = null
    }

    this.status = 'closed'
    this.trigger('disconnect')
  }

  reconnect() {
    this.log('reconnect', this.clientId)

    this.disconnect()
    this.connect()

    if(this.network.stream) {
      this.addStream(this.network.stream)
    } else {
      this.onNegotiationNeeded()
    }
  }

  peer() {
    if(this.network.stream) {
      this.addStream(this.network.stream)
    } else {
      //this.onNegotiationNeeded()
    }
  }

  isStreaming() {
    return !!this.localStream && this.localStream.active
  }

  onNegotiationNeeded() {

    this.log('negotiation needed with', this.clientId)

    if(!this.connection || this.connection.signalingState != 'stable') {
      this.negotiationNeeded = true
      return
    }

    if(this.type === 'offer') {

      this.log('creating offer for', this.clientId)

      this.connection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        iceRestart: true
      }).then(offer => {
        if(this.connection) {
          this.log('setting local description for', this.clientId)
          this.connection.setLocalDescription(offer).then(() => {
            this.log('sending offer to', this.clientId)
            this.network.send({
              peerId: this.clientId,
              timeStamp: this.network.timeStamp,
              type: 'offer',
              sdp: offer
            })
          }).catch(e => {
            // local description doesn't match offer???
          })
        }
      })
    } else {
      this.network.send({
        peerId: this.clientId,
        timeStamp: this.network.timeStamp,
        meta: this.network.meta,
        type: 'peer'
      })
    }
  }

  // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/iceConnectionState
  onIceConnectionStateChange() {
    if(this.connection) {
      this.log('ice connection state changed to', this.connection.iceConnectionState, 'for', this.clientId)
      if(this.connection.iceConnectionState === 'connected') {
        this.status = 'connected'
      } else if(this.connection.iceConnectionState === 'disconnected') {
        // This is a less stringent test than "failed" and may trigger intermittently and resolve just as spontaneously
        this.onNegotiationNeeded()
      } else if(this.connection.iceConnectionState === 'checking') {
        // The ICE agent has been given one or more remote candidates and is checking pairs of local and remote candidates against one another to try to find a compatible match
      } else if(this.connection.iceConnectionState === 'failed') {
        this.reconnect()
      }
    }
  }

  onIceCandidate(event) {
    if(event.candidate) {
      this.sendCandidate(event.candidate)
    }
  }

  onSignalingStateChange() {

    this.log('signaling state changed to', this.connection.signalingState, 'for', this.clientId)

    if(!this.localStream) {
      this.addStream(this.network.stream, true)
    }

    if(this.connection.signalingState === 'stable') {
      this.sendCandidates()
      this.addCandidates()
      if(this.negotiationNeeded) {
        this.negotiationNeeded = false
        this.addStream(this.network.stream)
        this.onNegotiationNeeded()
      }
    } else if(this.connection.signalingState === 'have-remote-offer') {
      this.addStream(this.network.stream)
    } else if(this.connection.signalingState === 'closed') {
      this.disconnect()
    }
  }

  offer(sdp) {
    if(!this.connection) {
      this.connect()
    }

    if(this.connection.signalingState != 'stable') return

    this.connection.setRemoteDescription(new RTCSessionDescription(sdp)).then(() => {
      this.log('creating answer for', this.clientId)

      this.connection.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        iceRestart: true
      }).then(answer => {
        this.log('setting local description for', this.clientId)
        this.connection.setLocalDescription(answer).then(() => {
          this.log('sending answer to', this.clientId)
          this.network.send({
            peerId: this.clientId,
            type: 'answer',
            sdp: answer
          })
        }).catch(err => {
          // Failed to execute 'setLocalDescription' on 'RTCPeerConnection': Failed to set local answer sdp: Called in wrong state: kStable
        })
      }).catch(err => {
        // PeerConnection cannot create an answer in a state other than have-remote-offer or have-local-pranswer.
      })
    }).catch(err => {
      this.log('error in processing remote offer:', err.message)
      //this.connection.setRemoteDescription({ type: 'rollback' })
    })
  }

  answer(sdp) {
    if(this.connection) {
      this.connection.setRemoteDescription(new RTCSessionDescription(sdp)).catch(err => {
        this.log('error in processing remote answer:', err.message)
        //this.connection.setRemoteDescription({ type: 'rollback' })
      })
    }
  }

  ice(candidate) {
    if(candidate && this.connection) {
      if(this.connection.signalingState === 'stable') {
        this.connection.addIceCandidate(candidate).catch(err => {
          this.remoteCandidates.push(candidate)
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
    if(this.isStable()) {
      this.network.send({
        peerId: this.clientId,
        candidate: candidate,
        type: 'ice'
      })
    } else {
      this.localCandidates.push(candidate)
    }
  }

  sendCandidates() {
    this.localCandidates.splice(0).forEach(candidate => {
      this.sendCandidate(candidate)
    })
  }

  onTrack(event) {
    this.log('received track from', this.clientId)

    if(event.transceiver) {
      if(this.stream && this.stream.getTracks().length < 2) {
        this.stream.addTrack(event.transceiver.receiver.track)
      } else {
        this.stream = new MediaStream([ event.transceiver.receiver.track ])
        //event.transceiver.receiver.track.onended = this.removeStream.bind(this)
      }
    } else if(event.streams.length > 0) {
      this.stream = event.streams[0]
    }

    this.stream.onremovetrack = this.removeStream.bind(this)
    if(this.network.config.trackAudio && !this.audioContext) {
      this.audioContext = attachAudioAnalyser(this.connection, this.stream, 1000, audioLevel => {
        this.audioLevel = (this.audioLevel+audioLevel)/2
      })
    }

    this.trigger('stream', this.clientId)
  }

  onAddStream(event) {
    this.log('received stream from', this.clientId)

    if(!this.stream) {
      this.stream = event.stream
      //this.stream.onremovetrack = this.removeStream.bind(this)
      if(this.network.config.trackAudio && !this.audioContext) {
        this.audioContext = attachAudioAnalyser(this.connection, this.stream, 1000, audioLevel => {
          this.audioLevel = (this.audioLevel+audioLevel)/2
        })
      }
      this.trigger('stream', this.clientId)
    }
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
    this.status = 'open'
    this.connectedAt = getTime()
    this.trigger('open', this.clientId)
  }

  onMessage(event) {
    const data = JSON.parse(event.data)
    this.trigger('data', this.clientId, data)
  }

  onError(err) {
    // this.log('connection error', err)
    // transport can drop for unused dataChannel
  }

  onClose() {
    this.reconnect()
  }

  send(data) {
    if(this.status === 'open') {
      if(this.channel.readyState === 'open') {
        this.channel.send(JSON.stringify(data))
      }
    }
  }

  getTransceiverKind(t) {
    // Per spec only there can only be two kinds "video" & "audio"
    // usage of booleans are misleading
    return t.sender && t.sender.track ? t.sender.track.kind : null
  }

  addStream(stream, force) {
    const hasOffer = this.type === 'offer' || this.connection.signalingState === 'have-remote-offer'
    this.log('attemping to add stream to connection with', this.clientId)
    if(stream && (force || hasOffer)) {
      this.log('adding stream to connection with', this.clientId)

      this.streamAdded = true;

      this.clearStream()
      this.localStream = stream

      if(this.connection) {
        if(this.connection.addTrack) {
          let transceivers = this.connection.getTransceivers()
          this.localStream.getTracks().forEach(track => {
            // TODO: Compartmentalize
            // I refactored this for loop but I'm unsure how to test all branches
            for(let transceiver of transceivers){
              if(this.getTransceiverKind(transceiver) === track.kind) {
                if(!transceiver.sender) {
                  transceiver.direction = 'sendrecv'
                  transceiver.sender.replaceTrack(track)
                }
                return
              }
            }

            this.connection.addTrack(track)
          })
        } else if(this.connection.addStream) {
          this.connection.addStream(this.localStream)
        }
      }
    } else if(stream && (this.status === 'connected' || this.connection.signalingState === 'new')) {
      this.addStream(stream, true)
    } else if(!stream) {
      this.clearStream()
    }
  }

  removeStream() {
    if(this.stream) {
      this.log('removing stream from', this.clientId)
      if(this.audioContext) {
        detachAudioAnalyser(this.clientId)
        this.audioContext = false
      }
      this.stream.getTracks().forEach(track => track.stop())
      this.stream.onremovetrack = null
      this.stream = null
      this.trigger('stream', this.clientId)
    }
  }

  clearStream() {
    if(this.connection){
      if(this.connection.getSenders) {
        this.connection.getSenders().forEach(sender => {
          this.connection.removeTrack(sender)
        })
      } else if(this.connection.removeStream) {
        this.connection.removeStream(this.network.stream)
      }
    }
    this.localStream = null
  }

  isStable() {
    if(this.connection) {
      return this.connection.signalingState === 'stable'
    }
    return false
  }

}

export default Connection
