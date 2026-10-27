import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
type Access = {
  open: () => void;
  register: (handler: () => void) => () => void;
};
const Context = createContext<Access>({
  open: () => {},
  register: () => () => {},
});
export function AssistantAccessProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const handler = useRef<(() => void) | null>(null);
  const open = useCallback(() => handler.current?.(), []);
  const register = useCallback((next: () => void) => {
    handler.current = next;
    return () => {
      if (handler.current === next) handler.current = null;
    };
  }, []);
  const value = useMemo(() => ({ open, register }), [open, register]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useAssistantAccess = () => useContext(Context);
