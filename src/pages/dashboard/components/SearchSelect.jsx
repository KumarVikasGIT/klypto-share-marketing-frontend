import { useState, useRef, useEffect } from "react";

// Replace your <select> with this component:
export default function SearchSelect({ stocks, stock, setStock, style }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  //   console.log("📦 stocks:", stocks);
  // console.log("🎯 selected stock value:", stock);

  const selected = stocks.find((s) => s.userCode === stock);
  const displayValue = selected
    ? `${selected.name} (${selected.actualSymbol})`
    : "";

  const normalizedQuery = query.toLowerCase().trim();

  const filtered = normalizedQuery
    ? stocks.filter((s) => {
        const name = s.name?.toLowerCase() || "";
        const symbol = s.actualSymbol?.toLowerCase() || "";

        const match =
          name.includes(normalizedQuery) || symbol.includes(normalizedQuery);

        return match;
      })
    : stocks;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpen = () => {
    setOpen(true);
    setQuery(""); // ✅ show full list
    setHighlighted(0);
    setTimeout(() => inputRef.current?.focus(), 0);
  };
  const handleSelect = (symbol) => {
    console.log("✅ selected:", symbol);
    setStock(symbol);
    setOpen(false);
    setQuery("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlighted])
        handleSelect(filtered[highlighted].actualSymbol);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  };

  const selectStyle = { ...style, cursor: "pointer", userSelect: "none" };

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        display: "inline-block",
        width: style?.width || "100%",
      }}
    >
      {/* Trigger — looks exactly like the original <select> */}
      {!open ? (
        <div
          onClick={handleOpen}
          style={{
            ...selectStyle,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ color: stock ? "inherit" : "#999" }}>
            {stock ? displayValue : "Select stock"}
          </span>
        </div>
      ) : (
        /* Search input — same size/style as the trigger */
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            setHighlighted(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search stock…"
          style={{
            ...selectStyle,
            width: "100%",
            boxSizing: "border-box",
          }}
        />
      )}

      {/* Dropdown list */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 1000,
            background: "#fff",
            border: "1px solid #ccc",
            borderRadius: 4,
            maxHeight: 220,
            overflowY: "auto",
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            marginTop: 2,
          }}
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "8px 12px",
                fontSize: "0.85rem",
                color: "#999",
              }}
            >
              No results
            </div>
          ) : (
            filtered.map((s, i) => (
              <div
                key={i}
                onMouseDown={() => handleSelect(s.userCode)}
                // onMouseEnter={() => setHighlighted(i)}
                style={{
                  padding: "7px 12px",
                  fontSize: "0.85rem",
                  fontWeight: s.userCode === stock ? 700 : 400,
                  cursor: "pointer",
                  background: i === highlighted ? "#f0f0f0" : "transparent",
                  color: "#000",
                }}
              >
                {s.name} ({s.userCode})<span className="text-muted"> {s.segment}</span> 
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
