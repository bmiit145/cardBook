import React from 'react';

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'blue',
  onClick,
}) {
  const variantClass = `stat-icon-${variant}`;

  return (
    <div
      className="card stat-card"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="stat-content">
        <span className="stat-label">{title}</span>
        <span className="stat-value">{value ?? '—'}</span>
        {subtitle && <span className="stat-subtitle">{subtitle}</span>}
      </div>

      {Icon && (
        <div className={`stat-icon-wrapper ${variantClass}`}>
          <Icon size={24} />
        </div>
      )}
    </div>
  );
}

