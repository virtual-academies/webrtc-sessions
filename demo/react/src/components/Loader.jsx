
'use strict'

import React, { Fragment } from 'react'

const Loader = ({
  children=null,
  size=100,
  color='#000000',
  style={},
  withLightbox=true,
  lightboxStyle={},
  loading=false
}) => {

  const getLoaderStyle = () => {
    return Object.assign({
      position: 'fixed',
      transform: 'translate(-50%, -50%)',
      left: '50%',
      top: '50%',
      zIndex: 9999,
      width: '100px',
      height: '100px'
    }, style)
  }

  const getLightboxStyle = () => {
    return Object.assign({
      display: 'block',
      position: 'fixed',
      zIndex: 9998,
      left: 0,
      top: 0,
      width: '100%',
      height: '100%',
      overflow: 'auto',
      backgroundColor: 'rgba(255, 255, 255, 0.5)',
      boxSizing: 'border-box'
    }, lightboxStyle)
  }

  return (
    <Fragment>
      {children}
      {loading &&
        <Fragment>
          <div>
            <svg xmlns='http://www.w3.org/2000/svg' style={{ position: 'fixed' }}>
              <symbol id='loader'>
                <g fill='none' fillRule='evenodd' stroke={color}>
                  <g transform='translate(1 1)' strokeWidth='2'>
                    <circle strokeOpacity='.3' cx='18' cy='18' r='18' />
                    <path d='M36 18c0-9.94-8.06-18-18-18'>
                      <animateTransform
                        attributeName='transform'
                        type='rotate'
                        from='0 18 18'
                        to='360 18 18'
                        dur='1s'
                        repeatCount='indefinite' />
                    </path>
                  </g>
                </g>
              </symbol>
            </svg>
            <svg
              style={getLoaderStyle()}
              width={size}
              height={size}
              viewBox='0 0 38 38'
            >
              <use xlinkHref='#loader' />
            </svg>
          </div>
          { withLightbox &&
            <div style={getLightboxStyle()} />
          }
        </Fragment>
      }
    </Fragment>
  )
}

export default Loader
