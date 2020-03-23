
import React, { Fragment } from 'react'
import { View, TouchableOpacity } from 'react-native'
import { Svg } from 'react-native-svg'

import { ICONS } from '../assets/icons'

export default function Icon({ icon, title, width, height, style, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} underlayColor={'#d3d3d3'} style={style}>
      <View>
        <Svg width={width} height={height} viewBox="0 120 1024 512" role="img" aria-labelledby={icon} style={{ color: '#000000' }}>
          {ICONS[icon]}
        </Svg>
      </View>
    </TouchableOpacity>
  )
}