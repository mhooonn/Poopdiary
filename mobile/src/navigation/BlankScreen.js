import { Screen } from '../design-system';
import { useBack } from './useBack';

/** @param {{title: string, back?: boolean, right?: import('react').ReactNode}} props */
export function BlankScreen({ title, back = false, right }) {
  const goBack = useBack();
  return <Screen title={title} onBack={back ? goBack : undefined} right={right} scroll={false} testID="blank-screen">{null}</Screen>;
}
