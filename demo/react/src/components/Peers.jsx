
'use strict'

import React, {
  useRef,
  useEffect,
  useReducer
} from 'react'

import styles from '../assets/index.css'

function Peers({ session, clients, hidden, hidePeers }) {

  const input = useRef(null)

  const changeUsername = (e) => {
    e.preventDefault()
    session.setMeta({
      username: input.current.value
    })
    hidePeers(true)
  }

  if(!hidden && session) {
    return (
      <div className={styles.peers}>
        { clients.map((client, index) => (
          <div key={client.clientId} className={styles.peer}>
            <span className={styles.user} />
            <span>{client.username || 'user'+(index+1)}</span>
          </div>
        ))}
        <div key={session.clientId} className={styles.peer}>
          <span className={styles.user} />
          <form onSubmit={changeUsername}>
            <input ref={input}
              type="text"
              name="username"
              defaultValue={session.meta.username||'me'}
              data-lpignore="true"
              spellCheck="false"
            />
          </form>
        </div>
      </div>
    )
  }
  return null
}

export default Peers

