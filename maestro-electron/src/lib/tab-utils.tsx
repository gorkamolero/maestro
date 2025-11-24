import type { Tab } from '@/stores/workspace.store';

export function getTabIcon(tab: Tab, size: 'sm' | 'md' | 'lg' = 'md') {
  const sizeClass = size === 'sm' ? 'text-base' : size === 'md' ? 'text-lg' : 'text-xl';
  const imgSize = size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-6 h-6' : 'w-8 h-8';

  switch (tab.type) {
    case 'terminal':
      return <span className={sizeClass}>{'>'}</span>;
    case 'browser':
      return <span className={sizeClass}>🌐</span>;
    case 'note':
      return <span className={sizeClass}>📝</span>;
    case 'tasks':
      return <span className={sizeClass}>✓</span>;
    case 'app-launcher':
      if (tab.appLauncherConfig?.icon) {
        return (
          <img
            src={tab.appLauncherConfig.icon}
            alt={tab.title}
            className={`${imgSize} rounded`}
          />
        );
      }
      return <span className={sizeClass}>🚀</span>;
    default:
      return <span className={sizeClass}>📄</span>;
  }
}
