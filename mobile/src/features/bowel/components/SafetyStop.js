import { useState } from 'react';
import { Linking, View } from 'react-native';
import { AppText, Button, Card, Screen, useTheme } from '../../../design-system';

export const WARNING_SIGNS = [
  { code: 'blood', label: 'Bright red blood', emergency: false },
  { code: 'black', label: 'Black or tar-like stool', emergency: true },
  { code: 'bleeding', label: 'Significant bleeding', emergency: true },
  { code: 'pain', label: 'Severe or worsening pain', emergency: true },
  { code: 'dizzy', label: 'Dizziness or feeling faint', emergency: true },
  { code: 'vomiting', label: 'Fever or repeated vomiting', emergency: false },
];

/** @param {{sign:typeof WARNING_SIGNS[number],onBack:()=>void}} props */
export function SafetyStop({ sign, onBack }) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);
  const call = async () => {
    try { await Linking.openURL('tel:112'); } catch { setFailed(true); }
  };
  return <Screen title="Get medical help first" onBack={onBack} testID="bowel-safety-stop">
    <Card>
      <AppText variant="sectionTitle">{sign.label}</AppText>
      <AppText variant="label">{sign.emergency ? 'Get medical help now' : 'Contact a doctor soon'}</AppText>
      <AppText>{sign.emergency ? 'Contact a medical service now. If you feel faint, have trouble breathing or severe pain, call 112.' : 'Contact a doctor or local medical service.'}</AppText>
    </Card>
    {sign.emergency && <Button label="Call 112" variant="danger" onPress={() => void call()} />}
    {failed && <AppText tone="danger">Could not open the phone app. Dial 112 directly.</AppText>}
    <View style={{ gap: theme.spacing.md }}>
      <AppText tone="secondary">This record will not be saved. Poop Diary does not provide diagnoses.</AppText>
      <Button label="Back to editing" variant="secondary" onPress={onBack} />
    </View>
  </Screen>;
}
