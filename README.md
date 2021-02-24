
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

## License

This package is licensed under Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0).<br/>
Full license text can be found [here](https://creativecommons.org/licenses/by-nc/4.0/).

