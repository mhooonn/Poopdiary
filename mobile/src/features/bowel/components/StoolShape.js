import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { useTheme } from '../../../design-system';

/** @param {{type:number|null}} props */
export function StoolShape({ type }) {
  const theme = useTheme();
  const color = theme.colors.entry.bowel.fg;
  const size = theme.controls.minimumTouchTarget;
  return <Svg width={size} height={size} viewBox="0 0 64 48" aria-hidden>
    {type === 1 && <>{[[19, 15], [38, 13], [29, 32], [47, 31]].map(([x, y]) => <Circle key={x} cx={x} cy={y} r="7" fill={color} />)}</>}
    {type === 2 && <Path d="M10 34 C2 23 14 17 19 20 C14 9 31 4 35 14 C44 5 56 14 50 22 C61 32 50 41 41 35 C33 46 22 41 23 34 C17 42 10 41 10 34Z" fill={color} />}
    {type === 3 && <><Path d="M10 34 C2 24 16 17 26 15 L45 11 C61 9 65 29 48 34 L28 40 C20 43 13 41 10 34Z" fill={color} /><Path d="M25 15 L28 25 L24 31 M43 13 L40 23 L44 30" stroke={theme.colors.entry.bowel.bg} strokeWidth="3" fill="none" /></>}
    {type === 4 && <Path d="M10 34 C2 24 16 17 26 15 L45 11 C61 9 65 29 48 34 L28 40 C20 43 13 41 10 34Z" fill={color} />}
    {type === 5 && <>{[[19, 15], [42, 18], [29, 34]].map(([x, y]) => <Ellipse key={x} cx={x} cy={y} rx="10" ry="7" fill={color} />)}</>}
    {type === 6 && <Path d="M7 30 L14 24 L9 18 L20 16 L25 9 L32 15 L41 9 L44 19 L57 20 L49 28 L54 36 L42 35 L34 42 L26 35 L15 39Z" fill={color} />}
    {type === 7 && <><Path d="M9 16 Q17 8 25 16 T41 16 T57 16 M9 29 Q17 21 25 29 T41 29 T57 29 M9 40 Q17 32 25 40 T41 40 T57 40" stroke={color} strokeWidth="3" strokeLinecap="round" fill="none" /></>}
  </Svg>;
}
