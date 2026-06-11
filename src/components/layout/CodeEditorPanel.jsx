import React, { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { IoCloseSharp } from "react-icons/io5";
import { FaPlay, FaTrash } from "react-icons/fa";
import { Spinner } from "../tradingModals/Spinner";

const CodeEditorPanel = ({
  onClose,
  onDeploy,
  onClear,
  onEdit,
  editorCode,
  setEditorCode,
  isDeployed,
  isDeploying,
}) => {
  const [theme, setTheme] = useState(
    document.documentElement.getAttribute("data-theme") || "dark"
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.getAttribute("data-theme") || "dark");
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  const handleChange = (value) => {
    setEditorCode(value || "");

    // Call onEdit to reset deployed state
    if (onEdit) onEdit();

    // Remove automatic debounced deploy per user request (they want explicit button clicks now to toggle Deploy/Clear)
  };

  return (
    <div
      style={{
        width: "400px",
        borderLeft: "1px solid var(--border-color)",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-primary)",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--text-primary)" }}
        >
          Code Editor
        </span>
        <IoCloseSharp
          style={{ cursor: "pointer", color: "var(--text-secondary)", fontSize: "1.2rem" }}
          onClick={onClose}
        />
      </div>
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <Editor
          height="100%"
          defaultLanguage="python"
          theme={theme === "light" ? "light" : "vs-dark"}
          value={editorCode}
          onChange={handleChange}
          loading={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}><Spinner /></div>}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineHeight: 24,
            padding: { top: 16 },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: "smooth",
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            renderLineHighlight: "all",
          }}
        />
      </div>
      <div
        style={{
          padding: "12px 12px 14px",
          borderTop: "1px solid var(--border-color)",
          background: "linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)",
        }}
      >
        {isDeployed ? (
          <button
            onClick={onClear}
            style={{
              width: "100%",
              padding: "11px 16px",
              background: "transparent",
              color: "#ef4444",
              border: "1px solid rgba(239,68,68,0.35)",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "13px",
              letterSpacing: "0.04em",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "7px",
              transition: "all 0.15s ease",
              boxShadow: "0 0 0 0 rgba(239,68,68,0)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239,68,68,0.12)";
              e.currentTarget.style.borderColor = "rgba(239,68,68,0.7)";
              e.currentTarget.style.boxShadow = "0 0 14px rgba(239,68,68,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "rgba(239,68,68,0.35)";
              e.currentTarget.style.boxShadow = "0 0 0 0 rgba(239,68,68,0)";
            }}
          >
            <FaTrash size={11} />
            Clear
          </button>
        ) : (
          <button
            onClick={() => onDeploy(editorCode)}
            disabled={isDeploying}
            style={{
              width: "100%",
              padding: "11px 16px",
              background: isDeploying ? "var(--bg-secondary)" : "linear-gradient(135deg, var(--accent-color) 0%, #1a4fd6 100%)",
              color: isDeploying ? "var(--text-secondary)" : "#fff",
              border: isDeploying ? "1px solid var(--border-color)" : "1px solid rgba(41,98,255,0.6)",
              borderRadius: "6px",
              cursor: isDeploying ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: "13px",
              letterSpacing: "0.04em",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "7px",
              transition: "all 0.15s ease",
              boxShadow: isDeploying ? "none" : "0 2px 12px rgba(41,98,255,0.25), inset 0 1px 0 rgba(255,255,255,0.1)",
              opacity: isDeploying ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (isDeploying) return;
              e.currentTarget.style.background =
                "linear-gradient(135deg, #3d74ff 0%, var(--accent-color) 100%)";
              e.currentTarget.style.boxShadow =
                "0 4px 20px rgba(41,98,255,0.4), inset 0 1px 0 rgba(255,255,255,0.15)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              if (isDeploying) return;
              e.currentTarget.style.background =
                "linear-gradient(135deg, var(--accent-color) 0%, #1a4fd6 100%)";
              e.currentTarget.style.boxShadow =
                "0 2px 12px rgba(41,98,255,0.25), inset 0 1px 0 rgba(255,255,255,0.1)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {isDeploying ? (
              <>
                Deploying...
              </>
            ) : (
              <>
                <FaPlay size={11} />
                Deploy
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default CodeEditorPanel;
