import { AppText } from './AppText';
import { Button } from './Button';
import { InlineNotice } from './InlineNotice';
import { Sheet } from './Sheet';

/** Caller owns the write and error; keep the sheet open when it fails.
 * @param {{visible:boolean,title:string,message:string,onClose:()=>void,onConfirm:()=>void,confirmLabel?:string,variant?:'primary'|'danger',loading?:boolean,error?:string,testID?:string}} props */
export function ConfirmSheet({ visible, title, message, onClose, onConfirm, confirmLabel = 'Delete', variant = 'danger', loading = false, error, testID }) {
  return <Sheet visible={visible} title={title} onClose={onClose} dismissible={!loading}>
    <AppText>{message}</AppText>
    {error && <InlineNotice title={error} />}
    <Button label={confirmLabel} variant={variant} onPress={onConfirm} loading={loading} testID={testID} />
    <Button label="Cancel" variant="secondary" onPress={onClose} disabled={loading} />
  </Sheet>;
}
