import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useCountdown } from '@/hooks/useCountdown';
import { Palette } from '@/constants/theme';

type Props = {
  endsAt: number | null;
  totalSeconds: number;
  size?: number;
};

/** Circular countdown ring — colors shift green→amber→red as time runs out.
 *  Sticker style: white disc, chunky dark border, colored ring.
 *  The progress ring is drawn ON the disc's edge (flush with the border)
 *  so it always reads as a complete circle — never a floating inset ring. */
export const TimerRing = memo(function TimerRing({ endsAt, totalSeconds, size = 58 }: Props) {
  const { remainingSec, progress, expired } = useCountdown(endsAt, totalSeconds);
  // ring hugs the disc edge: stroke outer edge = disc outer edge - 1px
  const stroke = 5;
  const r = size / 2 - stroke / 2 - 1;
  const c = 2 * Math.PI * r;
  const color = expired || progress < 0.25 ? Palette.coral : progress < 0.5 ? Palette.tangerine : Palette.lime;
  return (
    <View style={[styles.disc, { width: size, height: size }]}>
      <Svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0 }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(27,31,59,0.12)" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={[styles.num, { fontSize: size * 0.32, color: expired ? Palette.coral : Palette.ink }]}>
        {expired ? 'GO!' : remainingSec}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  disc: {
    backgroundColor: '#fff',
    borderRadius: 999,
    borderWidth: 3.5,
    borderColor: '#1B1F3B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(27,31,59,0.3)',
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  num: { fontWeight: '900' },
});

export default TimerRing;
