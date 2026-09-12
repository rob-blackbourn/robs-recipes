import { useEffect, useId, useState } from 'react';
import { positive } from './preferences';
import { unitModes, type UnitMode, type Step } from './types';

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

export function Instructions({ steps }: { steps: Step[] }) {
  return (
    <ol className="steps">
      {steps.map((step, index) => (
        <li key={index} className={step['@type'] === 'HowToSection' ? 'step-section' : ''}>
          {step['@type'] === 'HowToSection' ? (
            <>
              <h3>{step.name || 'Preparation'}</h3>
              {step.text && <p>{step.text}</p>}
              <Instructions steps={step.itemListElement || []} />
            </>
          ) : (
            <p>{(step.text || step.name)?.replace(/^\s*\d+(?:\.\d+)*[.)]\s+/, '')}</p>
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
