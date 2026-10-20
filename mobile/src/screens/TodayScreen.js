import { useCallback } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { AppText, Button, Card, Screen, useTheme } from '../design-system';
import { useDiaryEntries } from '../features/diary/useDiaryEntries';
import { SOURCE_LABELS } from '../features/diary/model';
import { formatDate } from '../features/bowel/model';
import {
  WATER_GOAL_ML,
  drinkLabel,
  formatLitres,
  summarizeToday,
} from '../features/today/todaySummary';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Good night';
  if (hour < 11) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function TodayScreen() {
  const theme = useTheme();
  const router = useRouter();

  const today = formatDate(new Date());

  const { entries, errors, loading, refresh } =
    useDiaryEntries(today);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const summary = summarizeToday(entries);

  const waterError = errors.some((error) => error.kind === 'water');
  const foodError = errors.some((error) => error.kind === 'food');
  const bowelError = errors.some((error) => error.kind === 'bowel');

  const waterPercent = Math.min(
    100,
    (summary.waterMl / WATER_GOAL_ML) * 100
  );

  const waterLeft = Math.max(
    0,
    WATER_GOAL_ML - summary.waterMl
  );

  let otherDrinksTotal = 0;

  for (const drink of summary.otherDrinks) {
    otherDrinksTotal += drink.ml;
  }

  const openDiary = () => {
    router.push({
      pathname: '/diary',
      params: { date: today },
    });
  };

  return (
    <Screen title="Today">
      <View style={{ gap: theme.spacing.md }}>

        <AppText variant="sectionTitle">{getGreeting()}!</AppText>
        <AppText>
          {new Date(`${today}T12:00:00`).toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </AppText>

        {!loading && (
          <AppText>
            {summary.meals.length} meals · {formatLitres(summary.waterMl)} L water · {summary.bowelCount} bowel movements
          </AppText>
        )}

        {loading && (
          <AppText>Loading...</AppText>
        )}

        {errors.length > 0 && (
          <Card>
            {errors.map((error) => (
              <View key={error.kind}>
                <AppText>
                  {SOURCE_LABELS[error.kind]} could not load
                </AppText>
                <AppText>{error.message}</AppText>
              </View>
            ))}

            <Button
              label="Retry"
              onPress={() => void refresh()}
              disabled={loading}
              variant="secondary"
            />
          </Card>
        )}

        {!loading || entries.length > 0 ? (
          <>
            <Card>
              <AppText variant="sectionTitle">
                💧 Water
              </AppText>

              {waterError ? (
                <AppText>Could not load water data.</AppText>
              ) : (
                <>
                  <AppText>
                    {formatLitres(summary.waterMl)} L /
                    {' '}{formatLitres(WATER_GOAL_ML)} L
                  </AppText>

                  <View
                    style={{
                      height: 8,
                      backgroundColor: theme.colors.surface.subtle,
                      borderRadius: theme.radius.pill,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        width: `${waterPercent}%`,
                        height: '100%',
                        backgroundColor: theme.colors.entry.water.fg,
                      }}
                    />
                  </View>

                  <AppText>
                    {waterLeft > 0
                      ? `${formatLitres(waterLeft)} L to go`
                      : 'Goal reached'}
                  </AppText>
                </>
              )}
            </Card>

            <Card>
              <AppText variant="sectionTitle">
                🥤 Other drinks
              </AppText>

              {waterError ? (
                <AppText>Could not load drink data.</AppText>
              ) : summary.otherDrinks.length === 0 ? (
                <AppText>No other drinks logged.</AppText>
              ) : (
                summary.otherDrinks.map((drink) => (
                  <AppText key={drink.type}>
                    {drinkLabel(drink.type)}: {drink.ml} ml
                  </AppText>
                ))
              )}

              {!waterError && (
                <AppText>
                  Total: {otherDrinksTotal} ml
                </AppText>
              )}
            </Card>

            <Card>
              <AppText variant="sectionTitle">
                🍽️ Food
              </AppText>

              {foodError ? (
                <AppText>Could not load food data.</AppText>
              ) : summary.meals.length === 0 ? (
                <AppText>Nothing logged yet.</AppText>
              ) : (
                summary.meals.slice(0, 4).map((meal) => (
                  <View key={meal.key}>
                    <AppText>
                      {meal.time} - {meal.title}
                    </AppText>

                    {meal.detail && (
                      <AppText>{meal.detail}</AppText>
                    )}
                  </View>
                ))
              )}
            </Card>

            <Card>
              <AppText variant="sectionTitle">
                📋 Bowel & symptoms
              </AppText>

              {bowelError ? (
                <AppText>Could not load bowel data.</AppText>
              ) : (
                <>
                  {summary.bowelCount === 0 ? (
                    <AppText>
                      No bowel movements logged.
                    </AppText>
                  ) : (
                    summary.movements.slice(0, 3).map((movement) => (
                      <View key={movement.key}>
                        <AppText>
                          {movement.time} - {movement.title}
                        </AppText>

                        {movement.detail && (
                          <AppText>{movement.detail}</AppText>
                        )}
                      </View>
                    ))
                  )}

                  <AppText variant="label">
                    Symptoms
                  </AppText>

                  {summary.symptoms.length === 0 ? (
                    <AppText>No symptoms logged.</AppText>
                  ) : (
                    summary.symptoms.map((symptom) => (
                      <AppText key={symptom.key}>
                        • {symptom.text}
                      </AppText>
                    ))
                  )}
                </>
              )}
            </Card>
          </>
        ) : null}

        <Button
          label="Open diary"
          onPress={openDiary}
        />

      </View>
    </Screen>
  );
}
