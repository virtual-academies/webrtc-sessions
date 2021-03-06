
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

let audioAnalyserIntervals = {};

export const detachAudioAnalyser = (clientId) => {
  clearInterval(audioAnalyserIntervals[clientId]);
  audioAnalyserIntervals[clientId] = null;
}

/*
 * Attaches audio analyser to MediaStream
*/
export const attachAudioAnalyser = (peerConnection, stream, interval, callback) => {

  let audioTracks = stream.getAudioTracks()
  if(audioTracks.length == 0)
    return false

  audioAnalyserIntervals[peerConnection.clientId] = setInterval(() => {
    for(let i=0;i<audioTracks.length;i++)
    {
      peerConnection.getStats(audioTracks[0]).then(stats => {
        stats.forEach(report => {
          if(report.kind == 'audio' && report.audioLevel){
            callback(report.audioLevel)
          }
        });
      });
    }
  }, interval);

  return true

  /*const AudioContext = window.AudioContext || window.webkitAudioContext || AudioContext

  if(!AudioContext)
    return;

  const audioContext = new AudioContext()
  const analyser = audioContext.createAnalyser()
  const microphone = audioContext.createMediaStreamSource(stream)
  const processor = audioContext.createScriptProcessor(2048, 1, 1)

  analyser.smoothingTimeConstant = 0.3
  analyser.fftSize = 1024

  microphone.connect(analyser)
  analyser.connect(processor)
  processor.connect(audioContext.destination)

  let slow = 0;

  processor.onaudioprocess = () => {
    var array = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteFrequencyData(array)
    var values = 0
    var length = array.length
    for (var i = 0; i < length; i++) {
      values += array[i]*array[i]
    }

    let current = Math.sqrt(values/length)
    slow = 0.95 * slow + 0.05 * current;

    callback(slow, current, array, analyser.frequencyBinCount)
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

  return audioContext*/
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
