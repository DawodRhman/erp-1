import React, { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

export type SearchableSelectOption = {
  value: string;
  label: string;
  searchText?: string;
};

type SearchableSelectProps = {
  value: string;
  options: SearchableSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  inputStyle?: CSSProperties;
};

export default function SearchableSelect({
  value,
  options,
  onChange,
  placeholder = "Select an option",
  emptyText = "No matching records found.",
  disabled = false,
  inputStyle,
}: SearchableSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const [query, setQuery] = useState(selected?.label || "");

  useEffect(() => {
    if (!open) setQuery(selected?.label || "");
  }, [open, selected?.label]);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const selectedLabelIsShowing = Boolean(value && selected && query === selected.label);
    const normalizedQuery = selectedLabelIsShowing ? "" : query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) =>
      `${option.label} ${option.searchText || ""}`.toLowerCase().includes(normalizedQuery),
    );
  }, [options, query, selected, value]);

  const choose = (option: SearchableSelectOption) => {
    onChange(option.value);
    setQuery(option.label);
    setOpen(false);
  };

  return (
    <div className="searchable-select" ref={rootRef}>
      <div className="searchable-select-control">
        <Search className="searchable-select-search-icon" size={16} aria-hidden="true" />
        <input
          className="searchable-select-input"
          style={inputStyle}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          onFocus={(event) => {
            setOpen(true);
            event.currentTarget.select();
          }}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            if (value) onChange("");
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "Enter" && open && filteredOptions.length === 1) {
              event.preventDefault();
              choose(filteredOptions[0]);
            }
          }}
        />
        <ChevronDown className="searchable-select-chevron" size={17} aria-hidden="true" />
      </div>

      {open && !disabled ? (
        <div className="searchable-select-menu" role="listbox">
          {filteredOptions.length ? filteredOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={`searchable-select-option${option.value === value ? " selected" : ""}`}
              onClick={() => choose(option)}
            >
              {option.label}
            </button>
          )) : <div className="searchable-select-empty">{emptyText}</div>}
        </div>
      ) : null}
    </div>
  );
}
