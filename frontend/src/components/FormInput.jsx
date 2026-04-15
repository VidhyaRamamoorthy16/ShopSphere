import React from 'react';

const FormInput = ({
  label,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  required = false,
  icon: Icon,
  textarea = false,
  rows = 4
}) => {
  const inputStyle = {
    backgroundColor: 'var(--input-bg)',
    borderColor: 'var(--input-border)',
    color: 'var(--text-primary)',
  };

  const baseClasses = `block w-full rounded-xl focus:ring-2 focus:ring-indigo-500 transition-colors outline-none border input-themed`;
  const paddingClasses = Icon ? "pl-11 pr-4 py-3" : "px-4 py-3";

  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={name} className="block text-sm font-medium mb-1 ml-1" style={{ color: 'var(--text-secondary)' }}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Icon className="h-5 w-5" style={{ color: 'var(--text-faint)' }} />
          </div>
        )}

        {textarea ? (
          <textarea
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            required={required}
            rows={rows}
            placeholder={placeholder}
            className={`${baseClasses} ${paddingClasses} pt-3`}
          ></textarea>
        ) : (
          <input
            id={name}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            required={required}
            placeholder={placeholder}
            className={`${baseClasses} ${paddingClasses}`}
          />
        )}
      </div>
    </div>
  );
};

export default FormInput;
