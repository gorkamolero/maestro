import { useState } from 'react';
import { useSnapshot } from 'valtio';
import { Terminal, Globe, FileText, AppWindow, Bot, Trash2, Settings, Save, CheckSquare, StickyNote, FolderOpen, Link, Smile, X, PictureInPicture2, Maximize2 } from 'lucide-react';
import type { Tab } from '@/stores/workspace.store';
import { workspaceActions } from '@/stores/workspace.store';
import { windowsActions } from '@/stores/windows.store';
import { EmojiPickerComponent } from '@/components/ui/emoji-picker';
import { agentStore } from '@/stores/agent.store';
import { launcherActions } from '@/stores/launcher.store';
import { cn } from '@/lib/utils';
import { launchTab } from '@/hooks/useTabClick';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { TerminalStatus } from './TerminalStatus';
import { AgentStatusBadge, TerminalPreview, AgentDrawer } from '@/components/Agent';
import { SaveContextModal } from './SaveContextModal';
import { getAppPreset } from '@/lib/app-presets';

interface TabPreviewProps {
  tab: Tab;
  onClick: () => void;
}

function TabTypeIcon({ type, className }: { type: Tab['type']; className?: string }) {
  const iconClass = cn('w-4 h-4', className);
  switch (type) {
    case 'terminal':
      return <Terminal className={iconClass} />;
    case 'browser':
      return <Globe className={iconClass} />;
    case 'app-launcher':
      return <AppWindow className={iconClass} />;
    case 'tasks':
      return <CheckSquare className={iconClass} />;
    case 'notes':
      return <StickyNote className={iconClass} />;
    case 'agent':
      return <Bot className={iconClass} />;
    default:
      return <FileText className={iconClass} />;
  }
}

const TAB_TYPE_LABELS: Record<Tab['type'], string> = {
  terminal: 'Terminal',
  browser: 'Browser',
  'app-launcher': 'App',
  tasks: 'Tasks',
  notes: 'Notes',
  agent: 'Agent',
};

// Shared button component for tab icons
function TabIconButton({
  tab,
  onClick,
  className,
}: {
  tab: Tab;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}) {
  const appIcon = tab.type === 'app-launcher' && tab.appLauncherConfig?.icon;
  const label = tab.type === 'app-launcher'
    ? tab.title.split(' ')[0]
    : TAB_TYPE_LABELS[tab.type];

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 p-1.5 rounded-lg w-[52px] h-[52px]',
        'bg-white/[0.04] hover:bg-white/[0.08] transition-colors',
        'text-muted-foreground hover:text-foreground',
        tab.disabled && 'opacity-40',
        className
      )}
    >
      <div className="relative w-7 h-7 rounded-md bg-white/[0.06] flex items-center justify-center">
        {/* Show emoji if set, otherwise show app icon or type icon */}
        {tab.emoji ? (
          <span className="text-base leading-none">{tab.emoji}</span>
        ) : appIcon ? (
          <img src={appIcon} alt={tab.title} className="w-5 h-5 rounded" />
        ) : (
          <TabTypeIcon type={tab.type} className="w-4 h-4" />
        )}
        {/* Status indicator for terminal tabs */}
        {tab.type === 'terminal' && (
          <div className="absolute -top-0.5 -right-0.5">
            <TerminalStatus tabId={tab.id} />
          </div>
        )}
        {/* Status indicator for agent tabs */}
        {tab.type === 'agent' && (
          <div className="absolute -top-0.5 -right-0.5">
            <AgentStatusBadge tabId={tab.id} />
          </div>
        )}
      </div>
      <span className="text-[10px] leading-tight truncate max-w-[48px]">
        {label}
      </span>
    </button>
  );
}

// Icon + label button view (for Control Room cards)
export function TabPreviewIcon({ tab, onClick }: TabPreviewProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const { sessions } = useSnapshot(agentStore);

  // Get agent session for hover preview
  const agentSession = tab.type === 'agent'
    ? sessions.find(s => s.tabId === tab.id)
    : null;

  // Check if app has context set
  const hasContext = tab.type === 'app-launcher' && (
    tab.appLauncherConfig?.launchConfig.filePath ||
    tab.appLauncherConfig?.launchConfig.deepLink
  );

  // Get context type for the app (for showing appropriate icon)
  const getContextIcon = () => {
    if (tab.type !== 'app-launcher' || !tab.appLauncherConfig?.connectedAppId) {
      return hasContext ? <FolderOpen className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />;
    }
    const connectedApp = launcherActions.getConnectedApp(tab.appLauncherConfig.connectedAppId);
    if (!connectedApp) {
      return hasContext ? <FolderOpen className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />;
    }
    const preset = getAppPreset(connectedApp);
    if (!hasContext) return <Save className="w-3.5 h-3.5" />;
    switch (preset.contextType) {
      case 'folder': return <FolderOpen className="w-3.5 h-3.5" />;
      case 'file': return <FileText className="w-3.5 h-3.5" />;
      case 'deeplink': return <Link className="w-3.5 h-3.5" />;
      case 'url': return <Globe className="w-3.5 h-3.5" />;
      default: return <Save className="w-3.5 h-3.5" />;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // For app-launcher tabs, launch the app directly
    if (tab.type === 'app-launcher') {
      launchTab(tab);
    } else if (tab.type !== 'agent') {
      // For non-agent tabs, open in a floating window
      // Agent tabs are handled by the AgentDrawer
      windowsActions.openWindow(tab.id, 'floating');
    }
  };

  const handleRemove = () => {
    workspaceActions.closeTab(tab.id);
  };

  const handleSaveContext = () => {
    setIsContextModalOpen(true);
  };

  const handleEdit = () => {
    // TODO: Implement edit functionality
    console.log('Edit tab:', tab.id);
  };

  const handleEmojiChange = (emoji: string) => {
    workspaceActions.setTabEmoji(tab.id, emoji);
    setIsEmojiPickerOpen(false);
  };

  const handleRemoveEmoji = () => {
    workspaceActions.setTabEmoji(tab.id, null);
  };

  const handleOpenInWindow = () => {
    windowsActions.openWindow(tab.id, 'floating');
  };

  const handleOpenMaximized = () => {
    windowsActions.openWindow(tab.id, 'maximized');
  };

  // Check if this tab type can be windowed
  const canBeWindowed = ['browser', 'terminal', 'agent', 'tasks', 'notes'].includes(tab.type);

  // For agent tabs, wrap with AgentDrawer
  // The AgentDrawer's FamilyDrawerTrigger handles opening the drawer on click.
  // TabIconButton's onClick only stops propagation to prevent parent handlers.
  if (tab.type === 'agent') {
    return (
      <div
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div>
              <AgentDrawer
                tabId={tab.id}
                spaceId={tab.spaceId}
                defaultWorkDir={tab.agentConfig?.workDir}
                onMaximize={onClick}
              >
                {/* onClick only prevents event bubbling; drawer opens via FamilyDrawerTrigger */}
                <TabIconButton tab={tab} onClick={(e) => e.stopPropagation()} />
              </AgentDrawer>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent onClick={(e) => e.stopPropagation()}>
            <ContextMenuItem className="text-xs" disabled>
              {tab.title}
            </ContextMenuItem>
            <ContextMenuSeparator />
            {canBeWindowed && (
              <>
                <ContextMenuItem onClick={handleOpenInWindow} className="gap-2">
                  <PictureInPicture2 className="w-3.5 h-3.5" />
                  Open in Window
                </ContextMenuItem>
                <ContextMenuItem onClick={handleOpenMaximized} className="gap-2">
                  <Maximize2 className="w-3.5 h-3.5" />
                  Open Maximized
                </ContextMenuItem>
                <ContextMenuSeparator />
              </>
            )}
            <ContextMenuItem onClick={() => setIsEmojiPickerOpen(true)} className="gap-2">
              <Smile className="w-3.5 h-3.5" />
              {tab.emoji ? 'Change Emoji' : 'Add Emoji'}
            </ContextMenuItem>
            {tab.emoji && (
              <ContextMenuItem onClick={handleRemoveEmoji} className="gap-2">
                <X className="w-3.5 h-3.5" />
                Remove Emoji
              </ContextMenuItem>
            )}
            <ContextMenuItem onClick={handleEdit} className="gap-2">
              <Settings className="w-3.5 h-3.5" />
              Edit
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={handleRemove} className="gap-2 text-destructive focus:text-destructive">
              <Trash2 className="w-3.5 h-3.5" />
              Remove
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {/* Emoji picker popover */}
        <EmojiPickerComponent
          value={tab.emoji}
          onChange={handleEmojiChange}
          open={isEmojiPickerOpen}
          onOpenChange={setIsEmojiPickerOpen}
        >
          <span />
        </EmojiPickerComponent>

        {/* Terminal preview on hover */}
        {agentSession && agentSession.terminalLines.length > 0 && (
          <div className="absolute top-full left-0 z-50 w-48">
            <TerminalPreview
              lines={agentSession.terminalLines}
              visible={isHovered}
            />
          </div>
        )}
      </div>
    );
  }

  // For all other tabs
  return (
    <>
      <div
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div className="relative">
              <TabIconButton tab={tab} onClick={handleClick} />
              {/* Context indicator dot */}
              {hasContext && (
                <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent onClick={(e) => e.stopPropagation()}>
            <ContextMenuItem className="text-xs" disabled>
              {tab.title}
            </ContextMenuItem>
            <ContextMenuSeparator />
            {canBeWindowed && (
              <>
                <ContextMenuItem onClick={handleOpenInWindow} className="gap-2">
                  <PictureInPicture2 className="w-3.5 h-3.5" />
                  Open in Window
                </ContextMenuItem>
                <ContextMenuItem onClick={handleOpenMaximized} className="gap-2">
                  <Maximize2 className="w-3.5 h-3.5" />
                  Open Maximized
                </ContextMenuItem>
                <ContextMenuSeparator />
              </>
            )}
            <ContextMenuItem onClick={() => setIsEmojiPickerOpen(true)} className="gap-2">
              <Smile className="w-3.5 h-3.5" />
              {tab.emoji ? 'Change Emoji' : 'Add Emoji'}
            </ContextMenuItem>
            {tab.emoji && (
              <ContextMenuItem onClick={handleRemoveEmoji} className="gap-2">
                <X className="w-3.5 h-3.5" />
                Remove Emoji
              </ContextMenuItem>
            )}
            {tab.type === 'app-launcher' && (
              <ContextMenuItem onClick={handleSaveContext} className="gap-2">
                {getContextIcon()}
                {hasContext ? 'Edit Context' : 'Set Context'}
              </ContextMenuItem>
            )}
            <ContextMenuItem onClick={handleEdit} className="gap-2">
              <Settings className="w-3.5 h-3.5" />
              Edit
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={handleRemove} className="gap-2 text-destructive focus:text-destructive">
              <Trash2 className="w-3.5 h-3.5" />
              Remove
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {/* Emoji picker popover */}
        <EmojiPickerComponent
          value={tab.emoji}
          onChange={handleEmojiChange}
          open={isEmojiPickerOpen}
          onOpenChange={setIsEmojiPickerOpen}
        >
          <span />
        </EmojiPickerComponent>
      </div>

      {/* Save Context Modal */}
      {tab.type === 'app-launcher' && (
        <SaveContextModal
          tab={tab}
          open={isContextModalOpen}
          onOpenChange={setIsContextModalOpen}
        />
      )}
    </>
  );
}

// Row view (for lists - kept for backwards compatibility)
export function TabPreview({ tab, onClick }: TabPreviewProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'flex items-center gap-2 w-full px-2 py-1.5 rounded text-left',
        'hover:bg-white/[0.06] transition-colors',
        'text-xs text-muted-foreground hover:text-foreground'
      )}
    >
      <TabTypeIcon type={tab.type} className="w-3 h-3" />
      <span className="flex-1 truncate">{tab.title}</span>
    </button>
  );
}

export { TabTypeIcon };
