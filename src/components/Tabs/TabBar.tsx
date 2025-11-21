import { useSnapshot } from 'valtio';
import { tabsStore, tabsActions } from '@/stores/tabs.store';
import { Tab } from './Tab';

export function TabBar() {
  const { tabs } = useSnapshot(tabsStore);

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="h-10 bg-card border-b border-border flex items-center overflow-x-auto">
      {tabs.map((tab) => (
        <Tab key={tab.id} tab={tab} />
      ))}
    </div>
  );
}
