import { useRouter } from 'expo-router';
import { FileText } from 'lucide-react-native';
import { IconButton } from '../../design-system';
import { BlankScreen } from '../../navigation/BlankScreen';

export default function InsightsRoute() {
  const router = useRouter();
  return <BlankScreen title="Insights" right={<IconButton label="Report" icon={FileText} onPress={() => router.push('/report')} testID="open-report" />} />;
}
