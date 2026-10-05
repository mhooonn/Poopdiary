import { DeveloperScreen } from '../../screens/DeveloperScreen';
import { useBack } from '../../navigation/useBack';

export default function DeveloperRoute() {
  const goBack = useBack('/profile');
  return <DeveloperScreen onBack={goBack} />;
}
