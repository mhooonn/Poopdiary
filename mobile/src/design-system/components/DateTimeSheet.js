import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from './AppText';
import { Button } from './Button';
import { Choice } from './Choice';
import { Sheet } from './Sheet';
import { Stepper } from './Stepper';
import { useTheme } from '../ThemeProvider';
import { daysInMonth, formatDate, formatDisplayDate, formatTime, updateDatePart } from '../../shared/dateTime';

/**
 * @typedef {{visible:boolean,date:string,onClose:()=>void,testIDPrefix?:string}} DateTimeBaseProps
 * @typedef {DateTimeBaseProps & {time:string,allowNoTime?:false,onApply:(date:string,time:string)=>void}} TimedProps
 * @typedef {DateTimeBaseProps & {time:string|null,allowNoTime:true,onApply:(date:string,time:string|null)=>void}} OptionalTimeProps
 */

/** @param {TimedProps|OptionalTimeProps} props */
export function DateTimeSheet(props) {
  return props.visible ? <DateTimeDraft {...props} /> : null;
}

/** @param {Parameters<typeof DateTimeSheet>[0]} props */
function DateTimeDraft(props) {
  const { date, time, onClose, testIDPrefix = 'date-time' } = props;
  const theme = useTheme();
  const [draftDate, setDate] = useState(date);
  const [draftTime, setTime] = useState(/** @type {string|null} */ (time));
  const [custom, setCustom] = useState(false);
  const [year, month, day] = draftDate.split('-').map(Number);
  const [hour, minute] = (draftTime || formatTime(new Date())).split(':').map(Number);
  const today = formatDate(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const row = { flexDirection: /** @type {const} */ ('row'), flexWrap: /** @type {const} */ ('wrap'), gap: theme.spacing.sm };
  const cell = { flexGrow: 1, flexBasis: theme.controls.minimumTouchTarget * 3, minWidth: 0 };
  /** @param {number} minutes */
  const relative = (minutes) => {
    const value = new Date(new Date().getTime() - minutes * 60000);
    setDate(formatDate(value)); setTime(formatTime(value));
  };
  const apply = () => {
    if (props.allowNoTime) props.onApply(draftDate, draftTime);
    else props.onApply(draftDate, draftTime || formatTime(new Date()));
  };
  return <Sheet visible title="Date & time" onClose={onClose}>
    <View style={row}>
      {[{ code: today, label: 'Today' }, { code: formatDate(yesterday), label: 'Yesterday' }].map((option) => <View key={option.label} style={cell}>
        <Choice label={option.label} density="compact" selected={draftDate === option.code} onPress={() => setDate(option.code)} testID={`${testIDPrefix}-${option.label.toLowerCase()}`} />
      </View>)}
    </View>
    <Button label={formatDisplayDate(draftDate)} variant="secondary" onPress={() => setCustom(!custom)} expanded={custom} testID={`${testIDPrefix}-custom-date`} />
    {custom && <View style={{ gap: theme.spacing.md }}>
      <Stepper label="Year" value={year} min={1900} max={9999} onChange={(value) => setDate(updateDatePart(draftDate, 'year', value))} testID={`${testIDPrefix}-year`} />
      <View style={row}>
        <View style={cell}><Stepper label="Month" value={month} min={1} max={12} onChange={(value) => setDate(updateDatePart(draftDate, 'month', value))} testID={`${testIDPrefix}-month`} /></View>
        <View style={cell}><Stepper label="Day" value={day} min={1} max={daysInMonth(year, month)} onChange={(value) => setDate(updateDatePart(draftDate, 'day', value))} testID={`${testIDPrefix}-day`} /></View>
      </View>
    </View>}
    {props.allowNoTime && <View style={row} accessibilityRole="radiogroup" accessibilityLabel="Record time">
      <View style={cell}><Choice label="Set time" density="compact" selected={draftTime !== null}
        onPress={() => setTime(draftTime || formatTime(new Date()))} testID={`${testIDPrefix}-set-time`} /></View>
      <View style={cell}><Choice label="No time" density="compact" selected={draftTime === null}
        onPress={() => setTime(null)} testID={`${testIDPrefix}-no-time`} /></View>
    </View>}
    <>
      <AppText variant="sectionTitle" style={{ textAlign: 'center', fontVariant: ['tabular-nums'] }}>{draftTime || '—'}</AppText>
      <View style={row}>
        <View style={cell}><Stepper label="Hour" value={hour} min={0} max={23} disabled={draftTime === null} onChange={(value) => setTime(`${String(value).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)} testID={`${testIDPrefix}-hour`} /></View>
        <View style={cell}><Stepper label="Minute" value={minute} min={0} max={59} disabled={draftTime === null} onChange={(value) => setTime(`${String(hour).padStart(2, '0')}:${String(value).padStart(2, '0')}`)} testID={`${testIDPrefix}-minute`} /></View>
      </View>
    </>
    <View style={row}>
      {[{ value: 0, label: 'Now' }, { value: 5, label: '5 min ago' }, { value: 30, label: '30 min ago' }].map((item) => <View key={item.value} style={cell}>
        <Button label={item.label} variant="secondary" onPress={() => relative(item.value)} />
      </View>)}
    </View>
    <Button label="Done" onPress={apply} testID={`${testIDPrefix}-apply`} />
  </Sheet>;
}
