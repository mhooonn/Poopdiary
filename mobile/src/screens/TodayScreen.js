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
  const exersiceError = errors.some((error) => error.kind === 'exercise');

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

        {/* Greeting and date */}
        <View style={{ gap: theme.spacing.xs }}>
          <AppText variant="sectionTitle">{getGreeting()}!</AppText>

          <AppText tone="secondary">
            {new Date(`${today}T12:00:00`).toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </AppText>
        </View>

        {/* Daily summary */}
        {!loading && (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              columnGap: theme.spacing.sm,
              rowGap: theme.spacing.xs,
            }}
          >
            <AppText tone="secondary">
              {summary.meals.length} meals
            </AppText>

            <AppText tone="secondary">
              {formatLitres(summary.waterMl)} L water
            </AppText>

            <AppText tone="secondary">
              {summary.bowelCount} bowel movements
            </AppText>

            <AppText tone="secondary">
              {summary.exercise.length} exercises
            </AppText>
          </View>
        )}

        {loading && (
          <AppText>Loading...</AppText>
        )}

        {/* Errors */}
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

            {/* Water */}
            <Card>
              <AppText variant="sectionTitle">
                💧 Water
              </AppText>

              {waterError ? (
                <AppText>Could not load water data.</AppText>
              ) : (
                <>
                  <AppText variant="sectionTitle">
                    {formatLitres(summary.waterMl)} L
                  </AppText>

                  <AppText tone="secondary">
                    Goal: {' '}{formatLitres(WATER_GOAL_ML)} L
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

                  <AppText tone="secondary">
                    {waterLeft > 0
                      ? `${formatLitres(waterLeft)} L to go`
                      : 'Goal reached'}
                  </AppText>
                </>
              )}
            </Card>

            {/* Other drinks */}
            <Card>
              <AppText variant="sectionTitle">
                🥤 Other drinks
              </AppText>

              {waterError ? (
                <AppText>Could not load drink data.</AppText>
              ) : summary.otherDrinks.length === 0 ? (
                <AppText tone="secondary">No other drinks logged.</AppText>
              ) : (
                <AppText>
                {summary.otherDrinks
                  .map((drink) =>  drinkLabel(drink.type))
                  .join(' | ')}
                  
                </AppText>
              )}

              {!waterError && (
                <AppText tone="secondary">
                  Total: {otherDrinksTotal} ml
                </AppText>
              )}
            </Card>
            
            {/* Food */}
            <Card>
              <AppText variant="sectionTitle">
                🍽️ Food
              </AppText>

              {foodError ? (
                <AppText>Could not load food data.</AppText>
              ) : summary.meals.length === 0 ? (
                <AppText tone="secondary">Nothing logged yet.</AppText>
              ) : (
                <>
                <AppText tone="secondary">
                  {summary.meals.length} meals logged
                </AppText>

                <AppText>
                  {summary.meals.slice(0, 4).map((meal) => meal.detail)
                  .join(' - ')}
                </AppText> 
                </>
              
                
              )}
            </Card>

            {/* Bowel movements and symptoms */}
            <Card>
              <AppText variant="sectionTitle">
                📋 Bowel & symptoms
              </AppText>

              {bowelError ? (
                <AppText>Could not load bowel data.</AppText>
              ) : (
                <>
                <AppText>
                  {summary.bowelCount} bowel movements
                </AppText>
                

                  

                  <AppText variant="label">
                    Symptoms
                  </AppText>

                  {summary.symptoms.length === 0 ? (
                    <AppText tone="secondary">No symptoms logged.</AppText>
                  ) : (
                    <AppText>
                      {summary.symptoms
                        .map((symptom) => symptom.text)
                        .join(' · ')}
                    </AppText>
                  )}
                </>
              )}
            </Card>

            {/* Exercise */}
            <Card>
              <AppText variant="sectionTitle">
                👟 Exercise
              </AppText>

              {exersiceError ? (
                <AppText>
                  Could not load exercise data.
                </AppText>
              ) : summary.exercise.length === 0 ? (
                <AppText tone="secondary">
                  Nothing logged yet.
                </AppText>
              ) : (
                <>
                <AppText tone="secondary">
                  {summary.exercise.length} activities
                </AppText>

                <AppText>
                  {summary.exercise
                    .slice(0, 4)
                    .map((exercise) => exercise.title)
                    .join(' · ')}
                </AppText>
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
