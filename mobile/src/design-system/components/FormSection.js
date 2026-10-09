import { View } from 'react-native';

import { AppText } from './AppText';
import { Card } from './Card';
import { useTheme } from '../ThemeProvider';

/** @param {{title?:string,description?:string,children:import('react').ReactNode,style?:import('react-native').StyleProp<import('react-native').ViewStyle>,testID?:string}} props */
export function FormSection({ title, description, children, style, testID }) {
  const theme = useTheme();
  return <Card testID={testID} style={style}>
    {title && <AppText variant="label">{title}</AppText>}
    {description && <AppText variant="caption" tone="secondary">{description}</AppText>}
    <View style={{ gap: theme.spacing.sm }}>{children}</View>
  </Card>;
}
