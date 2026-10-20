import { useEffect, useRef, useState } from 'react';
import { Image, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppText, Button, Card, Sheet, useTheme } from '../../design-system';
import {
  deleteFood,
  deleteDrink,
  deleteExercise,
} from '../../data/api';
import { useBowel } from '../bowel/BowelProvider';
import { EFFORTS, LEVELS, PAIN_LOCATIONS, STOOL_TYPES, SYMPTOMS } from '../bowel/model';
import { useRecordFeedback } from '../../navigation/RecordFeedbackProvider';
import { editDestination, SOURCE_LABELS } from './model';
import { foodPhotoStore } from '../food/photoStore';

/** @param {{entry:import('./model').DiaryEntry,onClose:()=>void,onDeleted:(entry:import('./model').DiaryEntry)=>void}} props */
export function DiaryEntryDetails({ entry, onClose, onDeleted }) {
  const router = useRouter();
  const { remove } = useBowel();
  const { notify } = useRecordFeedback();
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const close = () => { if (!lock.current) onClose(); };
  const deleteEntry = async () => {
    if (lock.current) return;
    lock.current = true;
    setDeleting(true); setError('');
    let photoCleanupFailed = false;
    try {
      
      if (entry.kind === 'bowel') {
        await remove(entry.id);
      } else if (entry.kind === 'food') {
        await deleteFood(entry.id);
        try {
          await foodPhotoStore.removePhoto(entry.id);
        } catch {
          photoCleanupFailed = true;
        }
      } else if (entry.kind === 'exercise') {
        await deleteExercise(entry.id);
      } else {
        await deleteDrink(entry.id);
      }

      onDeleted(entry);
      notify(photoCleanupFailed ? 'Entry deleted. Could not remove its photo from this device.' : 'Entry deleted');
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not delete entry.');
      lock.current = false; setDeleting(false);
    }
  };
  return <Sheet visible title={confirm ? 'Delete entry?' : `${SOURCE_LABELS[entry.kind]} entry`} onClose={close} dismissible={!deleting}>
    {confirm ? <>
      <AppText>This cannot be undone.</AppText>
      <Button label="Delete entry" variant="danger" loading={deleting} disabled={deleting} onPress={() => void deleteEntry()} testID="diary-delete-confirm" />
      <Button label="Cancel" variant="secondary" disabled={deleting} onPress={() => { setConfirm(false); setError(''); }} testID="diary-delete-cancel" />
    </> : <>
      <AppText variant="sectionTitle">{entry.title}</AppText>
      <AppText tone="secondary">{new Date(`${entry.localDate}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {entry.time || 'Time not recorded'}</AppText>
      <EntryBody entry={entry} />
      <Button label="Edit" onPress={() => { onClose(); router.push(editDestination(entry)); }} testID="diary-edit" />
      <Button label="Delete" variant="danger" onPress={() => setConfirm(true)} testID="diary-delete" />
    </>}
    {error !== '' && <AppText tone="danger" accessibilityLiveRegion="polite" testID="diary-delete-error">{error}</AppText>}
  </Sheet>;
}

/** @param {{entry:import('./model').DiaryEntry}} props */
function EntryBody({ entry }) {
  if (entry.kind === 'food') return <>
    <AppText>{entry.record.food_name}</AppText>
    <FoodPhotoDetails foodId={entry.id} />
    {entry.record.notes ? <Card><AppText variant="label">Note</AppText><AppText>{entry.record.notes}</AppText></Card> : null}
  </>;
  if (entry.kind === 'water') return <>
    <AppText>{entry.record.amount_ml} ml</AppText>
    {entry.record.note ? <Card><AppText variant="label">Note</AppText><AppText>{entry.record.note}</AppText></Card> : null}
  </>;
  
  if (entry.kind === 'exercise') return (
    <>
      <AppText variant="label">
        Exercise type
      </AppText>
      <AppText>{entry.record.exercise_type}</AppText>

      <AppText variant="label">
        Duration
      </AppText>
      <AppText>
        {entry.record.duration_minutes} minutes
      </AppText>

      {entry.record.notes ? (
        <Card>
          <AppText variant="label">Notes</AppText>
          <AppText>{entry.record.notes}</AppText>
        </Card>
      ) : null}
    </>
  );

  const record = entry.record;
  /** @param {string|null} value */
  const level = (value) => LEVELS.find((option) => option.code === value)?.label || 'Not recorded';
  return <>
    <AppText>{STOOL_TYPES.find((option) => option.code === record.stool_type)?.description || 'Shape not recorded'}</AppText>
    {record.effort !== null && <AppText>{EFFORTS.find((option) => option.code === record.effort)?.label}</AppText>}
    {record.symptoms.map((code) => <AppText key={code}>{SYMPTOMS.find((option) => option.code === code)?.label}{code === 'bloating' ? ` · ${level(record.bloating_level)}` : code === 'urgency' ? ` · ${level(record.urgency_level)}` : code === 'pain' ? ` · ${record.pain_level === null ? 'Not recorded' : `${record.pain_level}/10`}${record.pain_location ? ` · ${PAIN_LOCATIONS.find((option) => option.code === record.pain_location)?.label}` : ''}` : ''}</AppText>)}
    {record.notes !== '' && <Card><AppText variant="label">Note</AppText><AppText>{record.notes}</AppText></Card>}
  </>;
}

/** @param {{foodId:number}} props */
function FoodPhotoDetails({ foodId }) {
  const theme = useTheme();
  const [uri, setUri] = useState(/** @type {string|null} */ (null));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void foodPhotoStore.getPhotoUri(foodId)
      .then((value) => { if (active) setUri(value); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [foodId]);

  if (Platform.OS === 'web') return <AppText tone="secondary">Meal photos are available on the device where they were added.</AppText>;
  if (!uri) return failed ? <AppText tone="secondary">Meal photo is unavailable on this device.</AppText> : null;

  return <View style={{ gap: theme.spacing.sm }}>
    <AppText variant="label">Meal photo</AppText>
    <View style={{ width: '100%', aspectRatio: 4 / 3, maxHeight: 360, overflow: 'hidden', borderRadius: theme.radius.md, borderWidth: theme.controls.borderWidth, borderColor: theme.colors.border.default, backgroundColor: theme.colors.surface.subtle }}>
      <Image source={{ uri }} accessibilityLabel="Meal photo" resizeMode="contain" style={{ width: '100%', height: '100%' }} />
    </View>
    <AppText variant="caption" tone="secondary">Stored on this device only.</AppText>
  </View>;
}
