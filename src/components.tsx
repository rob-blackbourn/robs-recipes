import { createContext, useContext, useEffect, useId, useState } from 'react';
import { positive } from './preferences';
import { unitModes, type UnitMode, type Step, type TemperatureUnit } from './types';
import { temperatureParts } from './temperatures';

export const TemperatureUnitContext = createContext<TemperatureUnit>('celsius');

export function TemperatureText({ text, allowGas = true }: { text: string; allowGas?: boolean }) {
  const unit = useContext(TemperatureUnitContext);
  return (
    <>
      {temperatureParts(text, unit, allowGas).map((part, index) => (
        <span className={part.temperature ? 'temperature' : undefined} key={index}>
          {part.text}
        </span>
      ))}
    </>
  );
}

export function UnitSelect({
  value,
  onChange,
  label = 'Display units',
}: {
  value: UnitMode;
  onChange: (mode: UnitMode) => void;
  label?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as UnitMode)}>
        {Object.entries(unitModes).map(([key, name]) => (
          <option value={key} key={key}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  optional = false,
  hint,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  optional?: boolean;
  hint?: string;
}) {
  const [draft, setDraft] = useState(value?.toString() || '');
  const [invalid, setInvalid] = useState(false);
  const id = useId();
  useEffect(() => {
    setDraft(value?.toString() || '');
    setInvalid(false);
  }, [value]);
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min="0"
        step="any"
        value={draft}
        aria-invalid={invalid}
        aria-describedby={hint || invalid ? id : undefined}
        placeholder={optional ? 'Use original' : 'Enter a value'}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          const parsed = positive(next);
          const valid =
            parsed !== undefined || (optional && next === '' && !event.target.validity.badInput);
          setInvalid(!valid);
          if (valid) onChange(parsed ?? null);
        }}
      />
      {(hint || invalid) && (
        <small id={id} className={invalid ? 'error' : ''}>
          {invalid ? 'Enter a number greater than zero.' : hint}
        </small>
      )}
    </label>
  );
}

function MethodStep({ text }: { text: string }) {
  const [completed, setCompleted] = useState(false);
  return (
    <button
      type="button"
      className="method-toggle"
      aria-pressed={completed}
      onClick={() => setCompleted((value) => !value)}
    >
      <TemperatureText text={text} />
    </button>
  );
}

export function Instructions({ steps }: { steps: Step[] }) {
  return (
    <ol className="steps">
      {steps.map((step, index) => (
        <li key={index} className={step['@type'] === 'HowToSection' ? 'step-section' : ''}>
          {step['@type'] === 'HowToSection' ? (
            <>
              <h3>
                <TemperatureText text={step.name || 'Preparation'} />
              </h3>
              {step.text && <MethodStep text={step.text} />}
              <Instructions steps={step.itemListElement || []} />
            </>
          ) : (
            <MethodStep
              text={(step.text || step.name || '').replace(/^\s*\d+(?:\.\d+)*[.)]\s+/, '')}
            />
          )}
        </li>
      ))}
    </ol>
  );
}

export function SourceLink({ text }: { text: string }) {
  return /^https?:\/\//i.test(text) ? (
    <a href={text} target="_blank" rel="noreferrer">
      {text}
    </a>
  ) : (
    <span>{text}</span>
  );
}
