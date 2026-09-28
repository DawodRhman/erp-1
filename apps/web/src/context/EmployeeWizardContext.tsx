import React, { createContext, useContext, useState, ReactNode } from "react";

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface EmployeeWizardState {
  step: WizardStep;
  // Basic info
  name: string;
  email: string;
  // Job details
  departmentId: string;
  designationId: string;
  // Compensation
  salary: string;
  // Documents
  documents: File[];
  // Additional fields can be added later
}

interface EmployeeWizardContextProps {
  state: EmployeeWizardState;
  setState: (state: Partial<EmployeeWizardState>) => void;
  next: () => void;
  prev: () => void;
  goTo: (step: WizardStep) => void;
}

const defaultState: EmployeeWizardState = {
  step: 1 as WizardStep,
  name: "",
  email: "",
  departmentId: "",
  designationId: "",
  salary: "",
  documents: [],
};

const EmployeeWizardContext = createContext<EmployeeWizardContextProps | undefined>(undefined);

export const EmployeeWizardProvider = ({ children }: { children: ReactNode }) => {
  const [state, setRawState] = useState<EmployeeWizardState>(defaultState);

  const setState = (partial: Partial<EmployeeWizardState>) => {
    setRawState(prev => ({ ...prev, ...partial }));
  };

  const next = () => {
    setRawState(prev => ({ ...prev, step: Math.min(prev.step + 1, 8) as WizardStep }));
  };
  const prev = () => {
    setRawState(prev => ({ ...prev, step: Math.max(prev.step - 1, 1) as WizardStep }));
  };
  const goTo = (step: WizardStep) => {
    setRawState(prev => ({ ...prev, step }));
  };

  return (
    <EmployeeWizardContext.Provider value={{ state, setState, next, prev, goTo }}>
      {children}
    </EmployeeWizardContext.Provider>
  );
};

export const useEmployeeWizard = () => {
  const ctx = useContext(EmployeeWizardContext);
  if (!ctx) {
    throw new Error("useEmployeeWizard must be used within EmployeeWizardProvider");
  }
  return ctx;
};
