import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { AppText, Button, useTheme } from '../../design-system';
import { listDrinks } from '../../data/api';

/** @type {Record<string,string>} */
const DRINK_LABELS = {
  water: 'Water',
  coffee: 'Coffee',
  tea: 'Tea',
  soda: 'Soda',
  juice: 'Juice',
  milk: 'Milk',
  alcohol: 'Alcohol',
  custom: 'Other',
};

/** @param {string} iso */
function formatTime(iso) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Drinks-only compatibility preview; the shared Diary owns the main timeline.
 * @param {{date:string}} props
 */
export function TodayDrinks({ date }) {
  const theme = useTheme();
  const router = useRouter();
  const [drinks, setDrinks] = useState(/** @type {{id:number,amount_ml:number,drink_type:string,logged_at:string,local_date:string,note:string|null}[]} */ ([]));
  const [status, setStatus] = useState(/** @type {'loading'|'ready'|'error'} */ ('loading'));
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      void retryKey;
      const controller = new AbortController();
      setStatus('loading'); setError('');
      void listDrinks({ signal: controller.signal }).then((records) => {
        if (!controller.signal.aborted) { setDrinks(records); setStatus('ready'); }
      }).catch((failure) => {
        if (!controller.signal.aborted) {
          setError(failure instanceof Error ? failure.message : 'Could not load drinks.');
          setStatus('error');
        }
      });
      return () => controller.abort();
    }, [retryKey])
  );

  const entries = drinks.filter((drink) => drink.local_date === date)
    .sort((a, b) => a.logged_at.localeCompare(b.logged_at));
  const totalMl = entries.reduce((sum, drink) => sum + drink.amount_ml, 0);

  return (
    <View style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <View
        style={{
          padding: theme.spacing.md,
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.beverage.water.bg,
          gap: theme.spacing.xs,
        }}
      >
        <AppText variant="eyebrow" style={{ color: theme.colors.beverage.water.fg }}>
          DRINKS TODAY
        </AppText>
        <AppText variant="pageTitle" style={{ color: theme.colors.beverage.water.fg }}>
          {status === 'ready' ? `${(totalMl / 1000).toFixed(1)} L` : '—'}
        </AppText>
      </View>

      {status === 'loading' && <AppText tone="secondary">Loading drinks…</AppText>}
      {status === 'error' && <>
        <AppText tone="danger" accessibilityLiveRegion="polite">{error}</AppText>
        <Button label="Retry" variant="secondary" onPress={() => setRetryKey((value) => value + 1)} />
      </>}
      {status === 'ready' && entries.length === 0 ? (
        <AppText tone="secondary">No drinks logged yet.</AppText>
      ) : status === 'ready' && (
        <View style={{ gap: theme.spacing.sm }}>
          {entries.map((drink) => {
            const colors = theme.colors.beverage[/** @type {keyof typeof theme.colors.beverage} */ (drink.drink_type)] ?? theme.colors.beverage.custom;
            return (
              <Pressable
                key={drink.id}
                accessibilityRole="button"
                accessibilityLabel={`${DRINK_LABELS[drink.drink_type] ?? drink.drink_type}, ${drink.amount_ml} ml`}
                onPress={() =>
                    router.push({ pathname: '/water', params: { edit: String(drink.id) } })
                }
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing.md,
                    padding: theme.spacing.md,
                    borderRadius: theme.radius.md,
                    borderWidth: theme.controls.borderWidth,
                    borderColor: theme.colors.border.default,
                    backgroundColor: theme.colors.surface.card,
                    minHeight: theme.controls.minimumTouchTarget,
                }}
                >
                <View
                  style={{
                    width: theme.controls.icon,
                    height: theme.controls.icon,
                    borderRadius: theme.radius.pill,
                    backgroundColor: colors.fg,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <AppText variant="label">
                    {DRINK_LABELS[drink.drink_type] ?? drink.drink_type}
                  </AppText>
                  {drink.note ? (
                    <AppText variant="caption" tone="secondary">
                      {drink.note}
                    </AppText>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <AppText variant="label">{drink.amount_ml} ml</AppText>
                  <AppText variant="caption" tone="secondary">
                    {formatTime(drink.logged_at)}
                  </AppText>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
