
'use strict'

import classNames from 'classnames'

import React, {
  useState,
  useEffect,
  useRef
} from 'react'

import { attachAudioAnalyser } from '../../../../src'

import Peers from './Peers'

import styles from '../assets/conference.css'

let mainClientId = null
let amIStreaming = false
let amISharing = false

function Video({ id, stream, video, sound }) {

  const videoRef = useRef(null)
  const audioRef = useRef(null)

  let context2d = null
  let audioContext = null

  let instantAudio = 0;
  let slowAudio = 0;

  useEffect(() => {
    if(audioContext) {
      audioContext.close()
    }
    videoRef.current.srcObject = stream
  }, [ stream ])

  /*useEffect(() => {

    context2d = audio.current.getContext('2d')
    audioContext = attachAudioAnalyser(stream, (audioLevel, exactAudioLevel, dataArray, bufferLength) => {

      if(!audio.current) return

      context2d.clearRect(0, 0, audio.current.width, audio.current.height)

      context2d.fillStyle = 'rgba(0, 0, 0, 0)'
      context2d.fillRect(0, 0, audio.current.width, audio.current.height)

      var barHeight
      var x = 0
      var barWidth = (audio.current.width / bufferLength) * 2.5
      for(var i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i]
        context2d.fillStyle = 'rgb(50,50,'+(barHeight+100)+')'
        context2d.fillRect(x, audio.current.height-barHeight/2, barWidth,barHeight/2)
        x += barWidth + 1
      }

      context2d.fillStyle = 'rgb(50,50,'+(audioLevel+100)+')'
      context2d.fillRect(0, audio.current.height-audioLevel, audio.current.width, audioLevel)

    })

  }, [])*/

  return (
    <div className={styles.remote}>
      { !video &&
        <span className={styles.videoDisabled}>
          <span className={styles.videoOff} />
        </span>
      }
      { !sound &&
        <span className={styles.audioDisabled}>
          <span className={styles.audioOff} />
        </span>
      }
      <video
        ref={videoRef}
        id={id}
        playsInline
        autoPlay
        muted
      />
      <canvas ref={audioRef} />
    </div>
  )
}

function Conference({ children, id, session, socket, clients }) {

  const localVideo = useRef(null)
  const remoteVideos = useRef({})
  const mainVideo = useRef(null)

  const [ isStreaming, toggleStreaming ] = useState(false)
  const [ enableVideo, toggleVideo ] = useState(true)
  const [ enableAudio, toggleAudio ] = useState(true)
  const [ peersHidden, hidePeers ] = useState(true)
  const [ isSharing, toggleSharing ] = useState(false)

  useEffect(() => {

    if(session) {

      session.on('stream', stream => {
        localVideo.current.srcObject = stream
      })

      session.on('remote', (clientId, stream) => {
        if (clientId == mainClientId || mainClientId == null) {
          if (stream && stream.active == true) {
            if (setMainVideo(stream)) setMainClientId(clientId)
          } else {
            setMainVideo(null)
            setMainClientId(null)
          }
        }
      })

      session.on('disconnect', data => {
        if (mainClientId == data.clientId) {
          setMainVideo(null)
          setMainClientId(null)
        }
      })

      session.on('inactive', () => {
        toggleSharing(false)
      })

      session.on('audio', (clientId, stream) => {
        if (clientId != mainClientId) {
          if (stream == null || stream.active == true) {
            if (setMainVideo(stream)) setMainClientId(clientId)
          }
        }
      })

    }

  }, [ session ])

  useEffect(() => {
    amIStreaming = isStreaming
    if(id == 1) {
      if (amIStreaming) {
        session.startStreaming(enableVideo, enableAudio)
      } else {
        session.stopStreaming()
      }
    } else {
      session.negotiate()
    }
  }, [isStreaming])

  useEffect(() => {
    amISharing = isSharing
    if (amISharing) {
      session.startSharing()
    } else {
      session.stopSharing()
      if(amIStreaming) {
        session.startStreaming(enableVideo, enableAudio)
      }
    }
  }, [isSharing])

  const setMainVideo = src => {
    if (amIStreaming && (src == null || src.active == true)) {
      if (mainVideo.current) {
        mainVideo.current.srcObject = src
        if (!src) mainVideo.current.removeAttribute('src')
      }
      return true
    } else if(mainVideo && mainVideo.current) {
      mainVideo.current.srcObject = null
      mainVideo.current.removeAttribute('src')
    }
    return false
  }

  const setMainClientId = clientId => {
    mainClientId = clientId
  }

  const findMainVideo = () => {
    for (let i = 0; i < clients.length; i++) {
      if (clients[i].stream && clients[i].stream.active) {
        if (setMainVideo(clients[i].stream))
          setMainClientId(clients[i].clientId)
        return
      }
    }
    setMainVideo(null)
    setMainClientId(null)
  }

  useEffect(() => {
    if (!mainClientId) {
      findMainVideo()
    } else {
      const index = clients.findIndex(val => val.clientId == mainClientId)
      if(index >= 0) {
        setMainVideo(clients[index].stream)
      } else {
        findMainVideo()
      }
    }
  }, [clients])

  const toggleStream = () => {
    if (!isStreaming) {
      toggleStreaming(true)
    } else {
      toggleStreaming(false)
    }
  }

  const toggleShare = () => {
    if (!amISharing) {
      toggleSharing(true)
    } else {
      toggleSharing(false)
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
          { isStreaming &&
            <span className={styles.action}>
              <button className={isSharing ? styles.stopShare : styles.startShare} onClick={toggleShare} />
            </span>
          }
          <span className={classNames(styles.action, styles.right)}>
            <button className={styles.users} onClick={() => hidePeers(!peersHidden)} />
            <Peers session={session} clients={clients} hidden={peersHidden} hidePeers={hidePeers} />
          </span>
        </div>
      </div>
      <div className={styles.remotes}>
        { isStreaming && clients.map((client, index) => {
          if(client.stream) {
            return (
              <Video key={client.clientId} id={client.clientId} stream={client.stream} video={client.video} sound={client.sound} />
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
