
'use strict'

import moment from 'moment'
import classNames from 'classnames'

import React, {
  Fragment,
  useState,
  useReducer,
  useEffect,
  useRef
} from 'react'

import styles from '../assets/chat.css'

const messagesReducer = (messages, action) => {
  if(action.type == 'message') {
    messages.push({
      clientId: action.clientId,
      message: action.message,
      timeStamp: action.timeStamp
    })
  }
  return [ ...messages ]
}

const formatDate = timeStamp => {
  if (parseInt(timeStamp) > moment().startOf('day').valueOf()) {
    return moment(timeStamp).format('h:mma')
  }
  return moment(timeStamp).format('MMM D, h:mma')
}

function Chat({ children, session, clients }) {

  const input = useRef(null)
  const [ messages, dispatch ] = useReducer(messagesReducer, [])

  useEffect(() => {

    input.current.addEventListener('keydown', e => {
      if(e.which == 13 && !e.shiftKey) {
        e.preventDefault()
        if(input.current.value.trim().length > 0) {
          const data = {
            clientId: session.clientId,
            message: input.current.value,
            timeStamp: Date.now(),
            type: 'message'
          }
          session.broadcast(data)
          dispatch(data)
          input.current.value = null
        }
      }
    })

  }, [])

  useEffect(() => {
    if(session) {
      session.on('data', ({ clientId, message, timeStamp }) => {
        dispatch({ type: 'message', clientId, message, timeStamp })
      })
    }
  }, [ session ])

  const getUsername = (clientId) => {
    if(clientId == session.clientId)
      return session.meta.username || 'me'
    const clientIndex = clients.findIndex(client => (client.clientId == clientId))
    if(clients[clientIndex].username) {
      return clients[clientIndex].username
    }
    return 'user'+(clientIndex+1)
  }

  const showUsername = (index) => {
    if(messages[index].clientId == session.clientId) {
      return false
    } else if(messages[index-1]) {
      if(messages[index-1].clientId == messages[index].clientId) {
        return false
      }
    }
    return true
  }

  return (
    <div className={styles.container}>
      <ul className={styles.messages}>
      { messages.map(({ clientId, message, timeStamp }, index) => (
        <li key={index} className={classNames(styles.message, { [styles.personal]: clientId == session.clientId })}>
          { showUsername(index) &&
            <span className={styles.username}>{getUsername(clientId)}</span>
          }
          <span className={styles.text}>{message}</span>
          <span className={styles.time}>{formatDate(timeStamp)}</span>
        </li>
      ))}
      </ul>
      <div className={styles.draft}>
        <textarea className={styles.input} ref={input} placeholder={'Say something...'} />
      </div>
    </div>
  )

}

export default Chat
