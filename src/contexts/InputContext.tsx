/**
 * Copyright 2025 The Artinet Project
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useMemo,
} from "react";

interface InputContextType {
  activeComponent: string;
  setActiveComponent: (component: string) => void;
  isActive: (componentId: string) => boolean;
}

const InputContext = createContext<InputContextType | null>(null);

export const InputProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [activeComponent, setActiveComponent] = useState("app");

  const isActive = useCallback(
    (componentId: string) => {
      return activeComponent === componentId;
    },
    [activeComponent]
  );

  const contextValue = useMemo(
    () => ({
      activeComponent,
      setActiveComponent,
      isActive,
    }),
    [activeComponent, isActive]
  );

  return (
    <InputContext.Provider value={contextValue}>
      {children}
    </InputContext.Provider>
  );
};

export const useInputContext = () => {
  const context = useContext(InputContext);
  if (!context) {
    throw new Error("useInputContext must be used within InputProvider");
  }
  return context;
};
