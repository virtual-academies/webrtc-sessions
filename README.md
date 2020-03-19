
# Sessions

Pure JS WebRTC library for peer-to-peer (P2P) live streaming and data communication.

*NB: Sessions is still under development!*

## WebRTC

[WebRTC](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API) (Web Real-Time Communication) is a technology which enables Web applications
and sites to capture and optionally stream audio and/or video media, as well as to exchange arbitrary data between browsers without requiring an
intermediary. The set of standards that comprise WebRTC makes it possible to share data and perform teleconferencing peer-to-peer, without requiring
that the user installs plug-ins or any other third-party software.

### Cross-platform shim

[WebRTC-Adaptor](https://github.com/webrtcHacks/adapter) is a shim used to insulate apps from spec changes and prefix differences.
In fact, the standards and protocols used for WebRTC implementations are highly stable, but there are a few notable differences across platforms
and browsers. For full interop information, see [webrtc.org/web-apis/interop](https://www.webrtc.org/web-apis/interop).

### Web Socket

A web socket, or similar, full-duplex communication channel is required for WebRTC signaling.

A simple [NodeJS Express WebSocket Server](https://github.com/renevatium/websocket) can be used to run the demos or for testing purposes; or<br/>
[WebSocket.in](https://www.websocket.in/) provides an open and free WebSocket service; or<br />
Any full-duplex communication channel, such as AWS IoT or Google Firebase.

## Installation

```
$ npm install --save sessions
```

## Running the Demos

#### React

The React demo imports directly from the library source to enable quicker development and global linting.

```
$ git clone git@github.com:renevatium/sessions.git
$ cd ./sessions
$ npm install
$ npm start
```

### React Native

Still under development.

## License

This package is licensed under Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0).<br/>
Full license text can be found [here](https://creativecommons.org/licenses/by-nc/4.0/).
