import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, useTheme } from '../../design-system';
import { createBowel, deleteBowel, getBowel, listBowel, updateBowel } from '../../data/api';
import { bowelError } from './errors';

/** @typedef {import('./model').BowelRecord} BowelRecord */
/** @typedef {import('./model').BowelDraft} BowelDraft */
/** @typedef {{records:BowelRecord[],status:'idle'|'loading'|'ready'|'error',error:string,refresh:()=>Promise<void>,get:(id:number)=>Promise<BowelRecord>,save:(draft:BowelDraft,id?:number)=>Promise<BowelRecord>,remove:(id:number)=>Promise<void>,notify:(text:string)=>void}} BowelState */
const Context = createContext(/** @type {BowelState|null} */ (null));

/** @param {{children:import('react').ReactNode}} props */
export function BowelProvider({ children }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [records, setRecords] = useState(/** @type {BowelRecord[]} */ ([]));
  const [status, setStatus] = useState(/** @type {BowelState['status']} */ ('idle'));
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const revision = useRef(0);
  const request = useRef(/** @type {AbortController|null} */ (null));

  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(''), 2400);
    return () => clearTimeout(timer);
  }, [feedback]);

  const refresh = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const ticket = ++revision.current;
    setStatus('loading');
    setError('');
    try {
      const entries = await listBowel({ signal: controller.signal });
      if (ticket === revision.current) { setRecords(entries); setStatus('ready'); }
    } catch (failure) {
      if (ticket === revision.current && !controller.signal.aborted) {
        setStatus('error');
        setError(bowelError(failure, 'load'));
      }
    }
  }, []);

  /** @type {BowelState['save']} */
  const save = useCallback(async (draft, id) => {
    const saved = id === undefined ? await createBowel(draft) : await updateBowel(id, draft);
    ++revision.current;
    request.current?.abort();
    setRecords((current) => [...current.filter((item) => item.id !== saved.id), saved]
      .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)));
    setStatus('ready');
    setError('');
    return saved;
  }, []);

  /** @type {BowelState['remove']} */
  const remove = useCallback(async (id) => {
    await deleteBowel(id);
    ++revision.current;
    request.current?.abort();
    setRecords((current) => current.filter((item) => item.id !== id));
    setStatus('ready');
    setError('');
  }, []);

  return <Context.Provider value={{ records, status, error, refresh, get: getBowel, save, remove, notify: setFeedback }}>
    {children}
    {feedback !== '' && <View pointerEvents="none" role="status" accessibilityLiveRegion="polite" testID="bowel-feedback"
      style={{ position: 'absolute', top: insets.top + theme.spacing.lg, left: theme.spacing.md, right: theme.spacing.md, alignItems: 'center' }}>
      <View style={{ maxWidth: theme.controls.contentWidth, paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.md,
        borderRadius: theme.radius.md, backgroundColor: theme.colors.feedback.success.bg,
        borderColor: theme.colors.feedback.success.fg, borderWidth: theme.controls.borderWidth }}>
        <AppText variant="label" style={{ color: theme.colors.feedback.success.fg }}>{feedback}</AppText>
      </View>
    </View>}
  </Context.Provider>;
}

export function useBowel() {
  const state = useContext(Context);
  if (!state) throw new Error('BowelProvider is required.');
  return state;
}
