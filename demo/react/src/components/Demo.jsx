
'use strict'

import { v4 as uuidv4 } from 'uuid';

import React, {
  useState,
  useReducer,
  useEffect
} from 'react'

import Session from '../../../../src'

import Loader from './Loader'
import Conference from './Conference'
import Chat from './Chat'

import styles from '../assets/index.css'

let session = null
let socket = null
let mainClientId = null

const clientsReducer = (clients, action) => {
  let index = clients.findIndex(val => val.clientId == action.clientId)

  if(index < 0) {
    clients.push({
      clientId: action.clientId,
      username: action.username,
      stream: null,
      video: true,
      sound: true
    })
    index = clients.findIndex(val => val.clientId == action.clientId)
  }

  if(index >= 0){
    if(action.type == 'stream') {
      clients[index].stream = action.stream
    } else if(action.type == 'username') {
      clients[index].username = action.username
    } else if(action.type == 'video') {
      clients[index].video = action.state
    } else if(action.type == 'sound') {
      clients[index].sound = action.state
    } else if(action.type == 'remove') {
      clients.splice(index, 1)
    }
  }

  return [ ...clients ]
}

function Demo({ children }) {

  const [ loaded, setLoaded ] = useState(false)
  const [ clients, dispatch ] = useReducer(clientsReducer, [])

  useEffect(() => {

    session.getClients().forEach(client => {
      dispatch({ type: 'add', ...client })
    })

    session.on('connect', (clientId, meta) => {
      dispatch({ type: 'add', clientId, username: meta.username })
    })

    session.on('disconnect', data => {
      dispatch({ type: 'remove', clientId: data.clientId })
    })

    session.on('remote', (clientId, stream) => {
      dispatch({ type: 'stream', clientId, stream })
    })

    session.on('meta', (clientId, meta) => {
      dispatch({ type: 'username', clientId, username: meta.username })
    })

    session.on('video', (data) => {
      dispatch({ type: 'video', clientId: data.clientId, state: data.state })
    })

    session.on('sound', (data) => {
      dispatch({ type: 'sound', clientId: data.clientId, state: data.state })
    })

    socket = new WebSocket('ws://localhost:8080')

    const { onOpen, onError, onMessage, onClose } = session.connect(message => {
      socket.send(message)
    })

    socket.addEventListener('open', () => {
      setLoaded(true)
      onOpen()
    })

    socket.addEventListener('message', message => {
      onMessage(message.data)
    })
    socket.addEventListener('error', onError)
    socket.addEventListener('close', onClose)

    return () => {
      //socket.close()
      //session.disconnect()
      setLoaded(false)
    }

  }, [])

  if(!session) {

    let id = uuidv4()
    let hash = window.location.hash.substr(1)
    if(hash.length > 0)
    {
      id = hash;
    }

    session = new Session(id, null, {
      connection: {
        iceServers: [{
          urls: [ 'turn:numb.viagenie.ca' ],
          username: 'xxxxxx@example.com',
          credential: 'xxxxxxxx'
        },{
          urls: [ 'stun:stun.l.google.com:19302' ]
        }]
      },
      openDataChannel: true,
      debug: true
    })
  }

  return (
    <Loader loading={!loaded}>
      <div className={styles.container}>
        <div className={styles.conference}>
          <Conference session={session} socket={socket} clients={clients} />
        </div>
        <div className={styles.chat}>
          <Chat session={session} clients={clients} />
        </div>
      </div>
    </Loader>
  )

}

export default Demo
