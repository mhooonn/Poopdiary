import { useCallback } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { AppText, Button, Card, RecordIcon, Screen, useTheme } from '../design-system';
import { useDiaryEntries } from '../features/diary/useDiaryEntries';
import { SOURCE_LABELS } from '../features/diary/model';
import { formatDate } from '../features/bowel/model';
import {
  WATER_GOAL_ML,
  drinkLabel,
  formatLitres,
  summarizeToday,
} from '../features/today/todaySummary';

// Returns a greeting based on the current time
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

  // Get today's date in the format used by the diary
  const today = formatDate(new Date());

  const { entries, errors, loading, refresh } =
    useDiaryEntries(today);

  // Refresh the diary data whenever the Today screen comes into focus
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  // Convert the diary entries into a summary for the Today screen
  // The summary contains totals and simplified lists for the UI
  const summary = summarizeToday(entries);

  // Check whether loading failed for each section
  // This allows the UI to show an error in the correct card
  const waterError = errors.some((error) => error.kind === 'water');
  const foodError = errors.some((error) => error.kind === 'food');
  const bowelError = errors.some((error) => error.kind === 'bowel');
  const exersiceError = errors.some((error) => error.kind === 'exercise');
  const sleepError = errors.some((error) => error.kind === 'sleep');

  // Calculate how much of the daily water goal has been reached
  const waterPercent = Math.min(
    100,
    (summary.waterMl / WATER_GOAL_ML) * 100
  );

  // Calculate the remaining water amount
  const waterLeft = Math.max(
    0,
    WATER_GOAL_ML - summary.waterMl
  );

  // Calculate the total amount of all non-water drinks
  let otherDrinksTotal = 0;

  for (const drink of summary.otherDrinks) {
    otherDrinksTotal += drink.ml;
  }

  // Navigate to the diary for today's date when the button is pressed
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

            <AppText tone="secondary">
              {summary.sleep.length > 0 ? summary.sleep[0].title : 'No sleep'}
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
              <SummaryHeading type="water" title="Water" />

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
              <SummaryHeading type="water" title="Other drinks" />

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
              <SummaryHeading type="food" title="Food" />

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
              <SummaryHeading type="bowel" title="Bowel & symptoms" />

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

            {/* Sleep */}
            <Card>
              <AppText variant="sectionTitle">
                😴 Sleep
              </AppText>

              {sleepError ? (
                <AppText>Could not load sleep data.</AppText>
              ) : summary.sleep.length === 0 ? (
                <AppText tone="secondary">Nothing logged yet.</AppText>
              ) : (
                <>
                  <AppText variant="sectionTitle">
                    {summary.sleep[0].title}
                  </AppText>

                  <AppText tone="secondary">
                    {summary.sleep[0].detail}
                  </AppText>

                  <AppText tone="secondary">
                    Woke up {summary.sleep[0].time}
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

// Reusable heading for summary cards.
// Displays the appropriate record icon and the section title.
/** @param {{type:'food'|'bowel'|'water',title:string}} props */
function SummaryHeading({ type, title }) {
  const theme = useTheme();
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
    <RecordIcon type={type} />
    <AppText variant="sectionTitle">{title}</AppText>
  </View>;
}
