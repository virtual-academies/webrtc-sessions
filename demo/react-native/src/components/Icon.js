
import React, { Fragment } from 'react'
import { View, TouchableOpacity } from 'react-native'
import { Svg } from 'react-native-svg'

import { ICONS } from '../assets/icons'

export default function Icon({ icon, title, width, height, style, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} underlayColor={'#d3d3d3'} style={style}>
      <View>
        <Svg width={width} height={height} viewBox="4 4 68 68" role="img" aria-labelledby={icon}>
          {ICONS[icon]}
        </Svg>
      </View>
    </TouchableOpacity>
  )
}