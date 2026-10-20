import Icon from '../Icon';

export default function EmptyState({ icon = 'receipt_long', title, description, action }) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon">
        <Icon name={icon} className="text-2xl" />
      </span>
      <h2 className="text-lg font-bold text-primary">{title}</h2>
      {description && <p className="text-sm text-secondary max-w-sm leading-relaxed">{description}</p>}
      {action}
    </div>
  );
}
