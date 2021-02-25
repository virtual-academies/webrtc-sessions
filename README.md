
# WebRTC Sessions

Pure JS WebRTC library for peer-to-peer (P2P) live streaming and data communication.

*NB: Sessions is still under development!*

## WebRTC

[WebRTC](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API) (Web Real-Time Communication) is a technology which enables Web applications
and sites to capture and optionally stream audio and/or video media, as well as to exchange arbitrary data between browsers without requiring an
intermediary. The set of standards that comprise WebRTC makes it possible to share data and perform teleconferencing peer-to-peer, without requiring
that the user installs plug-ins or any other third-party software.

### Cross-platform

[WebRTC-Adaptor](https://github.com/webrtcHacks/adapter) is a shim used to insulate apps from spec changes and prefix differences.
In fact, the standards and protocols used for WebRTC implementations are highly stable, but there are a few notable differences across platforms
and browsers. For full interop information, see [webrtc.org/web-apis/interop](https://www.webrtc.org/web-apis/interop).

### Web Socket

A web socket, or similar, full-duplex communication channel is required for WebRTC signaling.

A simple [NodeJS Express WebSocket Server](https://github.com/renevatium/websocket) can be used to run the demos or for testing purposes; or<br/>
[WebSocket.in](https://www.websocket.in/) provides an open and free WebSocket service; or<br />
Any full-duplex communication channel, such as AWS IoT or Google Firebase.

### STUN/TURN Servers

A STUN/TURN server is used for NAT traversal in VoIP. Whether you're at home behind a common router, at work behind an enterprise firewall, or traveling, chances are that you will be behind a NAT which must be traversed before making calls.

[Numb](https://numb.viagenie.ca/) is a free STUN/TURN service by Viagénie.<br />
[Google](stun:stun.l.google.com:19302) also offers a free STUN service.

Alternatively, [Coturn](https://github.com/coturn/coturn) is a free, open-source TURN server.

## Installation

```
$ npm install --save webrtc-sessions
```

## Running the Demos

#### React

The React demo imports directly from the library source to enable quicker development and global linting.

```
$ git clone git@github.com:renevatium/webrtc-sessions.git
$ cd ./webrtc-sessions
$ npm install
$ npm start
```

### React Native

Still under development.

## Documentation

### Folder structure

```
demo/
  react/           // react demo
  react-native/    // react-native demo
src/
  lib/
    connection.js  // peerconnection management
    network.js     // core signaling and connection management
    utils.js       // general utility functions
  index.js // only for easy loading, passes on the network.js default export
```

### Order of Events

WebRTC requires a complex exchange of session (SDP) and stream description (ICE) data. This process is synchronous.

```
User1: session started
User2: session started
User1: received join
User1: opening to offer
User2: received peer
User2: opening to answer
User1: connected to User2
User1: negotiation needed with User2
User2: connected to User1
User2: negotiation needed with User1
User1: creating offer
User1: setting local description
User1: signaling state changed to have-local-offer
User1: add stream to connection with User2
User1: sending offer to User2
User1: received peer
User2: received offer
User2: signaling state changed to have-remote-offer
User2: creating answer
User2: setting local description
User2: signaling state changed to stable
User2: add stream to connection with User1
User2: sending answer to User1
User1: received answer
User1: received ice
User2: received ice
User1: signaling state changed to stable
User1: ice connection state changed to checking
User1: ice connection state changed to connected
User2: ice connection state changed to checking
User2: ice connection state changed to connected
```

### Session

```
import Session from 'webrtc-sessions'

session = new Session(USERID, { username: USERNAME }, {
  connection: {
    iceServers: [{
      urls: [TURN_ENDPOINT],
      username: TURN_USERNAME,
      credential: TURN_PASSWORD
    },{
      urls: ['stun:stun.l.google.com:19302']
    }],
    iceTransportPolicy: 'all'
  },
  openDataChannel: true,
  trackAudio: true,
  audioDelay: 2000,
  debug: true
})

session.on('connect', (clientId, meta) => {
  // new remote peer
})

session.on('stream', stream => {
  // process local stream
})

session.on('remote', stream => {
  // process remote stream
})

session.on('audio', (clientId, stream) => {
  // process new main speaker
})

session.startStreaming(bool:enableVideo, bool:enableAudio) // Start streaming locally
session.toggleVideo(bool:enableVideo) // Toggle local video on/off
session.toggleAudio(bool:enableVideo) // Toggle local audio on/off
session.stopStreaming() // Stops streaming and close peerConnection

session.startSharing() // Opens sharing dialog
session.stopSharing() // Closes share and reverts to local stream
```

#### Config Options

| Key             | Default | Description |
| --------------- | ------- | ----------- |
| connection      | {}      | See connection config options below
| openDataChannel | false   | Toggle opening a dataChannel on the PeerConnection
| trackAudio      | true    | Toggle tracking speaker based on volume
| audioDelay      | 3000    | How often to switch speaker based on average volume
| forceOffer      | false   | Forces offer state (for one-way broadcast streaming)
| forceAnswer     | false   | Forces offer state (for one-way broadcast consumption)
| debug           | false   | Toggle debug messages

##### Connection Config Options

| Key                  | Default                                      | Description                                 |
| -------------------- | -------------------------------------------- | ------------------------------------------- |
| iceServers           | [{ urls: ['stun:stun.l.google.com:19302'] }] | ICE server configuration                    |
| iceTransportPolicy   | 'all'                                        | ICE transport policy                        |
| bundlePolicy         | 'balanced'                                   | Bundle policy                               |
| iceCandidatePoolSize | 0                                            | ICE candidate pool size                     |
| sdpSemantics         | 'unified-plan'                               | Session Descriptor Protocol (SDP) semantics |
| rtcpMuxPolicy        | 'require'                                    | RTCP mux policy                             |

### Events

```
session.on('[EVENT]', (...) => {
  // logic
})
```

| Event      | Description | Args |
| ---------- | ----------- | ---- |
| ready      | on open connection to remote peer | clientId |
| connect    | on connection with remote peer | clientId, meta{ username, ... } |
| fail       | unrecoverable failure (error) on remote peer connection | clientId |
| disconnect | remote peer disconnects | { clientId } |
| stream     | local stream is available | stream |
| inactive   | on ending of local stream (without disconnect) ||
| remote     | remote stream is available | clientId, stream |
| audio      | on changes in remote stream audio analysis (who is speaking) | clientId, stream |
| data       | data channel message from remote peer | clientId, message |
| meta       | meta data (e.g. username) available for remote peer | clientId, meta |

#### Custom Event Examples

| Event      | Description | Args |
| ---------- | ----------- | ---- |
| share      | remote sharescreen stream is available | clientId, stream |
| video      | remote peer has toggled their video track | data{ clientId, state } |
| sound      | remote peer has toggled their audio track | data{ clientId, state } |

clientId refers to the ID designated to each remote peer

## License

This package is licensed under Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0).<br/>
Full license text can be found [here](https://creativecommons.org/licenses/by-nc/4.0/).

