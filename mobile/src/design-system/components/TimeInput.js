import { useEffect, useRef, useState } from 'react';
import { TextInput, View } from 'react-native';

import { useTheme } from '../ThemeProvider';
import { AppText } from './AppText';

/** @param {string} hour @param {string} minute */
function isValidTime(hour, minute) {
  if (!/^\d{1,2}$/.test(hour) || !/^\d{1,2}$/.test(minute)) return false;
  return Number(hour) >= 0 && Number(hour) <= 23 && Number(minute) >= 0 && Number(minute) <= 59;
}

/** @param {string} hour @param {string} minute */
function formatTime(hour, minute) {
  return `${String(Number(hour)).padStart(2, '0')}:${String(Number(minute)).padStart(2, '0')}`;
}

/**
 * @param {{label?:string,value:string,onChange:(value:string)=>void,testID?:string}} props
 */
export function TimeInput({ label = 'Time', value, onChange, testID = 'time-input' }) {
  const theme = useTheme();
  const [hour, minute] = value.split(':');
  const [focusedPart, setFocusedPart] = useState(/** @type {'hour'|'minute'|null} */ (null));
  const lastValidTime = useRef(value);
  const segmentWidth = 84;
  const separatorWidth = theme.spacing.lg;

  useEffect(() => {
    if (isValidTime(hour, minute)) lastValidTime.current = formatTime(hour, minute);
  }, [hour, minute]);

  /** @param {'hour'|'minute'} part @param {string} digits */
  function updatePart(part, digits) {
    const max = part === 'hour' ? 23 : 59;
    if (digits !== '' && Number(digits) > max) return;
    const nextHour = part === 'hour' ? digits : hour;
    const nextMinute = part === 'minute' ? digits : minute;
    onChange(`${nextHour}:${nextMinute}`);
    if (isValidTime(nextHour, nextMinute)) lastValidTime.current = formatTime(nextHour, nextMinute);
  }

  /** @param {string} currentHour @param {string} currentMinute */
  function commit(currentHour, currentMinute) {
    if (isValidTime(currentHour, currentMinute)) onChange(formatTime(currentHour, currentMinute));
    else onChange(lastValidTime.current);
    setFocusedPart(null);
  }

  /** @param {'hour'|'minute'} part @returns {import('react-native').TextStyle} */
  function inputStyle(part) {
    return {
      width: segmentWidth,
      height: theme.controls.minimumTouchTarget + 8,
      padding: 0,
      borderRadius: theme.radius.sm,
      borderWidth: theme.controls.borderWidth,
      borderColor: focusedPart === part ? theme.colors.focus : theme.colors.border.control,
      backgroundColor: theme.colors.surface.card,
      color: theme.colors.text.primary,
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
      textAlign: 'center',
      textAlignVertical: 'center',
      includeFontPadding: false,
    };
  }

  /** @param {'hour'|'minute'} part @param {string} text */
  function renderSegment(part, text) {
    const isHour = part === 'hour';
    return <View style={{ width: segmentWidth, alignItems: 'center', gap: theme.spacing.xs }}>
      <AppText variant="caption" tone="secondary">{isHour ? 'Hour' : 'Minute'}</AppText>
      <TextInput accessibilityLabel={isHour ? 'Hour' : 'Minute'}
        accessibilityHint={isHour ? 'Enter a value from 0 to 23' : 'Enter a value from 0 to 59'}
        keyboardType="number-pad" maxLength={2} selectTextOnFocus value={text}
        onChangeText={(nextText) => updatePart(part, nextText.replace(/\D/g, '').slice(0, 2))}
        onFocus={() => setFocusedPart(part)}
        onBlur={() => commit(part === 'hour' ? text : hour, part === 'minute' ? text : minute)}
        testID={`${testID}-${part}`} style={inputStyle(part)} />
    </View>;
  }

  return <View style={{ gap: theme.spacing.md, alignItems: 'center' }} testID={testID}>
    <AppText variant="label">{label}</AppText>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
      {renderSegment('hour', hour)}
      <AppText variant="sectionTitle" accessibilityLabel={`Selected time ${value}`} accessibilityLiveRegion="polite"
        style={{ width: separatorWidth, marginTop: theme.typography.caption.lineHeight + theme.spacing.xs,
          textAlign: 'center', color: theme.colors.text.primary }}>:</AppText>
      {renderSegment('minute', minute)}
    </View>
  </View>;
}
