import { useRouter } from 'expo-router';
import { Code2 } from 'lucide-react-native';
import { IconButton, Screen } from '../../design-system';
import { ReminderSettings } from '../../features/reminders/ReminderSettings';

export default function ProfileRoute() {
  const router = useRouter();
  return <Screen title="Profile" right={<IconButton label="Developer tools" icon={Code2} onPress={() => router.push('/dev')} testID="open-dev" />}>
    <ReminderSettings />
  </Screen>;
}
