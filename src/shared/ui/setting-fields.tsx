import type { ReactNode } from "react";
import { Input } from "#ui/input";

type SettingControlProps = { label: string; compact?: boolean };
type SettingRowProps = SettingControlProps & { children: ReactNode };
const rowClass = (compact: boolean) => `flex ${compact ? "min-h-11" : "min-h-12"} items-center justify-between gap-3 rounded-lg border ${compact ? "px-3 py-2" : "bg-background px-4 py-2"} text-sm`;

export function SettingRow({ label, children, compact = false }: SettingRowProps) {
  return <label className={rowClass(compact)}><span className="min-w-0">{label}</span><div className="flex min-w-0 shrink-0 items-center gap-2">{children}</div></label>;
}

export function SettingToggle({ label, checked, onChange, compact = false }: SettingControlProps & { checked: boolean; onChange: (checked: boolean) => void }) {
  return <SettingRow label={label} compact={compact}><input aria-label={label} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-primary" /></SettingRow>;
}

export function SettingNumber({ label, value, onChange, min = 1, max = 5000, step, compact = false }: SettingControlProps & { value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number }) {
  return <SettingRow label={label} compact={compact}><Input aria-label={label} className="w-24" type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Math.max(min, Math.min(max, Number(event.target.value) || min)))} /></SettingRow>;
}

export function SettingText({ label, value, onChange, inputClassName = "w-40", compact = false }: SettingControlProps & { value: string; onChange: (value: string) => void; inputClassName?: string }) {
  return <SettingRow label={label} compact={compact}><Input aria-label={label} className={inputClassName} value={value} onChange={(event) => onChange(event.target.value)} /></SettingRow>;
}

export function SettingSelect({ label, value, options, onChange, compact = false }: SettingControlProps & { value: string; options: Array<[string, string]>; onChange: (value: string) => void }) {
  return <SettingRow label={label} compact={compact}>
    <select aria-label={label} className="max-w-48 rounded-md border bg-background px-2 py-1.5" value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map(([optionValue, title]) => <option key={optionValue} value={optionValue}>{title}</option>)}
    </select>
  </SettingRow>;
}

export function SettingRange({ label, value, onChange, min, max, step, compact = false }: SettingControlProps & { value: number; onChange: (value: number) => void; min: number; max: number; step: number }) {
  return <SettingRow label={label} compact={compact}>
    <div className="flex w-40 items-center gap-3">
      <input aria-label={label} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="min-w-0 flex-1 accent-primary" />
      <output className="w-8 text-right tabular-nums">{value.toFixed(1)}</output>
    </div>
  </SettingRow>;
}
