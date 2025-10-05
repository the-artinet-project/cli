/**
 * Copyright 2025 The Artinet Project
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, ReactNode } from "react";

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

  const isActive = (componentId: string) => {
    return activeComponent === componentId;
  };

  return (
    <InputContext.Provider
      value={{
        activeComponent,
        setActiveComponent,
        isActive,
      }}
    >
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
