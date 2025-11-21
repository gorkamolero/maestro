import { useSnapshot } from 'valtio';
import { workspaceStore, workspaceActions, type TabType } from '@/stores/workspace.store';
import { spacesStore } from '@/stores/spaces.store';
import { Terminal, Globe, FileText, Bot, Plus, X, Star, Edit2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'motion/react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import { Input } from '@/components/ui/input';
import { useEffect, useState, useRef } from 'react';

const TAB_ICONS: Record<TabType, any> = {
  terminal: Terminal,
  browser: Globe,
  note: FileText,
  agent: Bot,
};

const TAB_LABELS: Record<TabType, string> = {
  terminal: 'Terminal',
  browser: 'Browser',
  note: 'Notes',
  agent: 'Agent',
};

export function Sidebar() {
  const { tabs, activeTabId, activeSpaceId } = useSnapshot(workspaceStore);
  const { spaces } = useSnapshot(spacesStore);
  const [api, setApi] = useState<CarouselApi>();
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const currentSpaceIndex = spaces.findIndex((s) => s.id === activeSpaceId);

  useEffect(() => {
    if (!api || currentSpaceIndex === -1) return;
    api.scrollTo(currentSpaceIndex, false);
  }, [api, currentSpaceIndex]);

  useEffect(() => {
    if (!api) return;
    api.on('select', () => {
      const index = api.selectedScrollSnap();
      if (spaces[index] && spaces[index].id !== activeSpaceId) {
        workspaceActions.switchSpace(spaces[index].id);
      }
    });
  }, [api, spaces, activeSpaceId]);

  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingTabId]);

  const handleNewTab = (type: TabType) => {
    if (!activeSpaceId) return;
    const title = `New ${TAB_LABELS[type]}`;
    workspaceActions.openTab(activeSpaceId, type, title);
  };

  const startEditing = (tabId: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTabId(tabId);
    setEditValue(currentTitle);
  };

  const finishEditing = () => {
    if (editingTabId && editValue.trim()) {
      workspaceActions.renameTab(editingTabId, editValue.trim());
    }
    setEditingTabId(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      finishEditing();
    } else if (e.key === 'Escape') {
      setEditingTabId(null);
      setEditValue('');
    }
  };

  if (!activeSpaceId) {
    return (
      <div className="w-full h-full flex items-center justify-center p-4">
        <p className="text-xs text-muted-foreground text-center">
          Select a space below to get started
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Quick actions dock - Arc style */}
      <div className="p-3 flex items-center justify-center gap-2">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleNewTab('terminal')}
                className="w-10 h-10 rounded-lg bg-background/50 hover:bg-background flex items-center justify-center transition-colors shadow-sm"
              >
                <Terminal className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p className="text-xs">New Terminal</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleNewTab('browser')}
                className="w-10 h-10 rounded-lg bg-background/50 hover:bg-background flex items-center justify-center transition-colors shadow-sm"
              >
                <Globe className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p className="text-xs">New Browser</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleNewTab('note')}
                className="w-10 h-10 rounded-lg bg-background/50 hover:bg-background flex items-center justify-center transition-colors shadow-sm"
              >
                <FileText className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p className="text-xs">New Note</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Separator />

      {/* Entire content area is swipeable */}
      <Carousel setApi={setApi} className="flex-1" opts={{ watchDrag: true }}>
        <CarouselContent className="h-full ml-0">
          {spaces.map((space) => {
            const spaceTabs = tabs.filter((t) => t.spaceId === space.id);
            const favoriteTabs = spaceTabs.filter((t) => t.isFavorite);
            const regularTabs = spaceTabs.filter((t) => !t.isFavorite);

            return (
              <CarouselItem key={space.id} className="pl-0 h-full">
                <div className="h-full flex flex-col">
                  {/* Favorites section - Arc style */}
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Favorites
                      </h3>
                    </div>
                    <div className="space-y-1">
                      {favoriteTabs.length === 0 ? (
                        <p className="text-xs text-muted-foreground px-2 py-1">No favorites yet</p>
                      ) : (
                        <AnimatePresence mode="popLayout">
                          {favoriteTabs.map((tab) => {
                            const Icon = TAB_ICONS[tab.type];
                            const isActive = tab.id === activeTabId;
                            const isEditing = editingTabId === tab.id;

                            return (
                              <motion.div
                                key={tab.id}
                                layout
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                whileHover={{ x: 2 }}
                                transition={{ duration: 0.2 }}
                                className={cn(
                                  'group relative flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer',
                                  'hover:bg-background/80 transition-colors',
                                  isActive && 'bg-background border border-primary/50'
                                )}
                                onClick={() => !isEditing && workspaceActions.setActiveTab(tab.id)}
                              >
                                <Icon className="w-3.5 h-3.5 shrink-0 relative z-10" />
                                {isEditing ? (
                                  <Input
                                    ref={inputRef}
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    onBlur={finishEditing}
                                    className="flex-1 h-5 text-xs px-1 relative z-10"
                                  />
                                ) : (
                                  <span className="flex-1 text-xs truncate relative z-10">
                                    {tab.title}
                                  </span>
                                )}
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 relative z-10">
                                  <button
                                    onClick={(e) => startEditing(tab.id, tab.title, e)}
                                    className="p-0.5 hover:bg-muted rounded"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      workspaceActions.toggleTabFavorite(tab.id);
                                    }}
                                    className="p-0.5 hover:bg-muted rounded"
                                  >
                                    <Star className="w-3 h-3 fill-primary" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      workspaceActions.closeTab(tab.id);
                                    }}
                                    className="p-0.5 hover:bg-muted rounded"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Tabs section - Arc style */}
                  <div className="flex-1 px-2 py-2 overflow-y-auto">
                    <AnimatePresence mode="popLayout">
                      {regularTabs.map((tab) => {
                        const Icon = TAB_ICONS[tab.type];
                        const isActive = tab.id === activeTabId;
                        const isEditing = editingTabId === tab.id;

                        return (
                          <motion.div
                            key={tab.id}
                            layout
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            whileHover={{ x: 2 }}
                            transition={{ duration: 0.2 }}
                            className={cn(
                              'group relative flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer mb-1',
                              'hover:bg-background/80 transition-colors',
                              isActive && 'bg-background'
                            )}
                            onClick={() => !isEditing && workspaceActions.setActiveTab(tab.id)}
                          >
                            {isActive && (
                              <motion.div
                                layoutId="activeTab"
                                className="absolute inset-0 bg-primary/10 rounded-md border border-primary/50"
                                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                              />
                            )}
                            <Icon className="w-3.5 h-3.5 shrink-0 relative z-10" />
                            {isEditing ? (
                              <Input
                                ref={inputRef}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onBlur={finishEditing}
                                className="flex-1 h-5 text-xs px-1 relative z-10"
                              />
                            ) : (
                              <span className="flex-1 text-xs truncate relative z-10">
                                {tab.title}
                              </span>
                            )}
                            {tab.status === 'running' && !isEditing && (
                              <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 relative z-10"
                              />
                            )}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 relative z-10">
                              <button
                                onClick={(e) => startEditing(tab.id, tab.title, e)}
                                className="p-0.5 hover:bg-muted rounded"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  workspaceActions.toggleTabFavorite(tab.id);
                                }}
                                className="p-0.5 hover:bg-muted rounded"
                              >
                                <Star className={cn("w-3 h-3", tab.isFavorite && "fill-primary")} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  workspaceActions.closeTab(tab.id);
                                }}
                                className="p-0.5 hover:bg-muted rounded"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>
    </div>
  );
}
