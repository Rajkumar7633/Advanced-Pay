import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface FormFieldProps {
  label?: string;
  error?: string;
  required?: boolean;
  helperText?: string;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  label,
  error,
  required,
  helperText,
  className = '',
  children,
}: FormFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label className="text-foreground">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
      {helperText && <p className="text-sm text-muted-foreground">{helperText}</p>}
    </div>
  );
}

interface TextInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  required?: boolean;
  helperText?: string;
}

export function TextInput({
  label,
  error,
  required,
  helperText,
  className,
  ...props
}: TextInputProps) {
  return (
    <FormField
      label={label}
      error={error}
      required={required}
      helperText={helperText}
      className={className}
    >
      <Input
        {...props}
        className={error ? 'border-destructive' : ''}
      />
    </FormField>
  );
}

interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  required?: boolean;
  helperText?: string;
}

export function TextAreaField({
  label,
  error,
  required,
  helperText,
  className,
  ...props
}: TextAreaProps) {
  return (
    <FormField
      label={label}
      error={error}
      required={required}
      helperText={helperText}
      className={className}
    >
      <Textarea
        {...props}
        className={error ? 'border-destructive' : ''}
      />
    </FormField>
  );
}
