import React from "react";

type TaxRateControlProps = {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  compact?: boolean;
  id?: string;
};

const presets = [0, 10, 18];

function normalizeRate(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export default function TaxRateControl({
  value,
  onChange,
  label = "GST rate",
  compact = false,
  id,
}: TaxRateControlProps) {
  const rate = normalizeRate(Number(value));

  if (compact) {
    return (
      <label className="tax-rate-compact" title="Enter any GST percentage from 0 to 100">
        <input
          id={id}
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={rate}
          onChange={(event) => onChange(normalizeRate(Number(event.target.value)))}
          aria-label={label}
        />
        <span>%</span>
      </label>
    );
  }

  return (
    <div className="tax-rate-control">
      <div className="tax-rate-head">
        <span>{label}</span>
        <small>Custom percentage allowed</small>
      </div>
      <div className="tax-rate-body">
        <div className="tax-rate-presets" aria-label="GST presets">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              className={rate === preset ? "is-active" : ""}
              onClick={() => onChange(preset)}
            >
              {preset === 0 ? "No GST" : `${preset}%`}
            </button>
          ))}
        </div>
        <label className="tax-rate-custom">
          <span>Custom</span>
          <div>
            <input
              id={id}
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={rate}
              onChange={(event) => onChange(normalizeRate(Number(event.target.value)))}
            />
            <strong>%</strong>
          </div>
        </label>
      </div>
    </div>
  );
}
