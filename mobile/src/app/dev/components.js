import { ComponentsScreen } from '../../screens/ComponentsScreen';
import { useBack } from '../../navigation/useBack';

export default function ComponentsRoute() {
  const goBack = useBack('/dev');
  return <ComponentsScreen onBack={goBack} />;
}
