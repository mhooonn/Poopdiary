import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRecordFeedback } from '../../navigation/RecordFeedbackProvider';
import { createBowel, deleteBowel, getBowel, listBowel, updateBowel } from '../../data/api';
import { bowelError } from './errors';

/** @typedef {import('./model').BowelRecord} BowelRecord */
/** @typedef {import('./model').BowelDraft} BowelDraft */
/** @typedef {{records:BowelRecord[],status:'idle'|'loading'|'ready'|'error',error:string,refresh:()=>Promise<void>,get:(id:number)=>Promise<BowelRecord>,save:(draft:BowelDraft,id?:number)=>Promise<BowelRecord>,remove:(id:number)=>Promise<void>,notify:(text:string)=>void}} BowelState */
const Context = createContext(/** @type {BowelState|null} */ (null));

/** @param {{children:import('react').ReactNode}} props */
export function BowelProvider({ children }) {
  const { notify } = useRecordFeedback();
  const [records, setRecords] = useState(/** @type {BowelRecord[]} */ ([]));
  const [status, setStatus] = useState(/** @type {BowelState['status']} */ ('idle'));
  const [error, setError] = useState('');
  const revision = useRef(0);
  const request = useRef(/** @type {AbortController|null} */ (null));

  useEffect(() => () => request.current?.abort(), []);

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

  return <Context.Provider value={{ records, status, error, refresh, get: getBowel, save, remove, notify }}>
    {children}
  </Context.Provider>;
}

export function useBowel() {
  const state = useContext(Context);
  if (!state) throw new Error('BowelProvider is required.');
  return state;
}
