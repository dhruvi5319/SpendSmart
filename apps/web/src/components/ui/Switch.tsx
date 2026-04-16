'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label?: string;
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, label, id, checked, onCheckedChange, ...props }, ref) => {
    const switchId = id || props.name;

    return (
      <label
        htmlFor={switchId}
        className={cn('inline-flex cursor-pointer items-center gap-3', className)}
      >
        <div className="relative">
          <input
            type="checkbox"
            id={switchId}
            className="peer sr-only"
            ref={ref}
            checked={checked}
            onChange={(e) => onCheckedChange?.(e.target.checked)}
            {...props}
          />
          <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-all peer-checked:bg-primary-600 peer-checked:after:translate-x-full peer-focus:ring-2 peer-focus:ring-primary-500/20" />
        </div>
        {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
      </label>
    );
  }
);
Switch.displayName = 'Switch';

export { Switch };
