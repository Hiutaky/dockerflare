"use client";

/**
 * TerminalPane - Single Terminal Instance Component
 * Manages its own xterm instance and WebSocket connection
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { useDocker } from "@/providers/docker.provider";
import { type Terminal } from "xterm";

interface TerminalPaneProps {
  terminalId: string;
  containerId: string;
  containerName: string;
  hostUrl: string;
  onClose: () => void;
}

export default function TerminalPane({
  terminalId,
  containerId,
  containerName,
  hostUrl,
  onClose,
}: TerminalPaneProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const lastOutputLengthRef = useRef<number>(0);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [fontSize, setFontSize] = useState(14);

  const { subscribeTerminal, sendTerminalInput, sendTerminalResize } =
    useDocker();

  // Calculate responsive font size based on screen width
  const calculateFontSize = useCallback(() => {
    if (typeof window === "undefined") return 14;
    const width = window.innerWidth;
    // Smaller font on mobile, larger on desktop
    if (width < 640) return 12; // mobile
    if (width < 1024) return 13; // tablet
    return 14; // desktop
  }, []);

  // Update font size when screen resizes
  useEffect(() => {
    const updateFontSize = () => {
      const newSize = calculateFontSize();
      setFontSize(newSize);

      // Update existing terminal if initialized
      if (xtermRef.current) {
        xtermRef.current.options.fontSize = newSize;
        // Refit after font size change
        if (fitAddonRef.current) {
          try {
            fitAddonRef.current.fit();
            if (xtermRef.current) {
              sendTerminalResize(
                containerId,
                xtermRef.current.rows,
                xtermRef.current.cols,
              );
            }
          } catch (err) {
            console.error("Error refitting after font size change:", err);
          }
        }
      }
    };

    // Set initial font size
    updateFontSize();

    // Listen for resize
    window.addEventListener("resize", () => {
      // Debounce resize events
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = setTimeout(updateFontSize, 150);
    });

    return () => {
      window.removeEventListener("resize", updateFontSize);
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
    };
  }, [calculateFontSize, containerId, sendTerminalResize]);

  useEffect(() => {
    (async () => {
      if (!terminalRef.current || initialized) return;

      const XTerm = (await import("xterm")).Terminal;
      const xterm = new XTerm({
        cursorBlink: true,
        fontSize: fontSize,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        theme: {
          background: "#1a1b26",
          foreground: "#a9b1d6",
          cursor: "#c0caf5",
          black: "#32344a",
          red: "#f7768e",
          green: "#9ece6a",
          yellow: "#e0af68",
          blue: "#7aa2f7",
          magenta: "#bb9af7",
          cyan: "#7dcfff",
          white: "#787c99",
        },
        rows: 24,
        cols: 80,
        scrollback: 10000,
      });

      const fitAddon = new FitAddon();
      xterm.loadAddon(fitAddon);
      xterm.open(terminalRef.current);

      // Store refs
      xtermRef.current = xterm;
      fitAddonRef.current = fitAddon;

      try {
        fitAddon.fit();
      } catch (err) {
        console.error("Error fitting terminal:", err);
      }

      // Welcome message
      xterm.writeln(
        "\x1b[1;36m╔════════════════════════════════════════════════════════╗\x1b[0m",
      );
      xterm.writeln(
        "\x1b[1;36m║         Localflare Multi-Terminal Manager             ║\x1b[0m",
      );
      xterm.writeln(
        "\x1b[1;36m╚════════════════════════════════════════════════════════╝\x1b[0m",
      );
      xterm.writeln("");
      xterm.writeln(`\x1b[32mTerminal ID:\x1b[0m ${terminalId}`);
      xterm.writeln(`\x1b[32mContainer:\x1b[0m   ${containerName}`);
      xterm.writeln(`\x1b[32mHost:\x1b[0m        ${hostUrl}`);
      xterm.writeln("");
      xterm.writeln("\x1b[33mConnecting to container shell...\x1b[0m");
      xterm.writeln("");

      // Handle user input
      xterm.onData((data) => {
        sendTerminalInput(containerId, data);
      });

      // Subscribe to terminal output
      const unsubscribe = subscribeTerminal(
        containerId,
        (output) => {
          if (output.length > lastOutputLengthRef.current) {
            const newOutput = output.slice(lastOutputLengthRef.current);
            xterm.write(newOutput);
            lastOutputLengthRef.current = output.length;
          }
        },
        hostUrl,
      );

      unsubscribeRef.current = unsubscribe;

      // Handle resize
      const handleResize = () => {
        if (fitAddonRef.current && xtermRef.current) {
          try {
            fitAddonRef.current.fit();
            sendTerminalResize(
              containerId,
              xtermRef.current.rows,
              xtermRef.current.cols,
            );
          } catch (err) {
            console.error("Error resizing terminal:", err);
          }
        }
      };

      // Add small delay before first resize to ensure DOM is ready
      const resizeTimeout = setTimeout(() => {
        handleResize();
      }, 100);

      window.addEventListener("resize", handleResize);

      // Cleanup
      return () => {
        clearTimeout(resizeTimeout);
        setInitialized(false);
        window.removeEventListener("resize", handleResize);
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
        }
        if (xtermRef.current) {
          xtermRef.current.dispose();
        }
      };
    })();
  }, [
    terminalId,
    containerId,
    terminalRef,
    xtermRef,
    containerName,
    hostUrl,
    subscribeTerminal,
    sendTerminalInput,
    sendTerminalResize,
    fontSize,
  ]);

  // Refit terminal when container is resized
  useEffect(() => {
    const handleFit = () => {
      if (fitAddonRef.current && xtermRef.current) {
        try {
          setTimeout(() => {
            fitAddonRef.current?.fit();
            if (xtermRef.current) {
              sendTerminalResize(
                containerId,
                xtermRef.current.rows,
                xtermRef.current.cols,
              );
            }
          }, 150);
        } catch (err) {
          console.error("Error refitting terminal:", err);
        }
      }
    };

    // Listen for layout changes
    const observer = new ResizeObserver(handleFit);
    if (terminalRef.current) {
      observer.observe(terminalRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [containerId, sendTerminalResize]);

  return <div ref={terminalRef} className="w-full h-full" />;
}
