/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import 'react-native-get-random-values'
import { v4 as uuidv4 } from 'uuid'

import React, { Fragment, useState, useReducer, useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import { Colors } from 'react-native/Libraries/NewAppScreen'
import { RTCView, mediaDevices } from 'react-native-webrtc'

import Session from 'webrtc-sessions'

const styles = StyleSheet.create({
  container: {
    flexBasis: '100%'
  },
  RTCView: {
    backgroundColor: Colors.PRIMARY_COLOR,
    flex: 1
  }
})

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

    session.on('stream', stream => {
      setStream(stream)
    })

    session.on('remote', (clientId, stream) => {
      //dispatch({ type: 'stream', clientId, stream })
    })

    session.on('meta', (clientId, meta) => {
      dispatch({ type: 'username', clientId, username: meta.username })
    })

    socket = new WebSocket('ws://10.0.2.2:8080')

    const { onOpen, onError, onMessage, onClose } = session.connect(message => {
      socket.send(message)
    })

    socket.onopen = () => {
      onOpen()
    }

    socket.onmessage = message => {
      onMessage(message.data)
    }

    socket.onerror = onError
    socket.onclose = onClose

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

    return () => {
      socket.close()
      session.disconnect()
    }

  }, [])

  if(!session) {
    session = new Session(uuidv4())
  }

  return (
    <View style={styles.container}>
      { stream &&
        <RTCView streamURL={stream.toURL()} style={styles.RTCView} />
      }
    </View>
  )
}

export default App
