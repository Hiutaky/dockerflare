import React, { createContext, ReactNode, useContext, useState } from "react";
import { useDocker } from "./docker.provider";
import { TerminalInstance } from "@/types";

type TerminalsMap = Map<string, TerminalInstance>;

interface Props {
  children: ReactNode;
}

interface TerminalsState {
  activeTerminalId: string | null;
  open: boolean;
  terminals: TerminalsMap;

  closeTerminal: (terminalId: string) => void;
  createTerminal: (host: string, containerId: string) => void;
  setOpen: (open: boolean) => void;
  setActiveTerminalId: (terminalId: string) => void;
  setTerminals: (terminals: TerminalsMap) => void;
}

export const DEFAULT_TERMINALS_STATE: TerminalsState = {
  activeTerminalId: null,
  open: false,
  terminals: new Map(),
  createTerminal: () => {},
  closeTerminal: () => {},
  setOpen() {
    return;
  },
  setActiveTerminalId: () => {
    return;
  },
  setTerminals() {
    return;
  },
};

export const TerminalsContext = createContext(DEFAULT_TERMINALS_STATE);

export const useTerminals = () => {
  return useContext(TerminalsContext);
};

const useTerminalsProvider = (): TerminalsState => {
  const { containers } = useDocker();
  const [open, setOpen] = useState<boolean>(false);
  const [terminals, setTerminals] = useState<TerminalsMap>(new Map());
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);

  function createTerminal(host: string, containerId: string) {
    if (!containers) return;

    const container = containers.get(host)?.find((c) => c.id === containerId);
    if (!container) return;

    const terminalId = `term-${Date.now()}`;
    const newTerminal: TerminalInstance = {
      id: terminalId,
      containerId,
      containerName: container.names[0] || container.id.substring(0, 12),
      hostUrl: host,
    };

    setTerminals((prev) => new Map(prev).set(terminalId, newTerminal));
    setActiveTerminalId(terminalId);
    if (!open) setOpen(true);
  }

  function closeTerminal(terminalId: string) {
    const newTerminals = new Map(terminals);
    newTerminals.delete(terminalId);
    setTerminals(newTerminals);

    if (activeTerminalId === terminalId) {
      const remainingIds = Array.from(newTerminals.keys());
      setActiveTerminalId(remainingIds[0] || null);
    }

    if (newTerminals.size === 0) {
      setOpen(false);
    }
  }

  return {
    activeTerminalId,
    open,
    terminals,
    closeTerminal,
    createTerminal,
    setOpen,
    setActiveTerminalId,
    setTerminals,
  };
};

export const TerminalsProvider: React.FC<Props> = ({ children }) => {
  const value = useTerminalsProvider();
  return (
    <TerminalsContext.Provider value={value}>
      {children}
    </TerminalsContext.Provider>
  );
};
