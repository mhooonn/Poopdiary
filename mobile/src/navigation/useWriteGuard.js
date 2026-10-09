import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useNavigation } from 'expo-router';

/** @param {boolean} saving @param {import('react').RefObject<boolean>} writing */
export function useWriteGuard(saving, writing) {
  const navigation = useNavigation();
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !saving });
    const listener = BackHandler.addEventListener('hardwareBackPress', () => writing.current);
    return () => listener.remove();
  }, [navigation, saving, writing]);
}
