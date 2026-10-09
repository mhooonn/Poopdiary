import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { listFood, listBowel, listDrinks } from '../../data/api';
import { diaryEntries } from './model';

/** @typedef {import('./model').DiaryKind} DiaryKind */
/** @typedef {{kind:DiaryKind,message:string}} SourceError */
/** @typedef {{records:import('./model').DiaryRecords,errors:SourceError[],loading:boolean}} DiaryState */

/** Shared read model; one failed endpoint must not hide the other two.
 * @param {string} date */
export function useDiaryEntries(date) {
  const [state, setState] = useState(/** @type {DiaryState} */ ({ records: { food: [], bowel: [], water: [] }, errors: [], loading: true }));
  const revision = useRef(0);
  const request = useRef(/** @type {AbortController|null} */ (null));
  const cancel = useCallback(() => { ++revision.current; request.current?.abort(); }, []);
  const refresh = useCallback(async () => {
    cancel();
    const controller = new AbortController();
    request.current = controller;
    const ticket = revision.current;
    setState((current) => ({ ...current, errors: [], loading: true }));
    const options = { signal: controller.signal };
    const [food, bowel, water] = await Promise.allSettled([listFood(options), listBowel(options), listDrinks(options)]);
    if (ticket !== revision.current || controller.signal.aborted) return;
    /** @type {SourceError[]} */
    const errors = [];
    const results = /** @type {const} */ ([['food', food], ['bowel', bowel], ['water', water]]);
    for (const [kind, result] of results) {
      if (result.status === 'rejected') errors.push({ kind, message: result.reason instanceof Error ? result.reason.message : 'Could not load entries.' });
    }
    setState({ records: { food: food.status === 'fulfilled' ? food.value : [], bowel: bowel.status === 'fulfilled' ? bowel.value : [], water: water.status === 'fulfilled' ? water.value : [] }, errors, loading: false });
  }, [cancel]);
  useFocusEffect(useCallback(() => { void refresh(); return cancel; }, [refresh, cancel]));

  /** Called only after the server confirms deletion; cancel older reads first.
   * @param {import('./model').DiaryEntry} entry */
  const removeEntry = useCallback((/** @type {import('./model').DiaryEntry} */ entry) => {
    cancel();
    setState((current) => ({ ...current, loading: false, records: {
      food: current.records.food.filter((row) => entry.kind !== 'food' || row.id !== entry.id),
      bowel: current.records.bowel.filter((row) => entry.kind !== 'bowel' || row.id !== entry.id),
      water: current.records.water.filter((row) => entry.kind !== 'water' || row.id !== entry.id),
    } }));
    void refresh();
  }, [cancel, refresh]);
  return { entries: diaryEntries(state.records, date), errors: state.errors, loading: state.loading, refresh, removeEntry };
}
