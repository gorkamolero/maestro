import { useWorkspaceStore, workspaceActions, type TabsViewMode } from '@/stores/workspace.store';
import { LayoutGrid, List } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';

export function TabsViewModeSelector() {
  const { tabsViewMode } = useWorkspaceStore();

  const handleChange = (mode: TabsViewMode) => {
    workspaceActions.setTabsViewMode(mode);
  };

  return (
    <Tooltip>
      <Select value={tabsViewMode} onValueChange={handleChange}>
        <TooltipTrigger asChild>
          <SelectTrigger className="w-10 h-10 p-0 border-none bg-background/50 hover:bg-background shadow-sm">
            <div className="w-full h-full flex items-center justify-center">
              {tabsViewMode === 'grid' ? (
                <LayoutGrid className="w-4 h-4" />
              ) : (
                <List className="w-4 h-4" />
              )}
            </div>
          </SelectTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">{tabsViewMode === 'grid' ? 'Grid View' : 'List View'}</p>
        </TooltipContent>
        <SelectContent>
          <SelectItem value="grid">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-3 h-3" />
              <span>Grid View</span>
            </div>
          </SelectItem>
          <SelectItem value="list">
            <div className="flex items-center gap-2">
              <List className="w-3 h-3" />
              <span>List View</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </Tooltip>
  );
}
