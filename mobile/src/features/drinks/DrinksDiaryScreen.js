// @ts-nocheck
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { AppText } from '../../design-system/components/AppText';
import { useTheme } from '../../design-system/ThemeProvider';
import { apiBaseUrl } from '../../config/api';

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

function formatTime(iso) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

//function todayString() {
 // const now = new Date();
  //const month = String(now.getMonth() + 1).padStart(2, '0');
  //const day = String(now.getDate()).padStart(2, '0');
  //return `${now.getFullYear()}-${month}-${day}`;
//}

export function TodayDrinks({ date }) {
  const theme = useTheme();
  const router = useRouter();
  const [drinks, setDrinks] = useState([]);

  useFocusEffect(
    useCallback(() => {
      fetch(`${apiBaseUrl}/drinks?date=${date}`)
        .then((response) => response.json())
        .then((data) => setDrinks(data))
        .catch((error) => console.log('Haku epäonnistui:', error.message));
    }, [date])
  );

  const totalMl = drinks.reduce((sum, d) => sum + d.amount_ml, 0);

  return (
    <View style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      {/* Päivän yhteismäärä */}
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
          {(totalMl / 1000).toFixed(1)} L
        </AppText>
      </View>

      {/* Lista */}
      {drinks.length === 0 ? (
        <AppText tone="secondary">No drinks logged yet.</AppText>
      ) : (
        <View style={{ gap: theme.spacing.sm }}>
          {drinks.map((drink) => {
            const colors = theme.colors.beverage[drink.drink_type] ?? theme.colors.beverage.custom;
            return (
              <Pressable
                key={drink.id}
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