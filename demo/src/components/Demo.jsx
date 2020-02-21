
'use strict'

import uuid from 'uuid'

import React, {
  Fragment,
  useState,
  useEffect,
  useReducer,
  useRef
} from 'react'

import Session from '../../../src'
import Loader from './Loader'

import { ACCESS_TOKEN } from '../config'

import styles from '../assets/index.css'

let session = null
let socket = null
let mainClientId = null

const clientsReducer = (clients, action) => {
  if(action.type == 'add') {
    if(!clients.includes(action.clientId)) {
      clients.push({ clientId: action.clientId })
    }
  } else if(action.type == 'update') {
    const index = clients.findIndex(val => val.clientId == action.clientId)
    if(index >= 0) clients[index].stream = action.stream
  } else if(action.type == 'remove') {
    clients.splice(clients.findIndex(val => val.clientId == action.clientId), 1)
  }
  return [ ...clients ]
}

function Video({ stream }) {

  const video = useRef(null)

  useEffect(() => {
    video.current.srcObject = stream
  }, [ stream ])

  return (
    <div className={styles.remote}>
      <video
        ref={video}
        playsInline
        autoPlay
        muted
      />
    </div>
  )
}

function Demo({ children }) {

  const localVideo = useRef(null)
  const remoteVideos = useRef({})
  const mainVideo = useRef(null)

  const [ loaded, setLoaded ] = useState(false)
  const [ isStreaming, toggleStreaming ] = useState(false)
  const [ enableVideo, toggleVideo ] = useState(true)
  const [ enableAudio, toggleAudio ] = useState(true)
  const [ clients, dispatch ] = useReducer(clientsReducer, [])

  useEffect(() => {

    const id = uuid()
    session = new Session(id)

    session.on('stream', stream => {
      localVideo.current.srcObject = stream
    })

    session.on('connect', clientId => {
      dispatch({ type: 'add', clientId })
    })

    session.on('disconnect', clientId => {
      if(mainClientId == clientId) {
        mainVideo.current.srcObject = null
        mainClientId = null
      }
      dispatch({ type: 'remove', clientId })
    })

    session.on('remote', (clientId, stream) => {
      dispatch({ type: 'update', clientId, stream })
    })

    session.on('audio', (clientId, stream) => {
      if(clientId != mainClientId) {
        mainVideo.current.srcObject = stream
        mainClientId = clientId
      }
    })

    // const CHANNEL_ID = 1 // positive integer between 1-10000.
    // socket = new WebSocket('wss://connect.websocket.in/v2/'+CHANNEL_ID+'?token='+ACCESS_TOKEN)
    socket = new WebSocket('ws://localhost:8080')

    const { onOpen, onError, onMessage, onClose } = session.connect(message => {
      socket.send(message)
    })

    socket.addEventListener('open', () => {
      setLoaded(true)
      onOpen()
    })

    socket.addEventListener('message', onMessage)
    socket.addEventListener('error', onError)
    socket.addEventListener('close', onClose)

    return () => {
      socket.close()
      session.disconnect()
      setLoaded(false)
    }

  }, [])

  const toggleStream = () => {
    if (!isStreaming) {
      session.startStreaming(enableVideo, enableAudio)
      toggleStreaming(true)
    } else {
      localVideo.current.srcObject = null
      session.stopStreaming()
      toggleStreaming(false)
    }
  }

  const onChangeVideo = event => {
    if (isStreaming) {
      session.toggleVideo(!enableVideo)
    }
    toggleVideo(!enableVideo)
  }

  const onChangeAudio = () => {
    if (isStreaming) {
      session.toggleAudio(!enableAudio)
    }
    toggleAudio(!enableAudio)
  }

  return (
    <Loader loading={!loaded}>
      <div className={styles.container}>
        <div className={styles.main}>
          <div className={styles.screen}>
            <video
              ref={mainVideo}
              playsInline
              autoPlay
              muted
            />
          </div>
          <div className={styles.actions}>
            <span className={styles.action}>
              <button className={isStreaming ? styles.leave : styles.join} onClick={toggleStream} />
            </span>
            { isStreaming &&
              <Fragment>
                <span className={styles.action}>
                  <button className={enableVideo ? styles.videoOn : styles.videoOff} onClick={onChangeVideo} />
                </span>
                <span className={styles.action}>
                  <button className={enableAudio ? styles.audioOn : styles.audioOff} onClick={onChangeAudio} />
                </span>
              </Fragment>
            }
          </div>
        </div>
        <div className={styles.remotes}>
          { clients.map((client, index) => {
            if(client.stream) {
              return (
                <Video key={client.clientId} stream={client.stream} />
              )
            }
          })}
        </div>
        <div className={styles.local}>
          <video
            ref={localVideo}
            playsInline
            autoPlay
            muted
          />
        </div>
      </div>
    </Loader>
  )

}

export default Demo
