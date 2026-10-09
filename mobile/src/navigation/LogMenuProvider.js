import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { LogSheet } from './LogSheet';

const Context = createContext(/** @type {{openLog:()=>void}|null} */ (null));

/** @param {{children:import('react').ReactNode}} props */
export function LogMenuProvider({ children }) {
  const [visible, setVisible] = useState(false);
  const openLog = useCallback(() => setVisible(true), []);
  const value = useMemo(() => ({ openLog }), [openLog]);
  return <Context.Provider value={value}>
    {children}
    <LogSheet visible={visible} onClose={() => setVisible(false)} />
  </Context.Provider>;
}

export function useLogMenu() {
  const menu = useContext(Context);
  if (!menu) throw new Error('LogMenuProvider is required.');
  return menu;
}
