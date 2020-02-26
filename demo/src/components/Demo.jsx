
'use strict'

import uuid from 'uuid'

import React, {
  useState,
  useReducer,
  useEffect
} from 'react'

import Session from '../../../src'

import Loader from './Loader'
import Conference from './Conference'
import Chat from './Chat'

// import { ACCESS_TOKEN } from '../config'

import styles from '../assets/index.css'

let session = null
let socket = null
let mainClientId = null

const clientsReducer = (clients, action) => {
  const index = clients.findIndex(val => val.clientId == action.clientId)
  if(action.type == 'add' && index < 0) {
    clients.push({ clientId: action.clientId })
  } else if(action.type == 'update' && index >= 0) {
    clients[index].stream = action.stream
  } else if(action.type == 'remove') {
    clients.splice(clients.findIndex(val => val.clientId == action.clientId), 1)
  }
  return [ ...clients ]
}

function Demo({ children }) {

  const [ loaded, setLoaded ] = useState(false)
  const [ clients, dispatch ] = useReducer(clientsReducer, [])

  useEffect(() => {

    session.on('connect', clientId => {
      dispatch({ type: 'add', clientId })
    })

    session.on('disconnect', clientId => {
      dispatch({ type: 'remove', clientId })
    })

    session.on('remote', (clientId, stream) => {
      dispatch({ type: 'update', clientId, stream })
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

  if(!session) {
    session = new Session(uuid())
  }

  return (
    <Loader loading={!loaded}>
      <div className={styles.container}>
        <div className={styles.conference}>
          <Conference session={session} clients={clients} />
        </div>
        <div className={styles.chat}>
          <Chat session={session} clients={clients} />
        </div>
      </div>
    </Loader>
  )

}

export default Demo
