"use client";

/**
 * Terminal Manager - Bottom Drawer with Grid Layout
 * VSCode-style terminal manager with multiple terminals and split view
 */

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Terminal,
  Plus,
  X,
  Maximize2,
  SplitSquareHorizontal,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useDocker } from "@/providers/docker.provider";
import TerminalPane from "./TerminalPane";
import { TerminalGridCell } from "@/types";
import { useTerminals } from "@/providers/terminals.provider";

export default function TerminalsManager() {
  const [gridLayout, setGridLayout] = useState<
    "single" | "2x1" | "1x2" | "2x2"
  >("single");
  const [isMobile, setIsMobile] = useState(false);

  // New terminal creation state
  const [selectedHost, setSelectedHost] = useState<string>("");
  const [selectedContainer, setSelectedContainer] = useState<string>("");
  // const [availableContainers, setAvailableContainers] = useState<NormalizedContainer[]>([]);
  const {
    terminals,
    closeTerminal,
    activeTerminalId,
    setActiveTerminalId,
    setOpen,
    open,
    createTerminal,
  } = useTerminals();
  const { onlineHosts, getContainers } = useDocker();

  // Detect mobile screen size and force single layout
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && gridLayout !== "single") {
        setGridLayout("single");
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [gridLayout]);

  const availableContainers = useMemo(() => {
    if (!selectedHost) return [];
    return getContainers(selectedHost);
  }, [selectedHost, getContainers]);

  // Get grid cells based on layout
  const getGridCells = (): TerminalGridCell[] => {
    const terminalIds = Array.from(terminals.keys());

    switch (gridLayout) {
      case "single":
        return [{ terminalId: activeTerminalId, position: { row: 0, col: 0 } }];

      case "2x1":
        return [
          { terminalId: terminalIds[0] || null, position: { row: 0, col: 0 } },
          { terminalId: terminalIds[1] || null, position: { row: 0, col: 1 } },
        ];

      case "1x2":
        return [
          { terminalId: terminalIds[0] || null, position: { row: 0, col: 0 } },
          { terminalId: terminalIds[1] || null, position: { row: 1, col: 0 } },
        ];

      case "2x2":
        return [
          { terminalId: terminalIds[0] || null, position: { row: 0, col: 0 } },
          { terminalId: terminalIds[1] || null, position: { row: 0, col: 1 } },
          { terminalId: terminalIds[2] || null, position: { row: 1, col: 0 } },
          { terminalId: terminalIds[3] || null, position: { row: 1, col: 1 } },
        ];

      default:
        return [];
    }
  };

  const getGridClassName = (): string => {
    switch (gridLayout) {
      case "single":
        return "grid-cols-1 grid-rows-1";
      case "2x1":
        return "grid-cols-2 grid-rows-1";
      case "1x2":
        return "grid-cols-1 grid-rows-2";
      case "2x2":
        return "grid-cols-2 grid-rows-2";
      default:
        return "grid-cols-1 grid-rows-1";
    }
  };

  const changeLayout = (newLayout: typeof gridLayout) => {
    setGridLayout(newLayout);
  };

  // Helper to check if terminal is visible in current layout
  const isTerminalVisible = (terminalId: string): boolean => {
    const cells = getGridCells();
    return cells.some((cell) => cell.terminalId === terminalId);
  };

  return (
    <>
      {/* Bottom Bar Toggle */}
      <div className="  bottom-0 left-0 right-0 z-40 border-t bg-background">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(!open)}
              className="gap-2"
            >
              <Terminal className="w-4 h-4" />
              <span className="font-medium">
                Terminals {terminals.size > 0 && `(${terminals.size})`}
              </span>
              {open ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </Button>

            {open && (
              <>
                {/* Mobile: Vertical layout, Desktop: Horizontal with separator */}
                <div className="sm:hidden w-px h-6 bg-border" />
                <div className="hidden sm:block w-px h-6 bg-border" />

                {/* Controls Container - Stack vertically on mobile */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  {/* Host Selector */}
                  <Select value={selectedHost} onValueChange={setSelectedHost}>
                    <SelectTrigger className="w-full sm:w-[200px] h-8">
                      <SelectValue placeholder="Select host..." />
                    </SelectTrigger>
                    <SelectContent>
                      {onlineHosts.length === 0 && (
                        <SelectItem value="_none" disabled>
                          No hosts online
                        </SelectItem>
                      )}
                      {onlineHosts.map((host) => (
                        <SelectItem key={host.id} value={host.tunnelUrl}>
                          <span>{host.name}</span>
                          <span className="text-xs">({host.tunnelUrl})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Container Selector */}
                  <Select
                    value={selectedContainer}
                    onValueChange={setSelectedContainer}
                    disabled={!selectedHost}
                  >
                    <SelectTrigger className="w-full sm:w-[200px] h-8">
                      <SelectValue placeholder="Select container..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableContainers.length === 0 && (
                        <SelectItem value="_none" disabled>
                          No running containers
                        </SelectItem>
                      )}
                      {availableContainers
                        .filter((c) => c.state === "running")
                        .map((container) => (
                          <SelectItem key={container.id} value={container.id}>
                            {container.names[0] ||
                              container.id.substring(0, 12)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  {/* New Terminal Button */}
                  <Button
                    size="sm"
                    onClick={() =>
                      createTerminal(selectedHost, selectedContainer)
                    }
                    disabled={!selectedHost || !selectedContainer}
                    className="gap-2 h-8 w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="sm:inline">New Terminal</span>
                    <span className="sm:hidden">New</span>
                  </Button>

                  {terminals.size > 0 && (
                    <>
                      {/* Mobile: No separator needed in vertical layout */}
                      <div className="hidden sm:block w-px h-6 bg-border" />

                      {/* Layout Buttons - Smaller and more compact on mobile */}
                      <div className="flex gap-1 flex-wrap justify-center sm:justify-start">
                        <Button
                          size="sm"
                          variant={
                            gridLayout === "single" ? "default" : "ghost"
                          }
                          onClick={() => changeLayout("single")}
                          className="h-8 w-8 p-0 flex-shrink-0"
                          title="Single terminal"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={gridLayout === "2x1" ? "default" : "ghost"}
                          onClick={() => changeLayout("2x1")}
                          className="h-8 w-8 p-0 flex-shrink-0"
                          disabled={terminals.size < 2}
                          title="Split horizontally"
                        >
                          <SplitSquareHorizontal className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={gridLayout === "1x2" ? "default" : "ghost"}
                          onClick={() => changeLayout("1x2")}
                          className="h-8 w-8 p-0 flex-shrink-0 hidden sm:flex"
                          disabled={terminals.size < 2}
                          title="Split vertically"
                        >
                          <SplitSquareHorizontal className="w-4 h-4 rotate-90" />
                        </Button>
                        <Button
                          size="sm"
                          variant={gridLayout === "2x2" ? "default" : "ghost"}
                          onClick={() => changeLayout("2x2")}
                          className="h-8 w-8 p-0 flex-shrink-0 hidden md:flex"
                          disabled={terminals.size < 3}
                          title="2x2 grid"
                        >
                          <span className="text-xs font-bold">2x2</span>
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          {open && gridLayout === "single" && terminals.size > 0 && (
            <Tabs
              value={activeTerminalId || undefined}
              onValueChange={setActiveTerminalId}
            >
              <TabsList className="h-8">
                {Array.from(terminals.values()).map((term) => (
                  <div className=" flex flex-row  items-center" key={term.id}>
                    <TabsTrigger
                      key={term.id}
                      value={term.id}
                      className="h-7 gap-2"
                    >
                      <Terminal className="w-3 h-3" />
                      <span className="text-xs">{term.containerName}</span>
                    </TabsTrigger>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTerminal(term.id);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </TabsList>
            </Tabs>
          )}
        </div>

        {/* Terminal Container - All terminals rendered here, positioned by CSS */}
        {terminals.size > 0 && (
          <div
            className={`relative p-2 bg-[#1a1b26] ${!open ? "hidden" : ""}`}
            style={{
              height: "clamp(300px, 40vh, 500px)",
              maxHeight: "70vh",
            }}
          >
            {/* Grid overlay for visualization */}
            <div
              className={`absolute inset-2 grid gap-1 ${getGridClassName()} pointer-events-none`}
            >
              {getGridCells().map((cell, idx) => (
                <div key={idx} className="border border-gray-700/50 rounded" />
              ))}
            </div>

            {/* Render all terminals with absolute positioning */}
            {Array.from(terminals.values()).map((terminal) => {
              const cells = getGridCells();
              const cellIndex = cells.findIndex(
                (cell) => cell.terminalId === terminal.id,
              );
              const cell = cellIndex >= 0 ? cells[cellIndex] : null;
              const visible = isTerminalVisible(terminal.id);

              // Calculate position based on grid layout
              let style: React.CSSProperties = {
                position: "absolute",
                display: visible ? "block" : "none",
              };

              if (cell && visible) {
                const totalRows =
                  gridLayout === "1x2" || gridLayout === "2x2" ? 2 : 1;
                const totalCols =
                  gridLayout === "2x1" || gridLayout === "2x2" ? 2 : 1;

                const cellHeight = `calc((100% - ${(totalRows - 1) * 4}px) / ${totalRows})`;
                const cellWidth = `calc((100% - ${(totalCols - 1) * 4}px) / ${totalCols})`;

                style = {
                  ...style,
                  top: cell.position.row === 0 ? "0" : `calc(50% + 2px)`,
                  left: cell.position.col === 0 ? "0" : `calc(50% + 2px)`,
                  height: cellHeight,
                  width: cellWidth,
                };
              }

              return (
                <div
                  key={terminal.id}
                  style={style}
                  className="border rounded overflow-hidden bg-[#1a1b26]"
                >
                  {gridLayout !== "single" && visible && (
                    <div className="absolute top-1 left-1 right-1 z-10 flex items-center justify-between bg-[#1a1b26]/90 px-2 py-1 rounded text-xs">
                      <span className="text-gray-400">
                        {terminal.containerName}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0"
                        onClick={() => closeTerminal(terminal.id)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                  <TerminalPane
                    terminalId={terminal.id}
                    containerId={terminal.containerId}
                    containerName={terminal.containerName}
                    hostUrl={terminal.hostUrl}
                    onClose={() => closeTerminal(terminal.id)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
