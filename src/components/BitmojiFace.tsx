import React, { memo } from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Ellipse, Rect, G } from 'react-native-svg';
import { BitmojiSpec } from '@/game/bitmoji';

type Props = {
  spec: BitmojiSpec;
  size?: number;
};

const INK = '#1B1F3B';

const darken = (hexStr: string, amt: number) => {
  const m = hexStr.replace('#', '');
  const r = Math.round(parseInt(m.slice(0, 2), 16) * (1 - amt));
  const g = Math.round(parseInt(m.slice(2, 4), 16) * (1 - amt));
  const b = Math.round(parseInt(m.slice(4, 6), 16) * (1 - amt));
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
};

/**
 * A custom-drawn bitmoji-style cartoon face (neo-brutalist: chunky ink
 * outlines, big juicy eyes, filled smile). Everything is parametric so the
 * same component renders every scanned player with THEIR features.
 */
export const BitmojiFace = memo(function BitmojiFace({ spec, size = 64 }: Props) {
  const s = spec;
  // head geometry (viewBox 0..100)
  const cx = 50, cy = 47;
  const rx = 23 * s.faceWide;
  const ry = 25 * s.faceTall;
  const topY = cy - ry;
  const hairColor = s.hair;
  const hairInk = darken(hairColor, 0.35);
  const skin = s.skin;
  const skinDark = darken(skin, 0.16);

  // eyes (big and lively)
  const eyeDX = 9 * s.eyeSpace;
  const eyeY = cy - 3;
  const ew = 6.0 * s.eyeSize;      // white
  const er = 4.6 * s.eyeSize;      // iris
  const exR = cx + eyeDX, exL = cx - eyeDX;

  // brows
  const browY = eyeY - 8 * s.browLift;
  const browTilt = s.browTilt * 3;
  const browW = 7.5 * s.eyeSize;

  // nose
  const noseTipY = cy + 6 * s.noseLen;
  const noseW = 3.4 * s.noseWide;

  // mouth
  const mouthY = noseTipY + 5.5;
  const mw = 8.5 * s.mouthWide;
  const curve = 7 * s.mouthCurve;

  // fringe (front hair hugging the forehead): wavy outer volume + an
  // asymmetric swoop hairline so it reads as hair, not a beanie
  const fringe = `M ${cx - rx * 1.06} ${cy - ry * 0.1}
    Q ${cx - rx * 1.2} ${topY - ry * 0.26} ${cx - rx * 0.7} ${topY - ry * 0.2}
    Q ${cx - rx * 0.35} ${topY - ry * 0.36} ${cx + rx * 0.05} ${topY - ry * 0.22}
    Q ${cx + rx * 0.5} ${topY - ry * 0.36} ${cx + rx * 0.8} ${topY - ry * 0.14}
    Q ${cx + rx * 1.14} ${topY - ry * 0.1} ${cx + rx * 1.06} ${cy - ry * 0.35}
    Q ${cx + rx * 0.85} ${cy - ry * 0.62} ${cx + rx * 0.5} ${cy - ry * 0.55}
    Q ${cx + rx * 0.2} ${cy - ry * 0.6} ${cx} ${cy - ry * 0.3}
    Q ${cx - rx * 0.25} ${cy - ry * 0.15} ${cx - rx * 0.55} ${cy - ry * 0.42}
    Q ${cx - rx * 0.85} ${cy - ry * 0.55} ${cx - rx * 1.06} ${cy - ry * 0.1} Z`;

  // fringe bottom edge (hugs the forehead above the brows)
  const fringeY = cy - ry * 0.45;

  // buzz/fade: a crescent cap — outer edge follows the skull, hairline
  // scallops across the forehead just above the brows (no full helmet)
  const buzzFringe = `M ${cx - rx * 1.02} ${cy - ry * 0.35}
    Q ${cx - rx * 1.1} ${topY - ry * 0.18} ${cx} ${topY - ry * 0.2}
    Q ${cx + rx * 1.1} ${topY - ry * 0.18} ${cx + rx * 1.02} ${cy - ry * 0.35}
    Q ${cx + rx * 0.6} ${cy - ry * 0.55} ${cx + rx * 0.3} ${cy - ry * 0.48}
    Q ${cx} ${cy - ry * 0.56} ${cx - rx * 0.3} ${cy - ry * 0.48}
    Q ${cx - rx * 0.6} ${cy - ry * 0.55} ${cx - rx * 1.02} ${cy - ry * 0.35} Z`;

  const longHair = `M ${cx - rx * 1.08} ${cy - ry * 0.55}
    Q ${cx - rx * 1.3} ${cy + ry * 0.5} ${cx - rx * 1.05} ${cy + ry * 1.18}
    L ${cx - rx * 0.6} ${cy + ry * 1.05}
    Q ${cx - rx * 0.95} ${cy + ry * 0.5} ${cx - rx * 0.92} ${cy - ry * 0.3}
    L ${cx + rx * 0.92} ${cy - ry * 0.3}
    Q ${cx + rx * 0.95} ${cy + ry * 0.5} ${cx + rx * 0.6} ${cy + ry * 1.05}
    L ${cx + rx * 1.05} ${cy + ry * 1.18}
    Q ${cx + rx * 1.3} ${cy + ry * 0.5} ${cx + rx * 1.08} ${cy - ry * 0.55} Z`;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {/* badge background */}
        <Circle cx={50} cy={50} r={48} fill={s.bg} stroke={INK} strokeWidth={2.5} />

        {/* long hair behind the head */}
        {s.hairStyle === 2 && <Path d={longHair} fill={hairColor} stroke={hairInk} strokeWidth={1.6} />}

        {/* shirt */}
        <Path
          d={`M ${cx - rx * 1.12} 100
              Q ${cx - rx * 1.12} ${cy + ry * 1.04} ${cx} ${cy + ry * 1.04}
              Q ${cx + rx * 1.12} ${cy + ry * 1.04} ${cx + rx * 1.12} 100 Z`}
          fill={s.shirt}
          stroke={INK}
          strokeWidth={2.5}
        />
        {/* neck */}
        <Rect x={cx - 6} y={cy + ry * 0.5} width={12} height={ry * 0.7} rx={4} fill={skinDark} />

        {/* ears */}
        <Circle cx={cx - rx} cy={eyeY + 4} r={4.6 * s.eyeSize} fill={skin} stroke={INK} strokeWidth={1.8} />
        <Circle cx={cx + rx} cy={eyeY + 4} r={4.6 * s.eyeSize} fill={skin} stroke={INK} strokeWidth={1.8} />

        {/* head */}
        <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={skin} stroke={INK} strokeWidth={2.5} />
        {/* soft chin shading */}
        <Path
          d={`M ${cx - rx * 0.8} ${cy + ry * 0.4}
              Q ${cx} ${cy + ry * 1.02} ${cx + rx * 0.8} ${cy + ry * 0.4}
              Q ${cx} ${cy + ry * 0.68} ${cx - rx * 0.8} ${cy + ry * 0.4} Z`}
          fill={skinDark}
          opacity={0.22}
        />

        {/* fringe (front hair hugging the forehead) */}
        {s.hairStyle === 0 ? (
          <Path d={buzzFringe} fill={hairColor} stroke={hairInk} strokeWidth={1.2} />
        ) : (
          <G>
            <Path d={fringe} fill={hairColor} stroke={hairInk} strokeWidth={1.8} />
            {/* loose strands so the hair doesn't read as a helmet */}
            <Path
              d={`M ${cx - rx * 0.62} ${topY - ry * 0.1} Q ${cx - rx * 0.5} ${topY + ry * 0.2} ${cx - rx * 0.58} ${fringeY - 2}`}
              stroke={hairInk} strokeWidth={1.4} fill="none" opacity={0.55}
            />
            <Path
              d={`M ${cx + rx * 0.18} ${topY - ry * 0.14} Q ${cx + rx * 0.3} ${topY + ry * 0.16} ${cx + rx * 0.22} ${fringeY - 2.5}`}
              stroke={hairInk} strokeWidth={1.4} fill="none" opacity={0.55}
            />
            <Path
              d={`M ${cx + rx * 0.62} ${topY - ry * 0.05} Q ${cx + rx * 0.78} ${topY + ry * 0.22} ${cx + rx * 0.74} ${fringeY - 1}`}
              stroke={hairInk} strokeWidth={1.4} fill="none" opacity={0.55}
            />
          </G>
        )}
        {s.hairStyle === 2 && (
          <G>
            <Path
              d={`M ${cx - rx * 1.02} ${cy + ry * 0.1} Q ${cx - rx * 1.12} ${cy + ry * 0.6} ${cx - rx * 0.95} ${cy + ry * 1.02}`}
              stroke={hairInk} strokeWidth={1.6} fill="none" opacity={0.5}
            />
            <Path
              d={`M ${cx + rx * 1.02} ${cy + ry * 0.1} Q ${cx + rx * 1.12} ${cy + ry * 0.6} ${cx + rx * 0.95} ${cy + ry * 1.02}`}
              stroke={hairInk} strokeWidth={1.6} fill="none" opacity={0.5}
            />
          </G>
        )}

        {/* blush */}
        <Ellipse cx={exL - 4} cy={eyeY + 9} rx={4.2} ry={2.6} fill="#FF8A8A" opacity={0.55} />
        <Ellipse cx={exR + 4} cy={eyeY + 9} rx={4.2} ry={2.6} fill="#FF8A8A" opacity={0.55} />

        {/* brows */}
        <Path
          d={`M ${exL - browW} ${browY + browTilt} Q ${exL} ${browY - 2.4 * s.eyeSize} ${exL + browW} ${browY - browTilt}`}
          stroke={hairInk} strokeWidth={2.8 * s.eyeSize} strokeLinecap="round" fill="none"
        />
        <Path
          d={`M ${exR - browW} ${browY - browTilt} Q ${exR} ${browY - 2.4 * s.eyeSize} ${exR + browW} ${browY + browTilt}`}
          stroke={hairInk} strokeWidth={2.8 * s.eyeSize} strokeLinecap="round" fill="none"
        />

        {/* big cartoon eyes */}
        <G>
          <Ellipse cx={exL} cy={eyeY} rx={ew} ry={ew * 0.92} fill="#fff" stroke={INK} strokeWidth={1.7} />
          <Ellipse cx={exR} cy={eyeY} rx={ew} ry={ew * 0.92} fill="#fff" stroke={INK} strokeWidth={1.7} />
          <Circle cx={exL} cy={eyeY + 0.6} r={er} fill="#3A2A1E" />
          <Circle cx={exR} cy={eyeY + 0.6} r={er} fill="#3A2A1E" />
          <Circle cx={exL - er * 0.32} cy={eyeY - er * 0.34} r={er * 0.42} fill="#fff" />
          <Circle cx={exR - er * 0.32} cy={eyeY - er * 0.34} r={er * 0.42} fill="#fff" />
          <Circle cx={exL + er * 0.32} cy={eyeY + er * 0.38} r={er * 0.18} fill="#fff" opacity={0.85} />
          <Circle cx={exR + er * 0.32} cy={eyeY + er * 0.38} r={er * 0.18} fill="#fff" opacity={0.85} />
          {/* eyelid line */}
          <Path
            d={`M ${exL - ew * 0.9} ${eyeY - ew * 0.55} Q ${exL} ${eyeY - ew * 1.15} ${exL + ew * 0.9} ${eyeY - ew * 0.55}`}
            stroke={INK} strokeWidth={1.6} strokeLinecap="round" fill="none" opacity={0.85}
          />
          <Path
            d={`M ${exR - ew * 0.9} ${eyeY - ew * 0.55} Q ${exR} ${eyeY - ew * 1.15} ${exR + ew * 0.9} ${eyeY - ew * 0.55}`}
            stroke={INK} strokeWidth={1.6} strokeLinecap="round" fill="none" opacity={0.85}
          />
        </G>

        {/* nose */}
        <Path
          d={`M ${cx - 1.6} ${eyeY + 3} Q ${cx - noseW * 0.9} ${noseTipY - 1} ${cx - noseW * 0.7} ${noseTipY}
              Q ${cx} ${noseTipY + 1.8 * s.noseWide} ${cx + noseW * 0.7} ${noseTipY}`}
          fill="none" stroke={skinDark} strokeWidth={2} strokeLinecap="round" opacity={0.9}
        />

        {/* mouth */}
        {s.mouthOpen ? (
          <G>
            <Path
              d={`M ${cx - mw} ${mouthY}
                  Q ${cx} ${mouthY + curve + 5} ${cx + mw} ${mouthY}
                  Q ${cx} ${mouthY + curve - 2} ${cx - mw} ${mouthY} Z`}
              fill="#7A2E2E" stroke={INK} strokeWidth={1.8}
            />
            <Path
              d={`M ${cx - mw * 0.72} ${mouthY + 0.8} Q ${cx} ${mouthY + 2.6} ${cx + mw * 0.72} ${mouthY + 0.8}
                  Q ${cx} ${mouthY + curve + 1.2} ${cx - mw * 0.72} ${mouthY + 0.8} Z`}
              fill="#fff"
            />
            <Ellipse cx={cx} cy={mouthY + curve + 2.6} rx={mw * 0.34} ry={2.1} fill="#FF8A8A" />
          </G>
        ) : (
          <G>
            <Path
              d={`M ${cx - mw} ${mouthY}
                  Q ${cx} ${mouthY + curve * 1.5} ${cx + mw} ${mouthY}
                  Q ${cx} ${mouthY + curve * 0.2} ${cx - mw} ${mouthY} Z`}
              fill="#8A3B3B" stroke={INK} strokeWidth={1.6}
            />
            <Path
              d={`M ${cx - mw * 0.72} ${mouthY + 0.7} Q ${cx} ${mouthY + 2.4} ${cx + mw * 0.72} ${mouthY + 0.7}
                  Q ${cx} ${mouthY + curve * 0.9} ${cx - mw * 0.72} ${mouthY + 0.7} Z`}
              fill="#fff"
            />
          </G>
        )}

        {/* accessories */}
        {s.accessory === 'glasses' && (
          <G>
            <Circle cx={exL} cy={eyeY} r={ew + 3} fill="rgba(255,255,255,0.15)" stroke={INK} strokeWidth={2.4} />
            <Circle cx={exR} cy={eyeY} r={ew + 3} fill="rgba(255,255,255,0.15)" stroke={INK} strokeWidth={2.4} />
            <Path d={`M ${exL + ew + 3} ${eyeY} L ${exR - ew - 3} ${eyeY}`} stroke={INK} strokeWidth={2.4} />
            <Path d={`M ${exL - ew - 3} ${eyeY - 1} L ${cx - rx + 1} ${eyeY - 3}`} stroke={INK} strokeWidth={2.4} />
            <Path d={`M ${exR + ew + 3} ${eyeY - 1} L ${cx + rx - 1} ${eyeY - 3}`} stroke={INK} strokeWidth={2.4} />
          </G>
        )}
        {s.accessory === 'sunglasses' && (
          <G>
            <Circle cx={exL} cy={eyeY} r={ew + 2.5} fill="#151A2E" stroke={INK} strokeWidth={1.6} />
            <Circle cx={exR} cy={eyeY} r={ew + 2.5} fill="#151A2E" stroke={INK} strokeWidth={1.6} />
            <Path d={`M ${exL + ew + 1} ${eyeY} L ${exR - ew - 1} ${eyeY}`} stroke={INK} strokeWidth={2.6} />
            <Path d={`M ${exL - ew - 1} ${eyeY - 1} L ${cx - rx + 1} ${eyeY - 3}`} stroke={INK} strokeWidth={2.6} />
            <Path d={`M ${exR + ew + 1} ${eyeY - 1} L ${cx + rx - 1} ${eyeY - 3}`} stroke={INK} strokeWidth={2.6} />
            <Circle cx={exL - 2} cy={eyeY - 2} r={1.8} fill="#fff" opacity={0.6} />
            <Circle cx={exR - 2} cy={eyeY - 2} r={1.8} fill="#fff" opacity={0.6} />
          </G>
        )}
        {s.accessory === 'partyhat' && (
          <G>
            {/* cone hugging the upper-right of the head */}
            <Path
              d={`M ${cx + rx * 0.28} ${topY + ry * 0.05}
                  L ${cx + rx * 0.9} ${topY - 22}
                  L ${cx + rx * 0.92} ${topY + ry * 0.5} Z`}
              fill="#FF5A5F" stroke={INK} strokeWidth={2.4} strokeLinejoin="round"
            />
            <Circle cx={cx + rx * 0.55} cy={topY - 8} r={1.6} fill="#FFC53D" />
            <Circle cx={cx + rx * 0.62} cy={topY - 15} r={1.6} fill="#2DD4BF" />
            <Circle cx={cx + rx * 0.7} cy={topY - 21} r={1.6} fill="#FFC53D" />
            {/* brim band along the base of the cone */}
            <Path
              d={`M ${cx + rx * 0.26} ${topY + ry * 0.02}
                  Q ${cx + rx * 0.62} ${topY + ry * 0.14} ${cx + rx * 0.94} ${topY + ry * 0.52}`}
              fill="none" stroke="#FFC53D" strokeWidth={4.5} strokeLinecap="round"
            />
            <Path
              d={`M ${cx + rx * 0.26} ${topY + ry * 0.02}
                  Q ${cx + rx * 0.62} ${topY + ry * 0.14} ${cx + rx * 0.94} ${topY + ry * 0.52}`}
              fill="none" stroke={INK} strokeWidth={1.2} strokeLinecap="round" opacity={0.6}
            />
            {/* pom */}
            <Circle cx={cx + rx * 0.9} cy={topY - 22} r={3.4} fill="#FFC53D" stroke={INK} strokeWidth={2} />
          </G>
        )}
      </Svg>
    </View>
  );
});

export default BitmojiFace;
