/**
 * Campos de entrada. A conversão cm <-> mm mora só aqui (especificação, seção 3).
 */
import { useEffect, useState } from "react";
import { cmParaMm, mmParaCm, mmParaMetrosLabel } from "@/domain/units";

interface CampoCmProps {
  label: string;
  /** valor em mm (inteiro) */
  valueMm: number;
  onChangeMm: (mm: number) => void;
  min?: number;
  max?: number;
}

/** Campo numérico em centímetros com o metro como referência acima. */
export function CampoCm({ label, valueMm, onChangeMm, min = 0, max = 600 }: CampoCmProps) {
  const [txt, setTxt] = useState(String(mmParaCm(valueMm)));

  useEffect(() => {
    setTxt(String(mmParaCm(valueMm)));
  }, [valueMm]);

  const commit = () => {
    const cm = Number(txt.replace(",", "."));
    if (!Number.isFinite(cm)) {
      setTxt(String(mmParaCm(valueMm)));
      return;
    }
    const clamped = Math.min(Math.max(cm, min), max);
    onChangeMm(cmParaMm(clamped));
  };

  return (
    <label className="campo">
      <span className="campo__label">
        {label}
        <em>{mmParaMetrosLabel(valueMm)} m</em>
      </span>
      <span className="campo__input">
        <input
          type="number"
          inputMode="decimal"
          value={txt}
          onChange={(e) => setTxt(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
        <span className="campo__unidade">cm</span>
      </span>
    </label>
  );
}

interface SliderCmProps {
  label: string;
  valueMm: number;
  onChangeMm: (mm: number) => void;
  minMm: number;
  maxMm: number;
  stepMm?: number;
}

/** Slider ("barrinha") em mm, mostrando o valor em metros no canto. */
export function SliderCm({
  label,
  valueMm,
  onChangeMm,
  minMm,
  maxMm,
  stepMm = 10,
}: SliderCmProps) {
  return (
    <div className="slider">
      <div className="slider__topo">
        <span>{label}</span>
        <strong>{mmParaMetrosLabel(valueMm)} m</strong>
      </div>
      <input
        type="range"
        min={minMm}
        max={maxMm}
        step={stepMm}
        value={valueMm}
        onChange={(e) => onChangeMm(Number(e.target.value))}
      />
    </div>
  );
}

interface SliderMmProps {
  label: string;
  valueMm: number;
  onChangeMm: (mm: number) => void;
  minMm?: number;
  maxMm?: number;
  stepMm?: number;
  zeroLabel?: string;
}

/** Slider em mm mostrando cm; quando 0 mostra um rótulo ("sem"). */
export function SliderMm({
  label,
  valueMm,
  onChangeMm,
  minMm = 0,
  maxMm = 250,
  stepMm = 5,
  zeroLabel = "sem",
}: SliderMmProps) {
  return (
    <div className="slider slider--sm">
      <div className="slider__topo">
        <span>{label}</span>
        <strong>{valueMm > 0 ? `${Math.round(valueMm / 10)} cm` : zeroLabel}</strong>
      </div>
      <input
        type="range"
        min={minMm}
        max={maxMm}
        step={stepMm}
        value={valueMm}
        onChange={(e) => onChangeMm(Number(e.target.value))}
      />
    </div>
  );
}

interface SegmentedProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

export function Segmented<T extends string>({ value, options, onChange }: SegmentedProps<T>) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          className={o.value === value ? "is-active" : ""}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
