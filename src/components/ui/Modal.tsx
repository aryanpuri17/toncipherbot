import React from 'react';
import { X } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

interface ModalProps {
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onClose?: () => void;
}

export const Modal: React.FC<ModalProps> = ({ title, children, size = 'md', onClose }) => {
  const { closeModal } = useAppStore();
  
  const handleClose = () => {
    if (onClose) onClose();
    closeModal();
  };

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />
      <div className={`relative w-full ${sizeClasses[size]} bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col animate-slide-up`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// Form Components
export const FormGroup: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`space-y-1.5 ${className}`}>{children}</div>
);

export const FormLabel: React.FC<{ children: React.ReactNode; required?: boolean }> = ({ children, required }) => (
  <label className="block text-xs font-medium text-slate-400">
    {children} {required && <span className="text-red-400">*</span>}
  </label>
);

export const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className={`w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-colors ${props.className || ''}`}
  />
);

export const FormTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = (props) => (
  <textarea
    {...props}
    className={`w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-colors resize-none ${props.className || ''}`}
  />
);

export const FormSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }> = ({ children, ...props }) => (
  <select
    {...props}
    className={`w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors appearance-none ${props.className || ''}`}
  >
    {children}
  </select>
);

export const FormRow: React.FC<{ children: React.ReactNode; cols?: 2 | 3 | 4 }> = ({ children, cols = 2 }) => {
  const colsClass = cols === 2 ? 'sm:grid-cols-2' : cols === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-4';
  return <div className={`grid grid-cols-1 ${colsClass} gap-4`}>{children}</div>;
};

export const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-4">
    <h3 className="text-sm font-semibold text-white border-b border-white/5 pb-2">{title}</h3>
    {children}
  </div>
);

export const FormActions: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5 mt-6">{children}</div>
);

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'success' }> = ({ 
  children, variant = 'primary', className = '', ...props 
}) => {
  const variants = {
    primary: 'btn-primary',
    secondary: 'bg-white/5 hover:bg-white/10 border border-white/10',
    danger: 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400',
    success: 'btn-success',
  };
  return (
    <button {...props} className={`px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};
