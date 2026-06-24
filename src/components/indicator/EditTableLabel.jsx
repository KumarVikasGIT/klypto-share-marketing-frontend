import { useState, useEffect, useRef, useMemo } from "react";
import { Form, Badge } from "react-bootstrap";

export function EditableSelect({ value, options, onChange }) {
  const [editing, setEditing] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef();

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      setSearch(""); // reset search on open
    }
  }, [editing]);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase()),
  );

  if (editing) {
    return (
      <div className="position-relative" style={{ minWidth: "140px" }}>
        {/* 🔍 SEARCH INPUT */}
        <input
          ref={ref}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onBlur={() => setTimeout(() => setEditing(false), 150)}
          placeholder="Search..."
          className="px-2 text-sm border-none outline-none bg-gray-100 ring-gray-200 rounded-md w-100"
        />

        {/* 📋 DROPDOWN LIST */}
        <div
          className="position-absolute bg-white border rounded shadow-sm mt-1 w-100"
          style={{ maxHeight: "150px", overflowY: "auto", zIndex: 1000 }}
        >
          {filteredOptions?.length === 0 ? (
            <div className="px-2 py-1 text-muted small">No results</div>
          ) : (
            filteredOptions?.map((opt, index) => (
              <div
                key={index}
                onMouseDown={() => {
                  onChange(opt.value);
                  setEditing(false);
                }}
                className="px-2 py-1 text-sm text-left hover-bg cursor-pointer"
                style={{ cursor: "pointer" }}
              >
                {opt.label}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className="cursor-pointer text-sm px-2 py-1 rounded-md hover:bg-slate-100 transition"
    >
      {selectedLabel || "Select"}
    </span>
  );
}

/* ---------------- Editable Number ---------------- */

export function EditableNumber({ value, onChange, width = "w-fit" }) {
  const [editing, setEditing] = useState(false);
  const ref = useRef();

  useEffect(() => {
    if (editing && ref.current) ref.current.focus();
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={ref}
        type="number"
        defaultValue={value}
        min={0}
        onBlur={(e) => {
          onChange(Number(e.target.value));
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onChange(Number(e.target.value));
            setEditing(false);
          }
        }}
        className={`${width} max-w-20 px-2 text-sm border-none outline-none bg-gray-50 ring-gray-200 rounded-md`}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={`${width} cursor-pointer text-sm px-2 py-1 rounded-md hover:bg-slate-100  text-center`}
    >
      {value}
    </span>
  );
}

export default function EditableMultiSelect({
  value = [],
  options = [],
  onChange,
  placeholder = "Select",
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  /* ---------------- CLOSE ON OUTSIDE CLICK ---------------- */
  useEffect(() => {
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  /* ---------------- FILTERED OPTIONS ---------------- */
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(search.toLowerCase()),
    );
  }, [options, search]);

  /* ---------------- HELPERS ---------------- */
  const isSelected = (opt) => value.some((v) => v.value === opt.value);

  function toggleOption(option) {
    const updated = isSelected(option)
      ? value.filter((v) => v.value !== option.value)
      : [...value, option];
    onChange?.(updated);
  }

  function toggleAll() {
    onChange?.(value?.length === filteredOptions?.length ? [] : filteredOptions);
  }

  const allSelected =
    filteredOptions?.length > 0 && value?.length === filteredOptions?.length;

  /* ---------------- DISPLAY ---------------- */
  const display =
    value?.length === 0 ? (
      <span className="text-secondary">{placeholder}</span>
    ) : (
      <div className="d-flex flex-wrap gap-1">
        {value.map((item) => (
          <Badge
            key={item.value}
            pill
            style={{ background: "#e4e4e4", color: "#fff", fontWeight: 500 }}
          >
            {item.label}
          </Badge>
        ))}
      </div>
    );

  /* ---------------- RENDER ---------------- */
  return (
    <div
      ref={ref}
      className={`position-relative ${className}`}
      style={{ fontSize: "14px" }}
    >
      {/* FIELD */}
      <div
        onClick={() => setOpen((o) => !o)}
        className="d-flex align-items-center gap-2 px-2 py-1 bg-white rounded-3 cursor-pointer"
        style={{
          minHeight: "36px",
          width: "fit-content",
          cursor: "pointer",
        }}
      >
        <div className="flex-grow-1 fw-semibold text-dark">{display}</div>
      </div>

      {/* DROPDOWN */}
      {open && (
        <div
          className="position-absolute bg-white text-left rounded-3 shadow border border-light-subtle overflow-hidden"
          style={{
            zIndex: 50,
            top: "calc(100% + 4px)",
            left: 0,
            width: "320px",
          }}
        >
          {/* SEARCH */}
          <div className="p-2 border-bottom">
            <Form.Control
              size="sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="rounded-2"
            />
          </div>

          {/* SELECT ALL */}
          <div
            style={{ paddingLeft: "6px", gridColumn: "1 / -1" }}
            className="bg-light border-bottom"
          >
            <Form.Check
              type="checkbox"
              id="select-all"
              label="Select All"
              checked={allSelected}
              onChange={toggleAll}
              className="py-2 mb-0 fw-semibold  text-secondary"
              style={{ cursor: "pointer" }}
            />
          </div>

          {/* OPTIONS — 2 column grid */}
          <div
            className="overflow-auto"
            style={{
              maxHeight: "240px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              paddingLeft: "10px", // ← fixes cut-off checkboxes
              paddingRight: "8px",
            }}
          >
            {filteredOptions.map((option) => (
              <Form.Check
                key={option.value}
                type="checkbox"
                id={`option-${option.value}`}
                label={option.label}
                checked={isSelected(option)}
                onChange={() => toggleOption(option)}
                className="px-3 py-2 mb-0 text-dark"
                style={{ cursor: "pointer" }}
              />
            ))}

            {filteredOptions?.length === 0 && (
              <div
                className="px-3 py-3 text-muted small"
                style={{ gridColumn: "1 / -1" }}
              >
                No options found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
export const OPERATORS = [
  { label: "Greater Than (>)", value: ">" },
  { label: "Less Than (<)", value: "<" },
  { label: "Greater Than or Equal (≥)", value: ">=" },
  { label: "Less Than or Equal (≤)", value: "<=" },
  { label: "Equal (=)", value: "=" },
  { label: "Not Equal (≠)", value: "!=" },
  { label: "Crosses Above ⤴", value: "crosses_above" },
  { label: "Crosses Below ⤵", value: "crosses_below" },
];
