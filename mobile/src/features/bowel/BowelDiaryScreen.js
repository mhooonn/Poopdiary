import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import { AppText, Button, Card, IconButton, Screen, Sheet, useTheme } from '../../design-system';
import { useBowel } from './BowelProvider';
import { bowelError } from './errors';
import { createForm, EFFORTS, formatDate, PAIN_LOCATIONS, STOOL_TYPES, SYMPTOMS } from './model';
import { StoolShape } from './components/StoolShape';

/** @param {import('./model').BowelRecord} record */
function title(record) { return record.stool_type === null ? 'Not sure' : `Type ${record.stool_type}`; }
/** @param {import('./model').BowelRecord} record */
function summary(record) {
  const effort = EFFORTS.find((option) => option.code === record.effort)?.label;
  return [effort, ...record.symptoms.map((code) => SYMPTOMS.find((option) => option.code === code)?.label)].filter(Boolean).join(' · ');
}

export function BowelDiaryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { records, status, error, refresh } = useBowel();
  const [selected, setSelected] = useState(/** @type {number|null} */ (null));
  const requestedDate = typeof params.date === 'string' ? params.date : '';
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) ? new Date(`${requestedDate}T12:00:00`) : null;
  const date = parsedDate && Number.isFinite(parsedDate.getTime()) && formatDate(parsedDate) === requestedDate ? requestedDate : formatDate(new Date());
  /** @param {string} value */
  const setDate = (value) => router.setParams({ date: value });
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  const entries = records.filter((record) => createForm(record).date === date);
  const current = records.find((record) => record.id === selected);
  /** @param {number} direction */
  const changeDate = (direction) => {
    const value = new Date(`${date}T12:00:00`); value.setDate(value.getDate() + direction); setDate(formatDate(value));
  };
  return <Screen title="Diary" testID="bowel-diary" right={<IconButton icon={Plus} label="Add bowel record" onPress={() => router.push('/bowel')} testID="diary-add-bowel" />}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
      <IconButton icon={ChevronLeft} label="Previous day" onPress={() => changeDate(-1)} testID="diary-previous" />
      <AppText variant="sectionTitle" style={{ flex: 1, textAlign: 'center' }} testID="diary-date">{new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</AppText>
      <IconButton icon={ChevronRight} label="Next day" onPress={() => changeDate(1)} testID="diary-next" />
    </View>
    {date !== formatDate(new Date()) && <Button label="Today" variant="text" onPress={() => setDate(formatDate(new Date()))} />}
    <AppText variant="label" accessibilityRole="header">Bowel movements</AppText>
    {(status === 'idle' || status === 'loading') && <View style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' }}>
      <ActivityIndicator color={theme.colors.text.primary} /><AppText variant="caption" tone="secondary">Loading records…</AppText>
    </View>}
    {status === 'error' && <Card>
      <AppText tone="danger" accessibilityLiveRegion="polite" testID="bowel-list-error">{error}</AppText>
      <Button label="Retry" onPress={() => void refresh()} />
    </Card>}
    {entries.map((record) => <Pressable key={record.id} onPress={() => setSelected(record.id)} accessibilityRole="button" accessibilityLabel={`${title(record)}, ${createForm(record).time}${summary(record) ? `, ${summary(record)}` : ''}`}
      testID={`bowel-entry-${record.id}`} style={({ pressed }) => ({ borderRadius: theme.radius.lg, backgroundColor: pressed ? theme.colors.surface.subtle : theme.colors.surface.card,
        padding: theme.spacing.md, borderWidth: theme.controls.borderWidth, borderColor: theme.colors.border.control,
        minHeight: theme.controls.minimumTouchTarget, gap: theme.spacing.sm })}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <StoolShape type={record.stool_type} />
        <View style={{ flex: 1, gap: theme.spacing.xs }}>
          <AppText variant="sectionTitle">{title(record)}</AppText>
          <AppText variant="caption" tone="secondary">{STOOL_TYPES.find((option) => option.code === record.stool_type)?.label}</AppText>
        </View>
        <AppText variant="label" style={{ fontVariant: ['tabular-nums'] }}>{createForm(record).time}</AppText>
      </View>
      {summary(record) !== '' && <AppText variant="caption">{summary(record)}</AppText>}
    </Pressable>)}
    {status === 'ready' && entries.length === 0 && <Card testID="bowel-empty">
      <AppText tone="secondary">No bowel records for this day.</AppText>
      <Button label="Add bowel record" variant="secondary" onPress={() => router.push('/bowel')} />
    </Card>}
    {current && <BowelDetails record={current} onClose={() => setSelected(null)} />}
  </Screen>;
}

/** @param {{record:import('./model').BowelRecord,onClose:()=>void}} props */
function BowelDetails({ record, onClose }) {
  const theme = useTheme();
  const router = useRouter();
  const { remove, notify, refresh } = useBowel();
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const deletingLock = useRef(false);
  const form = createForm(record);
  const deleteRecord = async () => {
    if (deletingLock.current) return;
    deletingLock.current = true;
    setDeleting(true); setError('');
    try {
      await remove(record.id); notify('Bowel record deleted'); onClose();
    } catch (failure) {
      setError(bowelError(failure, 'delete'));
      deletingLock.current = false;
      setDeleting(false);
    }
  };
  const levelLabel = (/** @type {string|null} */ level) => level ? `${level[0].toUpperCase()}${level.slice(1)}` : 'Not recorded';
  return <Sheet visible title={confirm ? 'Delete bowel record?' : 'Bowel record'} onClose={onClose} dismissible={!deleting}>
    {confirm ? <>
      <AppText>This cannot be undone.</AppText>
      <Button label="Delete record" variant="danger" onPress={() => void deleteRecord()} loading={deleting} testID="bowel-delete-confirm" />
      <Button label="Cancel" variant="secondary" onPress={() => setConfirm(false)} disabled={deleting} />
    </> : <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <StoolShape type={record.stool_type} /><View style={{ flex: 1, gap: theme.spacing.xs }}>
          <AppText variant="sectionTitle">{title(record)}</AppText>
          <AppText>{STOOL_TYPES.find((option) => option.code === record.stool_type)?.description}</AppText>
        </View>
      </View>
      <AppText tone="secondary">{new Date(record.occurred_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {form.time}</AppText>
      {record.effort !== null && <AppText>{EFFORTS.find((option) => option.code === record.effort)?.label}</AppText>}
      {record.symptoms.map((code) => <AppText key={code}>{SYMPTOMS.find((option) => option.code === code)?.label}{code === 'bloating' ? ` · ${levelLabel(record.bloating_level)}` : code === 'urgency' ? ` · ${levelLabel(record.urgency_level)}` : code === 'pain' ? ` · ${record.pain_level === null ? 'Not recorded' : `${record.pain_level}/10`}${record.pain_location ? ` · ${PAIN_LOCATIONS.find((option) => option.code === record.pain_location)?.label}` : ''}` : ''}</AppText>)}
      {record.notes !== '' && <Card><AppText variant="label">Note</AppText><AppText>{record.notes}</AppText></Card>}
      <Button label="Edit" onPress={() => { onClose(); router.push({ pathname: '/bowel', params: { edit: String(record.id) } }); }} testID="bowel-edit" />
      <Button label="Delete" variant="danger" onPress={() => setConfirm(true)} testID="bowel-delete" />
    </>}
    {error !== '' && <><AppText tone="danger" accessibilityLiveRegion="polite">{error}</AppText><Button label="Reload records" variant="text" onPress={() => { onClose(); void refresh(); }} /></>}
  </Sheet>;
}
