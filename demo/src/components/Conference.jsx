
'use strict'

import React, {
  useState,
  useEffect,
  useRef
} from 'react'

import styles from '../assets/conference.css'

let mainClientId = null

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

function Conference({ children, session, clients }) {

  const localVideo = useRef(null)
  const remoteVideos = useRef({})
  const mainVideo = useRef(null)

  const [ isStreaming, toggleStreaming ] = useState(false)
  const [ enableVideo, toggleVideo ] = useState(true)
  const [ enableAudio, toggleAudio ] = useState(true)

  useEffect(() => {

    if(session) {

      session.on('stream', stream => {
        localVideo.current.srcObject = stream
      })

      session.on('disconnect', clientId => {
        if(mainClientId == clientId) {
          mainVideo.current.srcObject = null
          mainClientId = null
        }
      })

      session.on('audio', (clientId, stream) => {
        if(clientId != mainClientId) {
          mainVideo.current.srcObject = stream
          mainClientId = clientId
        }
      })

    }

  }, [ session ])

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

  const onChangeVideo = () => {
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
          <span className={styles.action}>
            <button className={enableVideo ? styles.videoOn : styles.videoOff} onClick={onChangeVideo} />
          </span>
          <span className={styles.action}>
            <button className={enableAudio ? styles.audioOn : styles.audioOff} onClick={onChangeAudio} />
          </span>
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
  )

}

export default Conference
