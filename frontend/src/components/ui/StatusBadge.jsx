const TONES = {
  neutral: 'status-badge-neutral',
  success: 'status-badge-success',
  warning: 'status-badge-warning',
  danger: 'status-badge-danger',
  brand: 'status-badge-brand',
};

export default function StatusBadge({ tone = 'neutral', children, className = '' }) {
  return (
    <span className={`status-badge ${TONES[tone] || TONES.neutral} ${className}`.trim()}>
      {children}
    </span>
  );
}
