import { Activity, CupSoda, Dumbbell, Moon, Toilet, Utensils } from 'lucide-react-native';

import { useTheme } from './ThemeProvider';

/** @typedef {'food'|'bowel'|'symptom'|'water'|'exercise'|'sleep'} RecordKind */

/** @type {Record<RecordKind, import('lucide-react-native').LucideIcon>} */
export const RECORD_ICONS = {
  food: Utensils,
  bowel: Toilet,
  symptom: Activity,
  water: CupSoda,
  exercise: Dumbbell,
  sleep: Moon,
};

/** Render a category icon with shared dimensions, stroke and semantic color. @param {{type:RecordKind,size?:number,color?:string}} props */
export function RecordIcon({ type, size, color }) {
  const theme = useTheme();
  const Icon = RECORD_ICONS[type];
  return <Icon
    size={size ?? theme.controls.icon}
    color={color ?? theme.colors.entry[type].fg}
    strokeWidth={theme.controls.iconStrokeWidth}
  />;
}
