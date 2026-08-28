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
  // The disc's 3.5px border sits INSIDE the View bounds, so an absolutely
  // positioned SVG at top:0/left:0 starts at the padding box (border edge),
  // not the visual disc center. Inset the SVG by the border width and size
  // it to the content box so the ring and the centered number share the
  // exact same center point.
  const border = 3.5;
  const stroke = 5;
  const inner = size - border * 2;
  const r = inner / 2 - stroke / 2 - 0.5;
  const c = 2 * Math.PI * r;
  const color = expired || progress < 0.25 ? Palette.coral : progress < 0.5 ? Palette.tangerine : Palette.lime;
  return (
    <View style={[styles.disc, { width: size, height: size }]}>
      <Svg
        width={inner}
        height={inner}
        style={{ position: 'absolute', top: border, left: border }}
      >
        <Circle cx={inner / 2} cy={inner / 2} r={r} stroke="rgba(27,31,59,0.12)" strokeWidth={stroke} fill="none" />
        <Circle
          cx={inner / 2}
          cy={inner / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          strokeLinecap="round"
          transform={`rotate(-90 ${inner / 2} ${inner / 2})`}
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
