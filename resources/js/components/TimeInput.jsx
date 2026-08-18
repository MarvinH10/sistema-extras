import React from 'react';

export default function TimeInput({ value, onChange, placeholder = "--:--", disabled = false, className = "" }) {
  const handleChange = (e) => {
    let raw = e.target.value.replace(/[^0-9:]/g, '');

    // Si escribe 4 digitos seguidos ej "1300" -> "13:00" o "0850" -> "08:50"
    if (raw.length === 4 && !raw.includes(':')) {
      const hh = raw.substring(0, 2);
      const mm = raw.substring(2, 4);
      raw = `${hh}:${mm}`;
    } else if (raw.length === 3 && !raw.includes(':')) {
      // Si escribe 3 dígitos ej "850" -> "08:50"
      const hh = raw.substring(0, 1).padStart(2, '0');
      const mm = raw.substring(1, 3);
      raw = `${hh}:${mm}`;
    }

    if (raw.length > 5) {
      raw = raw.substring(0, 5);
    }

    onChange(raw);
  };

  const handleBlur = (e) => {
    let val = e.target.value.trim();
    if (!val) return;

    // Normalizar formato ej "8:50" -> "08:50"
    const match = val.match(/^(\d{1,2}):(\d{1,2})$/);
    if (match) {
      const hh = match[1].padStart(2, '0');
      const mm = match[2].padStart(2, '0');
      onChange(`${hh}:${mm}`);
    }
  };

  return (
    <input
      type="text"
      value={value || ''}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={5}
      className={`font-mono text-center px-2 py-1.5 rounded-lg border text-sm transition-all outline-none ${
        disabled
          ? 'bg-slate-900/50 border-slate-800 text-slate-500 cursor-not-allowed'
          : 'bg-slate-900 border-slate-700 text-white hover:border-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
      } ${className}`}
    />
  );
}
