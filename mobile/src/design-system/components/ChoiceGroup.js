import { View, useWindowDimensions } from 'react-native';
import { Choice } from './Choice';
import { useTheme } from '../ThemeProvider';

/**
 * @typedef {{label:string,options:{value:string,label:string,description?:string,icon?:import('react').ReactNode,tone?:import('./Choice').ChoiceProps['tone']}[],columns?:1|2|3,disabled?:boolean,testID?:string}} GroupProps
 * @typedef {GroupProps & {value:string,onChange:(value:string)=>void,multiple?:false}} SingleProps
 * @typedef {GroupProps & {value:string[],onChange:(value:string[])=>void,multiple:true}} MultipleProps
 */

/** Controlled selection; store option values, never display labels.
 * @param {SingleProps|MultipleProps} props */
export function ChoiceGroup(props) {
  const { label, options, value, columns = 1, disabled = false, testID } = props;
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  const count = fontScale > 1.3 ? 1 : columns;
  const values = Array.isArray(value) ? value : [value];
  const select = (/** @type {string} */ next) => {
    if (props.multiple) props.onChange(values.includes(next) ? values.filter((item) => item !== next) : [...values, next]);
    else props.onChange(next);
  };
  return <View testID={testID} accessibilityLabel={label} accessibilityRole={props.multiple ? undefined : 'radiogroup'}
    style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
    {options.map((option) => <View key={option.value} style={{ flexGrow: 1, flexBasis: `${100 / count - 3}%`, minWidth: 0 }}>
      <Choice label={option.label} description={option.description} icon={option.icon} tone={option.tone}
        selectionRole={props.multiple ? 'checkbox' : 'radio'} selected={values.includes(option.value)} disabled={disabled}
        density="compact" onPress={() => select(option.value)} style={{ height: '100%' }} testID={testID ? `${testID}-${option.value}` : undefined} />
    </View>)}
  </View>;
}
