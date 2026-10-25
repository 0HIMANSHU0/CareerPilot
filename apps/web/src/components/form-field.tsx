import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FormFieldProps extends React.ComponentProps<'input'> {
  label: string;
  error?: string;
  testId: string;
}

// Label + input + inline validation message; works with react-hook-form's register().
export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, testId, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    return (
      <div className="space-y-2">
        <Label htmlFor={inputId}>{label}</Label>
        <Input id={inputId} ref={ref} aria-invalid={!!error} data-testid={testId} {...props} />
        {error && (
          <p className="text-xs font-medium text-destructive" data-testid={`${testId}-error`}>
            {error}
          </p>
        )}
      </div>
    );
  },
);
FormField.displayName = 'FormField';
