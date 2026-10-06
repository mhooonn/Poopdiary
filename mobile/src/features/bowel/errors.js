import { ApiError } from '../../data/api';

/** @param {unknown} failure @param {'load'|'save'|'delete'} action */
export function bowelError(failure, action) {
  if (failure instanceof ApiError) {
    if (failure.status === 404) return action === 'delete' ? 'This record was already deleted. Reload the list.' : 'Record not found.';
    if (failure.code === 'configuration') return 'The server is not configured.';
    if (failure.code === 'network' || failure.code === 'timeout') return 'Could not reach the server. Check your connection and retry.';
  }
  return { load: 'Could not load records. Try again.', save: 'Could not save. Try again.', delete: 'Could not delete. Try again.' }[action];
}
