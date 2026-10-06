import { useLocalSearchParams } from 'expo-router';
import { BowelEditorScreen } from '../features/bowel/BowelEditorScreen';

export default function BowelRoute() {
  const { edit } = useLocalSearchParams();
  return <BowelEditorScreen key={typeof edit === 'string' ? edit : 'new'} id={typeof edit === 'string' ? edit : undefined} />;
}
