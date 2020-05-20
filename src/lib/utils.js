
'use strict'

/*
 * Generic logging function
 */
export function log(debug=false) {
  if(debug) {
    /* eslint-disable-next-line no-console */
    console.log(...Array.from(arguments).slice(1))
  }
}

export function stack() {
  return new Error().stack
}

/*
 * Returns current UTC timestamp adjusted for timezone
 */
export const getTime = () => {
  return Date.now() + new Date().getTimezoneOffset() * 60 * 1000
}

/*
 * Returns length of a string in bytes
 */
export const byteLength = str => {
  // returns the byte length of an utf8 string
  let s = str.length
  for (let i = str.length - 1; i >= 0; i--) {
    let code = str.charCodeAt(i)
    if (code > 0x7f && code <= 0x7ff) s++
    else if (code > 0x7ff && code <= 0xffff) s += 2
    if (code >= 0xdc00 && code <= 0xdfff) i-- //trail surrogate
  }
  return s
}

/*
 * Returns input string split into array with elements of input length
 */
export const chunkString = (str, length) => {
  return str.match(new RegExp('.{1,' + length + '}', 'g'))
}

/*
 * Attaches audio analyser to MediaStream
*/
export const attachAudioAnalyser = (stream, callback) => {

  if(stream.getAudioTracks().length == 0)
    return;

  if(!AudioContext)
    return;

  const audioContext = new AudioContext() // || window.webkitAudioContext
  const analyser = audioContext.createAnalyser()
  const microphone = audioContext.createMediaStreamSource(stream)
  const processor = audioContext.createScriptProcessor(2048, 1, 1)

  analyser.smoothingTimeConstant = 0.3
  analyser.fftSize = 1024

  microphone.connect(analyser)
  analyser.connect(processor)
  processor.connect(audioContext.destination)

  processor.onaudioprocess = () => {
    var array = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(array)
    var values = 0
    var length = array.length
    for (var i = 0; i < length; i++) {
      values += array[i]
    }
    callback(values / length)
  }

  audioContext.onstatechange = () => {
    if (audioContext.state == 'closed') {
      microphone.disconnect()
      analyser.disconnect()
      processor.disconnect()
      processor.onaudioprocess = null
      callback(0)
    }
  }

  return audioContext
}

export const disableVideoTrack = (stream) => {
  stream.getTracks().forEach(track => {
    if (track.kind == 'video') {
      track.enabled = !track.enabled
    }
  })
}

export const disableAudioTrack = (stream) => {
  stream.getTracks().forEach(track => {
    if (track.kind == 'audio') {
      track.enabled = !track.enabled
    }
  })
}
