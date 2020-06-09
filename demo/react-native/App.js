/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import 'react-native-get-random-values'
import { v4 as uuidv4 } from 'uuid'

/* eslint-disable-next-line no-unused-vars */
// import webrtcAdaptor from 'webrtc-adapter'

import Session from 'webrtc-sessions'

import React, { Fragment, useState, useReducer, useEffect } from 'react'
import { StyleSheet, View, StatusBar, Button, Dimensions } from 'react-native'
import { Colors } from 'react-native/Libraries/NewAppScreen'
import { RTCView, mediaDevices } from 'react-native-webrtc'

import Icon from './src/components/Icon'

let session = null
let socket = null
let mainClientId = null

const clientsReducer = (clients, action) => {
  const index = clients.findIndex(val => val.clientId == action.clientId)
  if(action.type == 'add' && index < 0) {
    clients.push({ clientId: action.clientId, username: action.username })
  } else if(action.type == 'stream' && index >= 0) {
    clients[index].stream = action.stream
  } else if(action.type == 'username' && index >= 0) {
    clients[index].username = action.username
  } else if(action.type == 'remove') {
    clients.splice(clients.findIndex(val => val.clientId == action.clientId), 1)
  }
  return [ ...clients ]
}

const App = () => {

  const [ stream, setStream ] = useState(null)
  const [ isStreaming, toggleStreaming ] = useState(false)
  const [ clients, dispatch ] = useReducer(clientsReducer, [])

  useEffect(() => {

    session.getClients().forEach(client => {
      dispatch({ type: 'add', ...client })
    })

    session.on('connect', (clientId, meta) => {
      dispatch({ type: 'add', clientId, username: meta.username })
    })

    session.on('disconnect', clientId => {
      dispatch({ type: 'remove', clientId })
    })

    session.on('remote', (clientId, stream) => {
      dispatch({ type: 'stream', clientId, stream })
    })

    session.on('meta', (clientId, meta) => {
      dispatch({ type: 'username', clientId, username: meta.username })
    })

    session.on('stream', stream => {
      setStream(stream)
    })

    socket = new WebSocket('ws://192.168.0.103:8080') // Use local IP on device
    // socket = new WebSocket('ws://10.0.2.2:8080') // Use host IP on emulator

    const { onOpen, onError, onMessage, onClose } = session.connect(message => {
      socket.send(message)
    })

    socket.onopen = () => {
      onOpen()
    }

    socket.onmessage = message => {
      onMessage(message.data)
    }

    socket.onerror = (e) => {
      onError(e)
    }

    socket.onclose = (e) => {
      onClose(e)
    }

    return () => {
      socket.close()
      session.disconnect()
    }

  }, [])

  const toggleStream = () => {
    if (!isStreaming) {

      let isFront = true
      mediaDevices.enumerateDevices().then(sourceInfos => {
        let videoSourceId
        for (let i = 0; i < sourceInfos.length; i++) {
          const sourceInfo = sourceInfos[i]
          if(sourceInfo.kind == "videoinput" && sourceInfo.facing == (isFront ? "front" : "environment")) {
            videoSourceId = sourceInfo.deviceId
          }
        }
        mediaDevices.getUserMedia({
          audio: true,
          video: {
            mandatory: {
              minWidth: 500, // Provide your own width, height and frame rate here
              minHeight: 300,
              minFrameRate: 30
            },
            facingMode: (isFront ? "user" : "environment"),
            optional: (videoSourceId ? [{sourceId: videoSourceId}] : [])
          }
        }).then(localStream => {
          session.setStream(localStream)
        }).catch(error => {
          console.log(error)
        })
      })

      toggleStreaming(true)

    } else {
      session.stopStreaming()
      toggleStreaming(false)
      setStream(null)
    }
  }

  if(!session) {
    session = new Session(uuidv4())
  }

  const RTCViewStyle = Object.assign({}, styles.RTCView, {
    height: (Dimensions.get('window').width/4)*3,
    width: Dimensions.get('window').width
  })


  if(clients.length > 4) {
    RTCViewStyle.height = RTCViewStyle.height/2
    RTCViewStyle.width = RTCViewStyle.width/2
  } else if(clients.length > 2) {
    RTCViewStyle.width = RTCViewStyle.width/2
  }

  return (
    <Fragment>
      <StatusBar barStyle="dark-content" />
      <View style={styles.Container}>
        { clients.map((client, index) => {
          if(client.stream) {
            return (
              <RTCView key={client.clientId} streamURL={client.stream.toURL()} zOrder={1} objectFit={'cover'} style={RTCViewStyle} />
            )
          }
        })}
        { stream &&
          <RTCView streamURL={stream.toURL()} zOrder={10} objectFit={'cover'} style={styles.RTCViewLocal} />
        }
        <View style={styles.ActionButtons}>
          <Icon icon={'join'} title={'join'} width={32} height={32} onPress={toggleStream} style={styles.ToggleStreamButton} />
        </View>
      </View>
    </Fragment>
  )
}

const styles = StyleSheet.create({
  Container: {
    flex: 1,
    flexWrap: 'wrap',
    backgroundColor: Colors.dark
  },
  RTCView: {
    elevation: 1,
    zIndex: 1,
    backgroundColor: Colors.light
  },
  RTCViewLocal: {
    position: 'absolute',
    width: 150,
    height: 150,
    top: 20,
    right: 20,
    elevation: 10,
    zIndex: 10,
    backgroundColor: Colors.dark
  },
  ActionButtons: {
    position: 'absolute',
    flex: 1,
    bottom: 20,
    left: 20,
    elevation: 10,
    zIndex: 10,
  },
  ToggleStreamButton: {
    height: 25,
    width: 25,
    padding: 5,
    backgroundColor: Colors.lighter,
  },
  ToggleStreamButtonImage: {
    height: 15,
    width: 15,
  }
})

export default App
