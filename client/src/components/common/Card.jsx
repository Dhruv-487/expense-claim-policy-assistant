import React from 'react';

export const Card = ({ children, className = '', hoverEffect = false, ...props }) => {
  return (
    <div
      className={`bg-slate-900/70 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl transition-all duration-200 ${
        hoverEffect ? 'hover:border-slate-700 hover:shadow-indigo-500/5 hover:-translate-y-0.5' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ title, subtitle, action, className = '' }) => {
  return (
    <div className={`p-6 border-b border-slate-800/80 flex items-center justify-between ${className}`}>
      <div>
        <h3 className="text-lg font-semibold text-slate-100 tracking-tight">{title}</h3>
        {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

export const CardBody = ({ children, className = '' }) => {
  return <div className={`p-6 ${className}`}>{children}</div>;
};

export default Card;
