import { useRouter } from 'expo-router';
import { Code2 } from 'lucide-react-native';
import { IconButton } from '../../design-system';
import { BlankScreen } from '../../navigation/BlankScreen';

export default function ProfileRoute() {
  const router = useRouter();
  return <BlankScreen title="Profile" right={<IconButton label="Developer tools" icon={Code2} onPress={() => router.push('/dev')} testID="open-dev" />} />;
}
