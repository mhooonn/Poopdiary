// FoodDiarySection
// Shows the food entries of one day as a list. Tapping an entry opens a
// bottom sheet with its details and Edit / Delete buttons.
// Note: the shared Diary screen owns the main timeline; this is a
// food-only preview/compatibility component.

import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';

// Shared UI components from our design system
import {
  AppText,
  Button,
  Card,
  RecordIcon,
  Sheet,
  useTheme,
} from '../../design-system';

// Backend API functions: remove one entry, fetch all entries
import { deleteFood, listFood } from '../../data/api';

/** @typedef {{id:number,food_name:string,meal_type:string|null,date:string,time:string|null,notes:string|null}} FoodRecord */

/**
 * Food-only compatibility preview; the shared Diary owns the main timeline.
 * Props:
 *  - date:      the day to show, as YYYY-MM-DD
 *  - reloadKey: change this number to make the list reload (e.g. after a save)
 *  - onEdit:    optional callback; if missing we navigate to /food?edit=ID ourselves
 * @param {{
 *   date: string,
 *   reloadKey?: number,
 *   onEdit?: (record: FoodRecord) => void
 * }} props
 */
export function FoodDiarySection({
  date,
  reloadKey = 0,
  onEdit,
}) {
  const theme = useTheme();
  const router = useRouter();

  // All food records loaded from the backend
  const [records, setRecords] = useState(
    /** @type {FoodRecord[]} */ ([])
  );

  // Loading state of the list: loading -> ready, or error
  const [status, setStatus] = useState(
    /** @type {'loading'|'ready'|'error'} */ ('loading')
  );

  const [error, setError] = useState(''); // message shown when loading fails

  // Id of the entry whose detail sheet is open (null = sheet closed)
  const [selectedId, setSelectedId] = useState(
    /** @type {number|null} */ (null)
  );

  const [confirmDelete, setConfirmDelete] = useState(false); // sheet shows the "are you sure?" step
  const [deleting, setDeleting] = useState(false); // true while the delete request runs
  const [actionError, setActionError] = useState(''); // error from delete, shown in the sheet
  const [retryKey, setRetryKey] = useState(0); // increased by the Retry button to reload

  // Reload when the screen gains focus or an entry is saved.
  // useFocusEffect runs every time the screen comes back into view
  // (for example after returning from the edit form).
  useFocusEffect(
    useCallback(() => {
      // These keys trigger a fresh load after a save or retry.
      // They are only listed so the callback is recreated when they change.
      void reloadKey;
      void retryKey;

      // Flag used to ignore the result if the screen loses focus
      // before the request finishes
      let active = true;

      async function load() {
        setStatus('loading');
        setError('');

        try {
          const data = await listFood();

          if (active) {
            setRecords(data);
            setStatus('ready');
          }
        } catch (failure) {
          if (active) {
            setError(
              failure instanceof Error
                ? failure.message
                : 'Could not load food entries.'
            );
            setStatus('error');
          }
        }
      }

      void load();

      // Cleanup: mark this load as outdated
      return () => {
        active = false;
      };
    }, [reloadKey, retryKey])
  );

  // Only the entries of the chosen day, sorted by time.
  // Entries without a time use '99:99' so they end up last.
  const entries = records
    .filter((record) => record.date === date)
    .sort((a, b) =>
      (a.time || '99:99').localeCompare(b.time || '99:99')
    );

  // The full record for the open sheet (undefined if none is selected)
  const selected = records.find((record) => record.id === selectedId);

  // Closes the detail sheet and resets its state.
  // Not allowed while a delete is running.
  function closeDetails() {
    if (deleting) return;

    setSelectedId(null);
    setConfirmDelete(false);
    setActionError('');
  }

  // Closes the sheet and opens the edit form for the record
  /** @param {FoodRecord} record */
  function editRecord(record) {
    setSelectedId(null);
    setConfirmDelete(false);
    setActionError('');

    if (onEdit) {
      // Parent component handles editing
      onEdit(record);
    } else {
      // Default: open /food?edit=ID
      router.push({
        pathname: '/food',
        params: { edit: String(record.id) },
      });
    }
  }

  // Deletes the selected entry from the backend and from the local list
  async function handleDelete() {
    // Nothing selected, or a delete is already running
    if (!selected || deleting) return;

    setDeleting(true);
    setActionError('');

    try {
      await deleteFood(selected.id);

      // Remove it from the list right away so we don't need to reload everything
      setRecords((previous) =>
        previous.filter((record) => record.id !== selected.id)
      );

      // Close the sheet
      setSelectedId(null);
      setConfirmDelete(false);
    } catch (failure) {
      setActionError(
        failure instanceof Error
          ? failure.message
          : 'Could not delete food entry.'
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <View style={{ gap: theme.spacing.md }}>
      <AppText variant="sectionTitle">
        Food entries
      </AppText>

      {/* Loading state: spinner and text */}
      {status === 'loading' && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
          }}
        >
          <ActivityIndicator color={theme.colors.text.primary} />
          <AppText tone="secondary">
            Loading food entries...
          </AppText>
        </View>
      )}

      {/* Error state: message and a Retry button that reloads the list */}
      {status === 'error' && (
        <Card>
          <AppText tone="danger">{error}</AppText>
          <Button
            label="Retry"
            variant="secondary"
            onPress={() => setRetryKey((value) => value + 1)}
          />
        </Card>
      )}

      {/* Empty state: loaded fine but nothing for this day */}
      {status === 'ready' && entries.length === 0 && (
        <Card>
          <AppText tone="secondary">
            No food entries for this day.
          </AppText>
        </Card>
      )}

      {/* One tappable row per entry */}
      {status === 'ready' &&
        entries.map((record) => (
          <Pressable
            key={record.id}
            accessibilityRole="button"
            accessibilityLabel={`${record.meal_type || 'Food'}: ${record.food_name}`}
            testID={`food-entry-${record.id}`}
            // Tapping opens the detail sheet for this entry
            onPress={() => {
              setSelectedId(record.id);
              setConfirmDelete(false);
              setActionError('');
            }}
            // The style can be a function so the row looks different while pressed
            style={({ pressed }) => ({
              borderRadius: theme.radius.lg,
              borderWidth: theme.controls.borderWidth,
              borderColor: theme.colors.border.control,
              backgroundColor: pressed
                ? theme.colors.surface.subtle
                : theme.colors.surface.card,
              padding: theme.spacing.md,
              minHeight: theme.controls.minimumTouchTarget,
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.md,
            })}
          >
            {/* Icon box on the left, colored with the food entry color */}
            <View
              style={{
                width: theme.controls.minimumTouchTarget,
                height: theme.controls.minimumTouchTarget,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.entry.food.bg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <RecordIcon type="food" />
            </View>

            {/* Text column: meal type, food name, time and notes.
                flex: 1 and minWidth: 0 let long text wrap instead of
                pushing the arrow off the screen. */}
            <View
              style={{
                flex: 1,
                minWidth: 0,
                gap: theme.spacing.xs,
              }}
            >
              <AppText variant="label">
                {record.meal_type || 'Food'}
              </AppText>

              <AppText tone="secondary">
                {record.food_name}
              </AppText>

              <AppText variant="caption" tone="secondary">
                {record.time || 'Time not recorded'}
              </AppText>

              {/* Notes are only shown when the entry has some */}
              {record.notes ? (
                <AppText variant="caption" tone="secondary">
                  {record.notes}
                </AppText>
              ) : null}
            </View>

            {/* Arrow on the right showing that the row can be opened */}
            <ChevronRight
              size={theme.controls.icon}
              color={theme.colors.text.secondary}
              strokeWidth={theme.controls.iconStrokeWidth}
            />
          </Pressable>
        ))}

      {/* Detail sheet. It has two views: details with Edit/Delete buttons,
          and a delete confirmation. */}
      {selected && (
        <Sheet
          visible
          title={
            confirmDelete
              ? 'Delete food entry?'
              : selected.meal_type || 'Food entry'
          }
          onClose={closeDetails}
          dismissible={!deleting} // can't be dismissed during a delete
        >
          {confirmDelete ? (
            <>
              {/* Step 2: confirm before deleting, because it can't be undone */}
              <AppText>
                Are you sure you want to delete this food entry?
                This cannot be undone.
              </AppText>

              <Button
                label="Delete entry"
                variant="danger"
                onPress={() => void handleDelete()}
                loading={deleting}
                disabled={deleting}
              />

              <Button
                label="Cancel"
                variant="secondary"
                onPress={() => setConfirmDelete(false)}
                disabled={deleting}
              />
            </>
          ) : (
            <>
              {/* Step 1: entry details */}
              <AppText variant="sectionTitle">
                {selected.food_name}
              </AppText>

              <AppText tone="secondary">
                {selected.date}
              </AppText>

              {selected.notes ? (
                <Card>
                  <AppText variant="label">Notes</AppText>
                  <AppText>{selected.notes}</AppText>
                </Card>
              ) : null}

              <Button
                label="Edit"
                onPress={() => editRecord(selected)}
              />

              {/* Moves to the confirmation view instead of deleting immediately */}
              <Button
                label="Delete"
                variant="danger"
                onPress={() => setConfirmDelete(true)}
              />
            </>
          )}

          {/* Error from a failed delete */}
          {actionError !== '' && (
            <AppText tone="danger">{actionError}</AppText>
          )}
        </Sheet>
      )}
    </View>
  );
}