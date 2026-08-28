import React, { memo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Ellipse, Rect, G } from 'react-native-svg';

type Props = {
  who: 'eva' | 'jonas';
  size?: number;
};

/**
 * Chibi "Memoji"-style faces for Eva & Jonas (the founders).
 * Flat, soft, Apple-Memoji-ish: no heavy ink outlines, big glossy eyes,
 * blush, simple hair. Distinct from the animal emoji stickers and the
 * scanned bitmojis.
 */
export const ChibiFace = memo(function ChibiFace({ who, size = 48 }: Props) {
  if (who === 'eva') {
    return <Eva size={size} />;
  }
  return <Jonas size={size} />;
});

// ---------- shared chibi primitives ----------

const SKIN = '#FFE0C2';
const SKIN_SHADE = '#F5C9A3';
const EYE = '#3A2A22';

function ChibiBase({
  bg,
  size,
  children,
}: {
  bg: string;
  size: number;
  children: React.ReactNode;
}) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx={50} cy={50} r={49} fill={bg} />
        {children}
      </Svg>
    </View>
  );
}

function ChibiHead({
  hairBack,
  fringe,
  eyeY,
  children,
}: {
  hairBack: React.ReactNode;
  fringe: React.ReactNode;
  eyeY: number;
  children?: React.ReactNode;
}) {
  const cx = 50;
  const exL = cx - 11;
  const exR = cx + 11;
  return (
    <G>
      {hairBack}
      {/* neck */}
      <Rect x={cx - 7} y={70} width={14} height={12} rx={5} fill={SKIN_SHADE} />
      {/* head */}
      <Ellipse cx={cx} cy={52} rx={24} ry={26} fill={SKIN} />
      {/* ears */}
      <Circle cx={cx - 24} cy={eyeY + 4} r={5} fill={SKIN} />
      <Circle cx={cx + 24} cy={eyeY + 4} r={5} fill={SKIN} />
      {/* blush */}
      <Ellipse cx={exL - 5} cy={eyeY + 10} rx={5} ry={3.2} fill="#FF9E9E" opacity={0.5} />
      <Ellipse cx={exR + 5} cy={eyeY + 10} rx={5} ry={3.2} fill="#FF9E9E" opacity={0.5} />
      {/* eyes */}
      <G>
        <Ellipse cx={exL} cy={eyeY} rx={7} ry={8} fill="#fff" />
        <Ellipse cx={exR} cy={eyeY} rx={7} ry={8} fill="#fff" />
        <Circle cx={exL} cy={eyeY + 1} r={5.2} fill={EYE} />
        <Circle cx={exR} cy={eyeY + 1} r={5.2} fill={EYE} />
        <Circle cx={exL - 1.8} cy={eyeY - 1.8} r={2.2} fill="#fff" />
        <Circle cx={exR - 1.8} cy={eyeY - 1.8} r={2.2} fill="#fff" />
        <Circle cx={exL + 1.8} cy={eyeY + 2.4} r={1.1} fill="#fff" opacity={0.85} />
        <Circle cx={exR + 1.8} cy={eyeY + 2.4} r={1.1} fill="#fff" opacity={0.85} />
      </G>
      {fringe}
      {children}
    </G>
  );
}

function Smile({ cx = 50, y, w = 9, open = false }: { cx?: number; y: number; w?: number; open?: boolean }) {
  if (open) {
    return (
      <G>
        <Path
          d={`M ${cx - w} ${y} Q ${cx} ${y + 9} ${cx + w} ${y} Q ${cx} ${y + 3.5} ${cx - w} ${y} Z`}
          fill="#7A2E2E"
        />
        <Ellipse cx={cx} cy={y + 6.4} rx={w * 0.4} ry={2.4} fill="#FF8A8A" />
      </G>
    );
  }
  return (
    <Path
      d={`M ${cx - w} ${y} Q ${cx} ${y + 7} ${cx + w} ${y}`}
      fill="none"
      stroke="#B5563F"
      strokeWidth={2.6}
      strokeLinecap="round"
    />
  );
}

// ---------- EVA ----------
// Pink long hair, party-girl energy, earrings.

function Eva({ size }: { size: number }) {
  const HAIR = '#FF8FB1';
  const HAIR_DARK = '#F4628F';
  const eyeY = 50;
  const hairBack = (
    <G>
      {/* long hair mass behind the head, flows past the shoulders */}
      <Path
        d={`M 22 44
            Q 16 70 20 92
            L 32 86
            Q 28 66 30 52
            L 70 52
            Q 72 66 68 86
            L 80 92
            Q 84 70 78 44
            Q 70 24 50 24
            Q 30 24 22 44 Z`}
        fill={HAIR}
      />
      {/* hair strand highlights */}
      <Path d="M 27 56 Q 24 72 26 86" stroke={HAIR_DARK} strokeWidth={2.4} fill="none" opacity={0.7} strokeLinecap="round" />
      <Path d="M 73 56 Q 76 72 74 86" stroke={HAIR_DARK} strokeWidth={2.4} fill="none" opacity={0.7} strokeLinecap="round" />
    </G>
  );
  const fringe = (
    <G>
      {/* bangs: soft wavy fringe across the forehead */}
      <Path
        d={`M 26 46
            Q 24 30 40 26
            Q 48 24 52 28
            Q 60 24 70 30
            Q 76 34 74 46
            Q 68 38 60 40
            Q 56 34 50 38
            Q 44 34 40 40
            Q 32 40 26 46 Z`}
        fill={HAIR}
      />
      {/* side locks framing the face */}
      <Path d="M 26 46 Q 24 56 27 64 Q 30 56 30 48 Z" fill={HAIR} />
      <Path d="M 74 46 Q 76 56 73 64 Q 70 56 70 48 Z" fill={HAIR} />
    </G>
  );
  return (
    <ChibiBase bg="#FFD1E0" size={size}>
      <ChibiHead hairBack={hairBack} fringe={fringe} eyeY={eyeY}>
        {/* brows */}
        <Path d={`M 38 ${eyeY - 10} Q 41 ${eyeY - 12.5} 44 ${eyeY - 10}`} stroke="#D85C87" strokeWidth={2.4} fill="none" strokeLinecap="round" />
        <Path d={`M 56 ${eyeY - 10} Q 59 ${eyeY - 12.5} 62 ${eyeY - 10}`} stroke="#D85C87" strokeWidth={2.4} fill="none" strokeLinecap="round" />
        {/* nose */}
        <Path d={`M 49 ${eyeY + 5} Q 48.5 ${eyeY + 8} 50 ${eyeY + 8.5}`} stroke={SKIN_SHADE} strokeWidth={1.8} fill="none" strokeLinecap="round" />
        {/* happy open smile */}
        <Smile y={eyeY + 13} open />
        {/* earrings */}
        <Circle cx={26} cy={eyeY + 12} r={2} fill="#FFC53D" />
        <Circle cx={74} cy={eyeY + 12} r={2} fill="#FFC53D" />
        {/* party shirt */}
        <Path d="M 22 100 Q 22 82 50 82 Q 78 82 78 100 Z" fill="#FF5A5F" />
      </ChibiHead>
    </ChibiBase>
  );
}

// ---------- JONAS ----------
// Short dark messy hair, chill grin, mic-star energy.

function Jonas({ size }: { size: number }) {
  const HAIR = '#5B4632';
  const HAIR_DARK = '#453425';
  const eyeY = 50;
  const hairBack = (
    <G>
      {/* short hair cap volume behind the head */}
      <Path
        d={`M 24 46
            Q 22 26 50 24
            Q 78 26 76 46
            Q 78 40 74 44
            Q 76 30 50 28
            Q 24 30 26 44
            Q 22 40 24 46 Z`}
        fill={HAIR}
      />
    </G>
  );
  const fringe = (
    <G>
      {/* messy textured fringe with distinct tufts */}
      <Path
        d={`M 26 44
            Q 25 28 44 26
            Q 46 20 54 26
            Q 62 22 70 30
            Q 76 34 74 44
            Q 70 34 64 38
            Q 62 30 56 36
            Q 52 28 46 36
            Q 40 30 36 38
            Q 30 36 26 44 Z`}
        fill={HAIR}
      />
      {/* tuft shadows */}
      <Path d="M 46 30 Q 45 36 47 38" stroke={HAIR_DARK} strokeWidth={1.8} fill="none" opacity={0.6} strokeLinecap="round" />
      <Path d="M 60 30 Q 59 36 61 38" stroke={HAIR_DARK} strokeWidth={1.8} fill="none" opacity={0.6} strokeLinecap="round" />
    </G>
  );
  return (
    <ChibiBase bg="#C9D8FF" size={size}>
      <ChibiHead hairBack={hairBack} fringe={fringe} eyeY={eyeY}>
        {/* brows (slightly raised, confident) */}
        <Path d={`M 38 ${eyeY - 10} Q 41 ${eyeY - 13} 44 ${eyeY - 11}`} stroke={HAIR} strokeWidth={2.6} fill="none" strokeLinecap="round" />
        <Path d={`M 56 ${eyeY - 11} Q 59 ${eyeY - 13} 62 ${eyeY - 10}`} stroke={HAIR} strokeWidth={2.6} fill="none" strokeLinecap="round" />
        {/* nose */}
        <Path d={`M 49 ${eyeY + 5} Q 48.5 ${eyeY + 8} 50 ${eyeY + 8.5}`} stroke={SKIN_SHADE} strokeWidth={1.8} fill="none" strokeLinecap="round" />
        {/* confident grin */}
        <Smile y={eyeY + 13} w={10} />
        {/* shirt */}
        <Path d="M 22 100 Q 22 82 50 82 Q 78 82 78 100 Z" fill="#38BDF8" />
        {/* star on the shirt */}
        <Path
          d="M 50 88 L 52.2 93 L 57.5 93.5 L 53.5 97 L 54.8 102 L 50 99.2 L 45.2 102 L 46.5 97 L 42.5 93.5 L 47.8 93 Z"
          fill="#FFC53D"
        />
      </ChibiHead>
    </ChibiBase>
  );
}

export default ChibiFace;
