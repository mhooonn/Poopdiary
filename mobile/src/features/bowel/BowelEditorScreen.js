import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, View, useWindowDimensions } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { AlertTriangle, Clock3, X } from 'lucide-react-native';
import { AppText, Button, Card, Choice, IconButton, NoteField, Screen, Sheet, Slider, useTheme } from '../../design-system';
import { useBack } from '../../navigation/useBack';
import { getBowel } from '../../data/api';
import { useBowel } from './BowelProvider';
import { bowelError } from './errors';
import { adjacentStep, createForm, createPayload, detailSteps, EFFORTS, LEVELS, PAIN_LOCATIONS, STOOL_TYPES, SYMPTOMS, toggleSymptom } from './model';
import { DateTimeSheet } from './components/DateTimeSheet';
import { SafetyStop, WARNING_SIGNS } from './components/SafetyStop';
import { StoolShape } from './components/StoolShape';

/** @param {{id?:string}} props */
export function BowelEditorScreen({ id }) {
  const theme = useTheme();
  const back = useBack('/diary');
  const [record, setRecord] = useState(/** @type {import('./model').BowelRecord|undefined} */ (undefined));
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(Boolean(id));
  useEffect(() => {
    if (!id) return undefined;
    const controller = new AbortController();
    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
      return undefined;
    }
    void getBowel(Number(id), { signal: controller.signal }).then((value) => {
      if (!controller.signal.aborted) { setRecord(value); setLoading(false); }
    }).catch((failure) => {
      if (!controller.signal.aborted) { setError(bowelError(failure, 'load')); setLoading(false); }
    });
    return () => controller.abort();
  }, [id, attempt]);
  if (id && (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id)))) return <Screen title="Record not found" onBack={back}><Button label="Back" onPress={back} /></Screen>;
  if (id && (loading || error || !record)) return <Screen title="Edit bowel record" onBack={back} testID="bowel-load">
    {loading ? <><ActivityIndicator color={theme.colors.text.primary} /><AppText>Loading record…</AppText></> : <>
      <AppText tone="danger" accessibilityLiveRegion="polite">{error || 'Record not found.'}</AppText>
      <Button label="Retry" onPress={() => { setLoading(true); setError(''); setAttempt((value) => value + 1); }} />
    </>}
  </Screen>;
  return <BowelEditorForm key={id ?? 'new'} record={record} />;
}

/** @param {{record?:import('./model').BowelRecord}} props */
function BowelEditorForm({ record }) {
  const theme = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const { save, notify } = useBowel();
  const { width, fontScale } = useWindowDimensions();
  const [form, setForm] = useState(() => createForm(record));
  const [step, setStep] = useState(/** @type {import('./model').BowelStep} */ ('shape'));
  const [sheet, setSheet] = useState(/** @type {'guide'|'time'|'safety'|null} */ (null));
  const [warning, setWarning] = useState(/** @type {typeof WARNING_SIGNS[number]|null} */ (null));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showNote, setShowNote] = useState(Boolean(record?.notes));
  const [gridWidth, setGridWidth] = useState(Math.min(width, theme.controls.contentWidth) - theme.spacing.md * 2);
  const writing = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const back = useCallback(() => {
    if (writing.current) return;
    if (warning) { setWarning(null); return; }
    const previous = adjacentStep(step, form, 'previous');
    if (previous) setStep(previous);
    else if (router.canGoBack()) router.back();
    else router.replace('/diary');
  }, [form, step, warning, router]);
  useEffect(() => {
    // The native gesture leaves the route; later questions use in-flow Back.
    navigation.setOptions({ gestureEnabled: step === 'shape' && !saving && !warning && sheet === null });
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true; });
    return () => listener.remove();
  }, [navigation, back, step, saving, warning, sheet]);

  /** @param {Partial<import('./model').BowelForm>} changes */
  const patch = (changes) => { if (!writing.current) { setForm((current) => ({ ...current, ...changes })); setError(''); } };
  const persist = async () => {
    if (writing.current || form.stoolType === undefined || warning || sheet === 'safety') return;
    writing.current = true; setSaving(true); setError('');
    try {
      const saved = await save(createPayload(form, record), record?.id);
      if (mounted.current) {
        notify(record ? 'Changes saved' : 'Bowel record saved');
        router.dismissTo({ pathname: '/diary', params: { date: createForm(saved).date } });
      }
    } catch (failure) {
      if (mounted.current) setError(bowelError(failure, 'save'));
    } finally {
      writing.current = false;
      if (mounted.current) setSaving(false);
    }
  };
  const continueFlow = () => {
    const next = adjacentStep(step, form);
    if (next) setStep(next);
  };
  if (warning) return <SafetyStop sign={warning} onBack={() => setWarning(null)} />;

  const readableWidth = gridWidth / fontScale;
  const columns = readableWidth >= theme.controls.minimumTouchTarget * 6 ? 2 : 1;
  const severityColumns = readableWidth >= theme.controls.minimumTouchTarget * 6 ? 3 : 1;
  const row = { flexDirection: /** @type {const} */ ('row'), flexWrap: /** @type {const} */ ('wrap'), gap: theme.spacing.sm };
  /** @param {number} count */
  const cell = (count) => ({ width: Math.max(0, (gridWidth - theme.spacing.sm * (count - 1)) / count) });
  const finalStep = step === 'shape' || step === 'time';
  const headings = { shape: 'Stool shape', effort: 'How did it feel?', symptoms: 'Other symptoms', bloating: 'Bloating', pain: 'Abdominal pain', urgency: 'Urgency', time: 'Date & time' };
  const shape = STOOL_TYPES.find((option) => option.code === form.stoolType);
  const stepCount = ['shape', 'effort', 'symptoms', ...detailSteps(form.symptoms), 'time'];
  const timeLabel = `${new Date(`${form.date}T12:00:00`).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })} · ${form.time}`;

  return <Screen key={step} title={record ? 'Edit bowel' : 'Bowel'} onBack={back} testID="bowel-editor"
    right={step !== 'shape' ? <IconButton icon={X} label="Close editor" onPress={() => { if (!writing.current) router.dismissTo('/diary'); }} disabled={saving} /> : undefined}
    footer={<View style={{ gap: theme.spacing.sm }}>
      {error !== '' && <AppText tone="danger" accessibilityLiveRegion="assertive" testID="bowel-save-error">{error}</AppText>}
      <Button label={finalStep ? (record ? 'Save changes' : 'Save') : 'Continue'} onPress={() => { if (finalStep) void persist(); else continueFlow(); }}
        loading={saving} disabled={form.stoolType === undefined} testID={finalStep ? 'bowel-save' : 'bowel-continue'} />
      {step === 'shape' && <Button label="More details" variant="text" disabled={saving || form.stoolType === undefined} onPress={continueFlow} testID="bowel-details" />}
    </View>}>
    <View onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)} style={{ gap: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: theme.spacing.sm }}>
        <AppText variant="sectionTitle" accessibilityRole="header">{headings[step]}</AppText>
        {step !== 'shape' && <AppText variant="caption" tone="secondary">{stepCount.indexOf(step) + 1} / {stepCount.length}</AppText>}
      </View>
      {step === 'shape' && <>
        <View style={row} accessibilityRole="radiogroup" accessibilityLabel="Stool shape">
          {STOOL_TYPES.filter((option) => option.code !== null).map((option) => <View key={option.code} style={cell(columns)}>
            <Choice label={option.label} badge={String(option.code)} layout="tile" density="compact" icon={<StoolShape type={option.code} />}
              selected={form.stoolType === option.code} onPress={() => patch({ stoolType: option.code })} disabled={saving}
              style={{ minHeight: theme.controls.bowelTileHeight, height: '100%' }} testID={`bowel-type-${option.code}`} />
          </View>)}
          <View style={cell(columns)}><Choice label="Not sure" layout="tile" density="compact" badge="?"
            icon={<AppText variant="pageTitle" style={{ color: theme.colors.entry.bowel.fg }}>?</AppText>}
            selected={form.stoolType === null} onPress={() => patch({ stoolType: null })} disabled={saving}
            style={{ minHeight: theme.controls.bowelTileHeight, height: '100%' }} testID="bowel-type-unknown" /></View>
        </View>
        <Button label={timeLabel} variant="secondary" icon={<Clock3 size={theme.controls.icon} color={theme.colors.text.primary} />} onPress={() => setSheet('time')} disabled={saving} testID="bowel-time" />
        <Button label="Shape guide" variant="text" onPress={() => setSheet('guide')} disabled={saving} />
        <Button label="Blood, black stool or severe discomfort?" variant="secondary" icon={<AlertTriangle size={theme.controls.icon} color={theme.colors.text.primary} />} onPress={() => setSheet('safety')} disabled={saving} testID="bowel-warning-signs" />
      </>}
      {step === 'effort' && <>
        <Card style={{ backgroundColor: theme.colors.entry.bowel.bg }}><AppText variant="label" style={{ color: theme.colors.entry.bowel.fg }}>{form.stoolType === null ? 'Not sure' : `Type ${form.stoolType}`} · {shape?.label}</AppText></Card>
        <View style={row} accessibilityRole="radiogroup" accessibilityLabel="Effort">
          {EFFORTS.map((option) => <View key={option.code} style={cell(columns)}><Choice label={option.label} selected={form.effort === option.code} onPress={() => patch({ effort: option.code })} disabled={saving} testID={`bowel-effort-${option.code}`} /></View>)}
        </View>
        <Choice label="Not recorded" selected={form.effort === null} onPress={() => patch({ effort: null })} disabled={saving} />
      </>}
      {step === 'symptoms' && <>
        <View style={row}>
          {SYMPTOMS.map((option) => <View key={option.code} style={cell(columns)}><Choice label={option.label} selectionRole="checkbox" selected={form.symptoms.includes(option.code)} onPress={() => { if (!writing.current) setForm((current) => toggleSymptom(current, option.code)); }} disabled={saving} testID={`bowel-symptom-${option.code}`} /></View>)}
          <View style={cell(columns)}><Choice label="None" selected={form.symptoms.length === 0} onPress={() => patch({ symptoms: [] })} disabled={saving} testID="bowel-symptom-none" /></View>
        </View>
        <Button label="Warning signs" variant="secondary" onPress={() => setSheet('safety')} disabled={saving} />
      </>}
      {(step === 'bloating' || step === 'urgency') && <View style={row} accessibilityRole="radiogroup" accessibilityLabel={headings[step]}>
        {LEVELS.map((option) => <View key={option.code} style={cell(severityColumns)}><Choice label={step === 'urgency' ? { mild: 'A little urgent', moderate: 'Urgent', severe: 'Almost too late' }[option.code] : option.label}
          layout="tile" density="compact" tone={option.code} selected={(step === 'bloating' ? form.bloatingLevel : form.urgencyLevel) === option.code}
          onPress={() => patch(step === 'bloating' ? { bloatingLevel: option.code } : { urgencyLevel: option.code })} disabled={saving} testID={`bowel-${step}-${option.code}`} /></View>)}
      </View>}
      {step === 'pain' && <>
        <Slider label="Pain level" value={form.painLevel ?? 0} valueLabel={form.painLevel === null ? 'Not recorded' : undefined} onChange={(value) => patch({ painLevel: value })} disabled={saving} testID="bowel-pain-slider" />
        <AppText variant="label">Location</AppText>
        <View style={row} accessibilityRole="radiogroup" accessibilityLabel="Pain location">
          {PAIN_LOCATIONS.map((option) => <View key={option.code} style={cell(columns)}><Choice label={option.label} selected={form.painLocation === option.code} onPress={() => patch({ painLocation: option.code })} disabled={saving} testID={`bowel-location-${option.code}`} /></View>)}
        </View>
      </>}
      {step === 'time' && <>
        <Button label={timeLabel} variant="secondary" onPress={() => setSheet('time')} disabled={saving} testID="bowel-time" />
        <Button label={showNote ? 'Hide note' : 'Add a note'} variant="text" onPress={() => setShowNote(!showNote)} expanded={showNote} disabled={saving} />
        {showNote && <NoteField value={form.notes} onChange={(notes) => patch({ notes })} disabled={saving} testID="bowel-note" />}
      </>}
    </View>
    <DateTimeSheet visible={sheet === 'time'} date={form.date} time={form.time} onClose={() => setSheet(null)} onApply={(date, time) => { patch({ date, time }); setSheet(null); }} />
    <Sheet visible={sheet === 'guide'} title="Shape guide" onClose={() => setSheet(null)}>
      {STOOL_TYPES.filter((option) => option.code !== null).map((option) => <Choice key={option.code} label={`Type ${option.code} · ${option.label}`} description={option.description} icon={<StoolShape type={option.code} />}
        selected={form.stoolType === option.code} onPress={() => { patch({ stoolType: option.code }); setSheet(null); }} />)}
    </Sheet>
    <Sheet visible={sheet === 'safety'} title="Warning signs" onClose={() => setSheet(null)}>
      {WARNING_SIGNS.map((sign) => <Choice key={sign.code} label={sign.label} selected={false} onPress={() => { setSheet(null); setWarning(sign); }} testID={`bowel-warning-${sign.code}`} />)}
    </Sheet>
  </Screen>;
}
