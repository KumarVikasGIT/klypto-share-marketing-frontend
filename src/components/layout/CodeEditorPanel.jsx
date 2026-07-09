import { useEffect, useRef, useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { IoCloseSharp } from "react-icons/io5";
import { FaPlay, FaTrash } from "react-icons/fa";
import { Spinner } from "../tradingModals/Spinner";
import {
  generateStrategyFromPrompt,
  PROMPT_SUGGESTIONS,
} from "../../util/strategyPromptGenerator";
import {
  extractStrategyAgentError,
  generateStrategyAgent,
} from "../../services/strategyAgentService";
import IndicatorFeaturePanel from "../../chart/settings/IndicatorFeaturePanel";

const CodeEditorPanel = ({
  onClose,
  onDeploy,
  onClear,
  onEdit,
  editorCode,
  setEditorCode,
  templateCode,
  templateLabel = "TA Template",
  helperText = "Preloaded: ta, np, pd, df, const(), open, high, low, close, volume, time | actions: plot, buy, sell, alert",
  isDeployed,
  isDeploying,
  indicatorContract,
  indicatorSettings = {},
  onIndicatorSettingsChange,
  onIndicatorSettingsRerun,
}) => {
  const [theme, setTheme] = useState(
    document.documentElement.getAttribute("data-theme") || "dark",
  );
  const [hasErrors, setHasErrors] = useState(false);
  const [promptInput, setPromptInput] = useState("");
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      role: "assistant",
      text: "Describe a strategy in plain English and I will generate code directly into the editor using the backend agent.",
    },
  ]);

  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const completionProviderRef = useRef(null);
  const chatScrollRef = useRef(null);

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

  useEffect(
    () => () => {
      if (completionProviderRef.current) {
        completionProviderRef.current.dispose();
        completionProviderRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    if (!chatScrollRef.current) return;
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatMessages]);

  const handleChange = (value) => {
    setEditorCode(value || "");

    if (onEdit) onEdit();
  };

  const registerStrategyCompletions = useCallback((monaco) => {
    if (completionProviderRef.current) {
      completionProviderRef.current.dispose();
    }

    completionProviderRef.current = monaco.languages.registerCompletionItemProvider(
      "python",
      {
        triggerCharacters: [".", "(", ","],
        provideCompletionItems(model, position) {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          return {
            suggestions: [
              {
                label: "import pandas_ta as ta",
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: "import pandas_ta as ta",
                range,
              },
              {
                label: "import numpy as np",
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: "import numpy as np",
                range,
              },
              {
                label: "import pandas as pd",
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: "import pandas as pd",
                range,
              },
              {
                label: "from chartlab import ...",
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText:
                  "from chartlab import indicator, input_int, plot, hline, fill, signal",
                range,
              },
              {
                label: "ta.bbands",
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: 'ta.bbands(ctx.close, length=${1:20}, std=${2:2})',
                insertTextRules:
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: "Returns Bollinger Bands with pandas_ta-style keys.",
                range,
              },
              {
                label: "ctx.ta.sma",
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: "ctx.ta.sma(ctx.close, length=${1:20})",
                insertTextRules:
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range,
              },
              {
                label: "ctx.ta.ema",
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: "ctx.ta.ema(ctx.close, length=${1:20})",
                insertTextRules:
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range,
              },
              {
                label: "ctx.ta.rsi",
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: "ctx.ta.rsi(ctx.close, length=${1:14})",
                insertTextRules:
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range,
              },
              {
                label: "const",
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: "const(${1:70})",
                insertTextRules:
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: "Create a full-length constant series for plots or comparisons.",
                range,
              },
              {
                label: "np.full",
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: "np.full(len(close), ${1:70})",
                insertTextRules:
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: "Create a full-length constant series with the numpy shim.",
                range,
              },
              {
                label: "pd.Series",
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: "pd.Series([${1:30}] * len(close))",
                insertTextRules:
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: "Create a pandas-style series in the sandbox.",
                range,
              },
              {
                label: "df rolling mean",
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: 'df["${1:close}"].rolling(window=${2:20}).mean()',
                insertTextRules:
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: "Use the preloaded DataFrame with pandas-style rolling calculations.",
                range,
              },
              {
                label: "ta.macd",
                kind: monaco.languages.CompletionItemKind.Function,
                insertText:
                  "ctx.ta.macd(ctx.close, fast=${1:12}, slow=${2:26}, signal=${3:9})",
                insertTextRules:
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range,
              },
              {
                label: "plot",
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: 'plot(${1:series}, title="${2:Series Name}", color="${3:#22c55e}")',
                insertTextRules:
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range,
              },
              {
                label: "signal buy",
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: 'signal(${1:condition}, side="BUY", label="${2:BUY}")',
                insertTextRules:
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range,
              },
              {
                label: "signal sell",
                kind: monaco.languages.CompletionItemKind.Function,
                insertText: 'signal(${1:condition}, side="SELL", label="${2:SELL}")',
                insertTextRules:
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range,
              },
              {
                label: "chartlab indicator",
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText:
                  '@indicator(name="${1:My Indicator}", pane="${2:overlay}")\ndef run_strategy(ctx):\n    ${3:pass}',
                insertTextRules:
                  monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range,
              },
            ],
          };
        },
      },
    );
  }, []);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    registerStrategyCompletions(monaco);
  };

  const handleLoadTemplate = () => {
    if (!templateCode) return;
    setEditorCode(templateCode);
    if (onEdit) onEdit();
  };

  const handleGenerateFromPrompt = useCallback(async () => {
    const cleanedPrompt = promptInput.trim();
    if (!cleanedPrompt || isGeneratingPrompt) return;

    setIsGeneratingPrompt(true);

    try {
      const generated = await generateStrategyAgent({
        prompt: cleanedPrompt,
        include_codebase: true,
        include_books: false,
      });

      if (generated?.replace_editor_code !== false && generated?.code) {
        setEditorCode(generated.code);
        if (onEdit) onEdit();
      }

      const warningText =
        Array.isArray(generated.warnings) && generated.warnings.length > 0
          ? `\n\nWarnings: ${generated.warnings.slice(0, 2).join(" | ")}`
          : "";

      setChatMessages((prev) => [
        ...prev,
        { role: "user", text: cleanedPrompt },
        {
          role: "assistant",
          text: `${generated.reply || "Strategy generated from backend."}${warningText}`,
        },
      ]);
      setPromptInput("");
      editorRef.current?.focus?.();
    } catch (error) {
      console.error("[Strategy Agent] Remote generation failed:", error);
      const generated = generateStrategyFromPrompt(cleanedPrompt);
      const errorMessage = extractStrategyAgentError(error);

      setEditorCode(generated.code);
      if (onEdit) onEdit();

      setChatMessages((prev) => [
        ...prev,
        { role: "user", text: cleanedPrompt },
        {
          role: "assistant",
          text:
            `${generated.reply}\n\n` +
            `Backend note: ${errorMessage}. I used the local fallback generator so you can keep editing.`,
        },
      ]);
      setPromptInput("");
      editorRef.current?.focus?.();
    } finally {
      setIsGeneratingPrompt(false);
    }
  }, [isGeneratingPrompt, onEdit, promptInput, setEditorCode]);

  const handleValidate = useCallback((markers) => {
    // MarkerSeverity.Error is 8
    const errors = markers.filter((marker) => marker.severity === 8);
    setHasErrors(errors.length > 0);
  }, []);

  return (
    <>
      <style>{`
        .code-editor-panel {
          width: 400px;
          max-width: 100%;
          display: flex;
          flex-direction: column;
          border-left: 1px solid var(--border-color);
          border-right: 1px solid var(--border-color);
          background-color: var(--bg-primary);
          color: var(--text-primary);
          z-index: 100;
        }
        @media (max-width: 768px) {
          .code-editor-panel {
            position: absolute;
            top: 0;
            left: 0;
            width: 100% !important;
            height: 100% !important;
            border: none;
          }
        }
      `}</style>
      <div className="code-editor-panel">
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
          style={{
            fontWeight: 600,
            fontSize: "0.95rem",
            color: "var(--text-primary)",
          }}
        >
          Code Editor
        </span>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <button
            onClick={handleLoadTemplate}
            style={{
              padding: "6px 10px",
              borderRadius: "6px",
              border: "1px solid rgba(34,197,94,0.35)",
              background: "rgba(34,197,94,0.08)",
              color: "#22c55e",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {templateLabel}
          </button>
          <IoCloseSharp
            style={{
              cursor: "pointer",
              color: "var(--text-secondary)",
              fontSize: "1.2rem",
            }}
            onClick={onClose}
          />
        </div>
      </div>
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "10px 14px",
            borderBottom: "1px solid var(--border-color)",
            background: "rgba(34,197,94,0.05)",
            color: "var(--text-secondary)",
            fontSize: "0.76rem",
            lineHeight: 1.5,
          }}
        >
          {helperText}
        </div>
        <div
          style={{
            padding: "12px 14px",
            borderBottom: "1px solid var(--border-color)",
            background:
              "linear-gradient(180deg, rgba(59,130,246,0.08) 0%, rgba(34,197,94,0.04) 100%)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                marginBottom: "4px",
              }}
            >
              Strategy Chatbot
            </div>
            <div
              style={{
                fontSize: "0.76rem",
                color: "var(--text-secondary)",
                lineHeight: 1.5,
              }}
            >
              Ask for a setup like "RSI 14 mean reversion with 30/70 levels"
              or "EMA 9/21 crossover with long only entries". I will call the
              backend agent, generate editable strategy code, and load it into
              the editor.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            {PROMPT_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setPromptInput(suggestion)}
                style={{
                  padding: "6px 10px",
                  borderRadius: "999px",
                  border: "1px solid rgba(59,130,246,0.22)",
                  background: "rgba(59,130,246,0.08)",
                  color: "#60a5fa",
                  fontSize: "0.72rem",
                  cursor: "pointer",
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>

          <div
            ref={chatScrollRef}
            style={{
              maxHeight: "132px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              paddingRight: "4px",
            }}
          >
            {chatMessages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                style={{
                  alignSelf:
                    message.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "88%",
                  padding: "8px 10px",
                  borderRadius: "12px",
                  background:
                    message.role === "user"
                      ? "rgba(59,130,246,0.14)"
                      : "rgba(15,23,42,0.5)",
                  border:
                    message.role === "user"
                      ? "1px solid rgba(59,130,246,0.22)"
                      : "1px solid var(--border-color)",
                  color:
                    message.role === "user"
                      ? "#bfdbfe"
                      : "var(--text-secondary)",
                  fontSize: "0.76rem",
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                }}
              >
                {message.text}
              </div>
            ))}
          </div>

          <textarea
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                handleGenerateFromPrompt();
              }
            }}
            placeholder="Describe the strategy you want to generate..."
            style={{
              minHeight: "78px",
              resize: "vertical",
              borderRadius: "10px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-primary)",
              color: "var(--text-primary)",
              padding: "10px 12px",
              fontSize: "0.82rem",
              lineHeight: 1.5,
              outline: "none",
            }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
            }}
          >
            <div
              style={{
                fontSize: "0.72rem",
                color: "var(--text-secondary)",
              }}
            >
              Press `Ctrl+Enter` to chat with the backend agent. Strategy
              replies can update the editor; chat replies will stay in the
              conversation only.
            </div>
            <button
              type="button"
              onClick={handleGenerateFromPrompt}
              disabled={!promptInput.trim() || isGeneratingPrompt}
              style={{
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid rgba(59,130,246,0.35)",
                background:
                  !promptInput.trim() || isGeneratingPrompt
                    ? "var(--bg-secondary)"
                    : "linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%)",
                color:
                  !promptInput.trim() || isGeneratingPrompt
                    ? "var(--text-secondary)"
                    : "#fff",
                cursor:
                  !promptInput.trim() || isGeneratingPrompt
                    ? "not-allowed"
                    : "pointer",
                fontWeight: 700,
                fontSize: "0.78rem",
                minWidth: "150px",
              }}
            >
              {isGeneratingPrompt ? "Generating..." : "Generate Strategy"}
            </button>
          </div>
        </div>
        {indicatorContract?.features && (
          <div
            style={{
              maxHeight: "240px",
              overflowY: "auto",
              padding: "12px 14px",
              borderBottom: "1px solid var(--border-color)",
              background: "rgba(15, 23, 42, 0.34)",
            }}
          >
            <IndicatorFeaturePanel
              contract={indicatorContract}
              values={indicatorSettings}
              onChange={onIndicatorSettingsChange}
              onRerun={onIndicatorSettingsRerun}
            />
          </div>
        )}
        <Editor
          height="100%"
          defaultLanguage="python"
          theme={theme === "light" ? "light" : "vs-dark"}
          value={editorCode}
          onChange={handleChange}
          onValidate={handleValidate}
          onMount={handleEditorDidMount}
          loading={
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
              }}
            >
              <Spinner />
            </div>
          }
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
          background:
            "linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 100%)",
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
            disabled={isDeploying || hasErrors}
            style={{
              width: "100%",
              padding: "11px 16px",
              background:
                isDeploying || hasErrors
                  ? "var(--bg-secondary)"
                  : "linear-gradient(135deg, var(--accent-color) 0%, #1a4fd6 100%)",
              color:
                isDeploying || hasErrors ? "var(--text-secondary)" : "#fff",
              border:
                isDeploying || hasErrors
                  ? "1px solid var(--border-color)"
                  : "1px solid rgba(41,98,255,0.6)",
              borderRadius: "6px",
              cursor: isDeploying || hasErrors ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: "13px",
              letterSpacing: "0.04em",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "7px",
              transition: "all 0.15s ease",
              boxShadow:
                isDeploying || hasErrors
                  ? "none"
                  : "0 2px 12px rgba(41,98,255,0.25), inset 0 1px 0 rgba(255,255,255,0.1)",
              opacity: isDeploying || hasErrors ? 0.7 : 1,
            }}
            title={hasErrors ? "Please fix syntax errors before deploying" : ""}
            onMouseEnter={(e) => {
              if (isDeploying || hasErrors) return;
              e.currentTarget.style.background =
                "linear-gradient(135deg, #3d74ff 0%, var(--accent-color) 100%)";
              e.currentTarget.style.boxShadow =
                "0 4px 20px rgba(41,98,255,0.4), inset 0 1px 0 rgba(255,255,255,0.15)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              if (isDeploying || hasErrors) return;
              e.currentTarget.style.background =
                "linear-gradient(135deg, var(--accent-color) 0%, #1a4fd6 100%)";
              e.currentTarget.style.boxShadow =
                "0 2px 12px rgba(41,98,255,0.25), inset 0 1px 0 rgba(255,255,255,0.1)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            {isDeploying ? (
              <>Deploying...</>
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
    </>
  );
};

export default CodeEditorPanel;
