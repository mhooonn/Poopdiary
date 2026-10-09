import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, useTheme } from '../design-system';

const Context = createContext(/** @type {{notify:(message:string)=>void}|null} */ (null));

/** @param {{children:import('react').ReactNode}} props */
export function RecordFeedbackProvider({ children }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [notice, setNotice] = useState({ message: '', revision: 0 });
  const notify = useCallback(/** @type {(next:string)=>void} */ ((next) => setNotice((current) => ({ message: next, revision: current.revision + 1 }))), []);
  useEffect(() => {
    if (!notice.message) return undefined;
    const timer = setTimeout(() => setNotice((current) => ({ ...current, message: '' })), 2400);
    return () => clearTimeout(timer);
  }, [notice]);
  const value = useMemo(() => ({ notify }), [notify]);
  return <Context.Provider value={value}>
    {children}
    {notice.message !== '' && <View pointerEvents="none" role="status" accessibilityLiveRegion="polite" testID="record-feedback" style={{ position: 'absolute', top: insets.top + theme.spacing.lg, left: theme.spacing.md, right: theme.spacing.md, alignItems: 'center' }}>
      <View style={{ maxWidth: theme.controls.contentWidth, paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.feedback.success.bg, borderColor: theme.colors.feedback.success.fg, borderWidth: theme.controls.borderWidth }}>
        <AppText variant="label" style={{ color: theme.colors.feedback.success.fg }}>{notice.message}</AppText>
      </View>
    </View>}
  </Context.Provider>;
}

export function useRecordFeedback() {
  const feedback = useContext(Context);
  if (!feedback) throw new Error('RecordFeedbackProvider is required.');
  return feedback;
}
