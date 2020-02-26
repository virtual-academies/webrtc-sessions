
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
  if(action.type == 'new') {
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
            type: 'new'
          }
          session.sendData(data)
          dispatch(data)
          input.current.value = null
        }
      }
    })

  }, [])

  useEffect(() => {
    if(session) {
      session.on('data', ({ clientId, message, timeStamp }) => {
        dispatch({ type: 'new', clientId, message, timeStamp })
      })
    }
  }, [ session ])

  return (
    <div className={styles.container}>
      <ul className={styles.messages}>
      { messages.map(({ clientId, message, timeStamp }, index) => (
        <li key={index} className={classNames(styles.message, { [styles.personal]: clientId == session.clientId })}>
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
