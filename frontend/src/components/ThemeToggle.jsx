import useBillStore from '../store/useBillStore';
import Icon from './Icon';

export default function ThemeToggle() {
  const darkMode = useBillStore(s => s.settings.darkMode);
  const updateSettings = useBillStore(s => s.updateSettings);
  const isDark = darkMode ?? window.matchMedia('(prefers-color-scheme: dark)').matches;
  return (
    <button type="button" className="icon-button" aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      onClick={() => updateSettings({ darkMode: !isDark })}>
      <Icon name={isDark ? 'light_mode' : 'dark_mode'} className="text-xl" />
    </button>
  );
}
