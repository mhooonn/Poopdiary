
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronRight, Utensils } from 'lucide-react-native';

import {
  AppText,
  Button,
  Card,
  Sheet,
  useTheme,
} from '../../design-system';

import { deleteFood, listFood } from '../../data/api';

/** @typedef {{id:number,food_name:string,meal_type:string|null,date:string,time:string|null,notes:string|null}} FoodRecord */

/**
 * Food-only compatibility preview; the shared Diary owns the main timeline.
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

  const [records, setRecords] = useState(
    /** @type {FoodRecord[]} */ ([])
  );

  const [status, setStatus] = useState(
    /** @type {'loading'|'ready'|'error'} */ ('loading')
  );

  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(
    /** @type {number|null} */ (null)
  );

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  // Reload when the screen gains focus or an entry is saved.
  useFocusEffect(
    useCallback(() => {
      // These keys trigger a fresh load after a save or retry.
      void reloadKey;
      void retryKey;
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

      return () => {
        active = false;
      };
    }, [reloadKey, retryKey])
  );

    const entries = records
        .filter((record) => record.date === date)
        .sort((a, b) =>
            (a.time || '99:99').localeCompare(b.time || '99:99')
    );
  const selected = records.find((record) => record.id === selectedId);

  function closeDetails() {
    if (deleting) return;

    setSelectedId(null);
    setConfirmDelete(false);
    setActionError('');
  }

  /** @param {FoodRecord} record */
  function editRecord(record) {
    setSelectedId(null);
    setConfirmDelete(false);
    setActionError('');

    if (onEdit) {
      onEdit(record);
    } else {
      router.push({
        pathname: '/food',
        params: { edit: String(record.id) },
      });
    }
  }

  async function handleDelete() {
    if (!selected || deleting) return;

    setDeleting(true);
    setActionError('');

    try {
      await deleteFood(selected.id);

      setRecords((previous) =>
        previous.filter((record) => record.id !== selected.id)
      );

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

      {status === 'ready' && entries.length === 0 && (
        <Card>
          <AppText tone="secondary">
            No food entries for this day.
          </AppText>
        </Card>
      )}

      {status === 'ready' &&
        entries.map((record) => (
          <Pressable
            key={record.id}
            accessibilityRole="button"
            accessibilityLabel={`${record.meal_type || 'Food'}: ${record.food_name}`}
            testID={`food-entry-${record.id}`}
            onPress={() => {
              setSelectedId(record.id);
              setConfirmDelete(false);
              setActionError('');
            }}
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
            <View
              style={{
                width: theme.controls.minimumTouchTarget,
                height: theme.controls.minimumTouchTarget,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.surface.subtle,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Utensils
                size={theme.controls.icon}
                color={theme.colors.text.primary}
              />
            </View>

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

              {record.notes ? (
                <AppText variant="caption" tone="secondary">
                  {record.notes}
                </AppText>
              ) : null}
            </View>

            <ChevronRight
              size={theme.controls.icon}
              color={theme.colors.text.secondary}
            />
          </Pressable>
        ))}

      {selected && (
        <Sheet
          visible
          title={
            confirmDelete
              ? 'Delete food entry?'
              : selected.meal_type || 'Food entry'
          }
          onClose={closeDetails}
          dismissible={!deleting}
        >
          {confirmDelete ? (
            <>
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

              <Button
                label="Delete"
                variant="danger"
                onPress={() => setConfirmDelete(true)}
              />
            </>
          )}

          {actionError !== '' && (
            <AppText tone="danger">{actionError}</AppText>
          )}
        </Sheet>
      )}
    </View>
  );
}
