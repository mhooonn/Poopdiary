import { Image, View } from 'react-native';
import { Camera, ImagePlus, X } from 'lucide-react-native';

import { AppText, Button, Card, IconButton, useTheme } from '../../../design-system';

/** @param {{uri:string|null,loading:boolean,busy:boolean,actionLoading:boolean,error:string,settingsRequired:boolean,onTakePhoto:()=>void,onRemove:()=>void,onOpenSettings:()=>void}} props */
export function FoodPhotoField({ uri, loading, busy, actionLoading, error, settingsRequired, onTakePhoto, onRemove, onOpenSettings }) {
  const theme = useTheme();
  const previewSize = theme.controls.minimumTouchTarget * 2;
  const actionLabel = settingsRequired ? 'Open settings' : uri ? 'Replace' : 'Take photo';

  return <Card testID="food-photo-field">
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
      <View testID="food-photo-preview" style={{
        width: previewSize,
        aspectRatio: 1,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.radius.md,
        borderWidth: theme.controls.borderWidth,
        borderColor: theme.colors.border.default,
        backgroundColor: theme.colors.surface.subtle,
      }}>
        {uri ? <Image source={{ uri }} accessibilityLabel="Meal photo" resizeMode="cover" style={{ width: '100%', height: '100%' }} /> : <ImagePlus size={theme.controls.icon * 1.5} color={theme.colors.text.secondary} />}
        {uri && <View style={{ position: 'absolute', top: theme.spacing.xs, right: theme.spacing.xs, borderRadius: theme.radius.pill, borderWidth: theme.controls.borderWidth, borderColor: theme.colors.border.default, backgroundColor: theme.colors.surface.card }}>
          <IconButton icon={X} label="Remove meal photo" onPress={onRemove} disabled={busy} testID="food-photo-remove" />
        </View>}
        {loading && <View accessibilityRole="progressbar" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface.card }}>
          <AppText variant="caption" tone="secondary">Loading</AppText>
        </View>}
      </View>

      <View style={{ flex: 1, minWidth: 0, gap: theme.spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing.xs }}>
          <AppText variant="label">Meal photo</AppText>
          <AppText variant="caption" tone="secondary">Optional</AppText>
        </View>
        <Button
          label={actionLabel}
          icon={settingsRequired ? null : <Camera size={theme.controls.icon} color={theme.colors.action.primary.foreground} />}
          onPress={settingsRequired ? onOpenSettings : onTakePhoto}
          loading={actionLoading}
          disabled={busy}
          testID={settingsRequired ? 'food-camera-settings' : 'food-photo-take'}
        />
      </View>
    </View>

    <View accessibilityLiveRegion="polite" role="status" testID="food-photo-error" style={{ height: theme.typography.caption.lineHeight * 2, justifyContent: 'center' }}>
      <AppText variant="caption" tone={error !== '' ? 'danger' : 'secondary'} numberOfLines={2}>
        {error !== '' ? error : 'Stored on this device.'}
      </AppText>
    </View>
  </Card>;
}
