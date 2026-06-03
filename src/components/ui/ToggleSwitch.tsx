import React from 'react';

interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  size?: 'sm' | 'md';
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ enabled, onChange, label, size = 'md' }) => {
  const w = size === 'sm' ? 'w-9 h-5' : 'w-11 h-6';
  const dot = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const translate = size === 'sm' ? 'translate-x-4' : 'translate-x-5';

  return (
    <label className="flex items-center gap-2.5 cursor-pointer">
      <div
        className={`${w} rounded-full transition-colors duration-200 relative ${enabled ? 'bg-blue-500' : 'bg-slate-600'}`}
        onClick={() => onChange(!enabled)}
      >
        <div className={`${dot} rounded-full bg-white absolute top-1/2 -translate-y-1/2 left-1 transition-transform duration-200 ${enabled ? translate : 'translate-x-0'}`} />
      </div>
      {label && <span className="text-sm text-slate-300">{label}</span>}
    </label>
  );
};
