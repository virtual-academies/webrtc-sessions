
# Sessions

Pure JS WebRTC library for peer-to-peer (P2P) live streaming and data communication.

## WebRTC

[WebRTC](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API) (Web Real-Time Communication) is a technology which enables Web applications
and sites to capture and optionally stream audio and/or video media, as well as to exchange arbitrary data between browsers without requiring an
intermediary. The set of standards that comprise WebRTC makes it possible to share data and perform teleconferencing peer-to-peer, without requiring
that the user installs plug-ins or any other third-party software.

### Cross-platform shim

[WebRTC-Adaptor](https://github.com/webrtcHacks/adapter) is a shim used to insulate apps from spec changes and prefix differences.
In fact, the standards and protocols used for WebRTC implementations are highly stable, but there are a few notable differences across platforms
and browsers. For full interop information, see [webrtc.org/web-apis/interop](https://www.webrtc.org/web-apis/interop).

## Installation

### Web Socket

A web socket, or similar, full-duplex communication channel is required for WebRTC signaling.

[WebSocket.in](https://www.websocket.in/) provides an open and free WebSocket server for all.

## License

This package is licensed under Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0).

Full license text can be found [here](https://creativecommons.org/licenses/by-nc/4.0/).
