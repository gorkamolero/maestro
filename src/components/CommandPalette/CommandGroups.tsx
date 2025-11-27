import { Command } from 'cmdk';
import {
  Terminal,
  Globe,
  FileText,
  Layout,
  Plus,
  Rocket,
  ArrowRight,
  Copy,
  History,
  CheckSquare,
  Play,
  User,
  UserPlus,
} from 'lucide-react';
import type { Tab, Space } from '@/stores/workspace.store';
import type { Profile } from '@/stores/profile.store';
import type { ConnectedApp } from '@/stores/launcher.store';
import type { InstalledApp } from './useCommandPaletteActions';

// ============================================================================
// Keyboard Shortcut Display
// ============================================================================

export function CommandShortcut({ children }: { children: string }) {
  return (
    <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
      {children}
    </kbd>
  );
}

// ============================================================================
// Tab Icon Helper
// ============================================================================

function TabIcon({ type }: { type: Tab['type'] }) {
  switch (type) {
    case 'terminal':
      return <Terminal className="w-4 h-4" />;
    case 'browser':
      return <Globe className="w-4 h-4" />;
    case 'note':
      return <FileText className="w-4 h-4" />;
    case 'tasks':
      return <CheckSquare className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
}

// ============================================================================
// URL History Group
// ============================================================================

interface UrlHistoryGroupProps {
  urls: Array<{ url: string; title?: string }>;
  onSelect: (url: string) => void;
}

export function UrlHistoryGroup({ urls, onSelect }: UrlHistoryGroupProps) {
  if (urls.length === 0) return null;

  return (
    <Command.Group heading="Recent URLs" className="mb-2">
      {urls.map((urlEntry) => (
        <Command.Item
          key={urlEntry.url}
          onSelect={() => onSelect(urlEntry.url)}
          className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer aria-selected:bg-accent"
        >
          <Globe className="w-4 h-4" />
          <div className="flex-1 flex flex-col gap-0.5">
            <span className="text-sm">{urlEntry.title || urlEntry.url}</span>
            {urlEntry.title && (
              <span className="text-xs text-muted-foreground truncate">{urlEntry.url}</span>
            )}
          </div>
          <ArrowRight className="w-3 h-3 text-muted-foreground" />
        </Command.Item>
      ))}
    </Command.Group>
  );
}

// ============================================================================
// Tabs Group
// ============================================================================

interface TabsGroupProps {
  tabs: Tab[];
  onSelect: (tabId: string) => void;
}

export function TabsGroup({ tabs, onSelect }: TabsGroupProps) {
  if (tabs.length === 0) return null;

  return (
    <Command.Group heading="Tabs" className="mb-2">
      {tabs.map((tab) => (
        <Command.Item
          key={tab.id}
          onSelect={() => onSelect(tab.id)}
          className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer aria-selected:bg-accent"
        >
          <TabIcon type={tab.type} />
          <span className="flex-1">{tab.title}</span>
          <ArrowRight className="w-3 h-3 text-muted-foreground" />
        </Command.Item>
      ))}
    </Command.Group>
  );
}

// ============================================================================
// Spaces Group
// ============================================================================

interface SpacesGroupProps {
  spaces: Space[];
  onSelect: (spaceId: string) => void;
}

export function SpacesGroup({ spaces, onSelect }: SpacesGroupProps) {
  if (spaces.length === 0) return null;

  return (
    <Command.Group heading="Spaces" className="mb-2">
      {spaces.map((space) => (
        <Command.Item
          key={space.id}
          onSelect={() => onSelect(space.id)}
          className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer aria-selected:bg-accent"
        >
          <Layout className="w-4 h-4" />
          <span className="flex-1">{space.name}</span>
          <ArrowRight className="w-3 h-3 text-muted-foreground" />
        </Command.Item>
      ))}
    </Command.Group>
  );
}

// ============================================================================
// Connected Apps Group
// ============================================================================

interface ConnectedAppsGroupProps {
  apps: ConnectedApp[];
  onSelect: (appId: string) => void;
}

export function ConnectedAppsGroup({ apps, onSelect }: ConnectedAppsGroupProps) {
  if (apps.length === 0) return null;

  return (
    <Command.Group heading="Connected Apps" className="mb-2">
      {apps.map((app) => (
        <Command.Item
          key={app.id}
          onSelect={() => onSelect(app.id)}
          className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer aria-selected:bg-accent"
        >
          {app.icon ? (
            <img src={app.icon} alt={app.name} className="w-4 h-4" />
          ) : (
            <Rocket className="w-4 h-4" />
          )}
          <span className="flex-1">{app.name}</span>
          <span className="text-xs text-muted-foreground">Launch</span>
        </Command.Item>
      ))}
    </Command.Group>
  );
}

// ============================================================================
// Installed Apps Group
// ============================================================================

interface InstalledAppsGroupProps {
  apps: InstalledApp[];
  onSelect: (app: InstalledApp) => void;
}

export function InstalledAppsGroup({ apps, onSelect }: InstalledAppsGroupProps) {
  if (apps.length === 0) return null;

  return (
    <Command.Group heading="Add App as Tab" className="mb-2">
      {apps.map((app) => (
        <Command.Item
          key={app.path}
          onSelect={() => onSelect(app)}
          className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer aria-selected:bg-accent"
        >
          <Rocket className="w-4 h-4" />
          <span className="flex-1">{app.name}</span>
          <Plus className="w-3 h-3 text-muted-foreground" />
        </Command.Item>
      ))}
    </Command.Group>
  );
}

// ============================================================================
// Create Group
// ============================================================================

interface CreateGroupProps {
  onNewTerminal: () => void;
  onNewBrowser: () => void;
  onNewNote: () => void;
  onNewSpace: () => void;
}

export function CreateGroup({
  onNewTerminal,
  onNewBrowser,
  onNewNote,
  onNewSpace,
}: CreateGroupProps) {
  return (
    <Command.Group heading="Create" className="mb-2">
      <Command.Item
        onSelect={onNewTerminal}
        className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer aria-selected:bg-accent"
      >
        <Terminal className="w-4 h-4" />
        <span className="flex-1">New Terminal</span>
        <CommandShortcut>T</CommandShortcut>
      </Command.Item>

      <Command.Item
        onSelect={onNewBrowser}
        className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer aria-selected:bg-accent"
      >
        <Globe className="w-4 h-4" />
        <span className="flex-1">New Browser</span>
        <CommandShortcut>B</CommandShortcut>
      </Command.Item>

      <Command.Item
        onSelect={onNewNote}
        className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer aria-selected:bg-accent"
      >
        <FileText className="w-4 h-4" />
        <span className="flex-1">New Note</span>
        <CommandShortcut>N</CommandShortcut>
      </Command.Item>

      <Command.Item
        onSelect={onNewSpace}
        className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer aria-selected:bg-accent"
      >
        <Layout className="w-4 h-4" />
        <span className="flex-1">New Space</span>
        <CommandShortcut>S</CommandShortcut>
      </Command.Item>
    </Command.Group>
  );
}

// ============================================================================
// Profiles Group
// ============================================================================

interface ProfilesGroupProps {
  profiles: Profile[];
  activeSpaceId: string | null;
  onCreateProfile: () => void;
  onAssignProfile: (profileId: string) => void;
}

export function ProfilesGroup({
  profiles,
  activeSpaceId,
  onCreateProfile,
  onAssignProfile,
}: ProfilesGroupProps) {
  return (
    <Command.Group heading="Profiles" className="mb-2">
      <Command.Item
        onSelect={onCreateProfile}
        className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer aria-selected:bg-accent"
      >
        <UserPlus className="w-4 h-4" />
        <span className="flex-1">New Profile</span>
        <CommandShortcut>P</CommandShortcut>
      </Command.Item>

      {activeSpaceId && (
        <>
          <Command.Item
            onSelect={() => onAssignProfile('none')}
            className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer aria-selected:bg-accent"
          >
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="flex-1">Remove Profile from Space</span>
          </Command.Item>
          {profiles.map((profile) => (
            <Command.Item
              key={profile.id}
              onSelect={() => onAssignProfile(profile.id)}
              className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer aria-selected:bg-accent"
            >
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white font-medium"
                style={{ backgroundColor: profile.color }}
              >
                {profile.name[0].toUpperCase()}
              </div>
              <span className="flex-1">Assign "{profile.name}" to Space</span>
            </Command.Item>
          ))}
        </>
      )}
    </Command.Group>
  );
}

// ============================================================================
// Launch Group
// ============================================================================

interface LaunchGroupProps {
  connectedApps: ConnectedApp[];
  onLaunchAll: () => void;
  onAddAppFavorite: () => void;
  onLaunchApp: (appId: string) => void;
}

export function LaunchGroup({
  connectedApps,
  onLaunchAll,
  onAddAppFavorite,
  onLaunchApp,
}: LaunchGroupProps) {
  return (
    <Command.Group heading="Launch" className="mb-2">
      <Command.Item
        onSelect={onLaunchAll}
        className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer aria-selected:bg-accent"
      >
        <Play className="w-4 h-4" />
        <span className="flex-1">Launch All Tabs</span>
        <CommandShortcut>L</CommandShortcut>
      </Command.Item>

      <Command.Item
        onSelect={onAddAppFavorite}
        className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer aria-selected:bg-accent"
      >
        <Plus className="w-4 h-4" />
        <span className="flex-1">Connect New App...</span>
      </Command.Item>

      {connectedApps.slice(0, 5).map((app) => (
        <Command.Item
          key={app.id}
          onSelect={() => onLaunchApp(app.id)}
          className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer aria-selected:bg-accent"
        >
          {app.icon ? (
            <img src={app.icon} alt={app.name} className="w-4 h-4" />
          ) : (
            <Rocket className="w-4 h-4" />
          )}
          <span className="flex-1">Launch {app.name}</span>
        </Command.Item>
      ))}
    </Command.Group>
  );
}

// ============================================================================
// Navigate Group
// ============================================================================

interface NavigateGroupProps {
  onGoToUrl: () => void;
}

export function NavigateGroup({ onGoToUrl }: NavigateGroupProps) {
  return (
    <Command.Group heading="Navigate" className="mb-2">
      <Command.Item
        onSelect={onGoToUrl}
        className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer aria-selected:bg-accent"
      >
        <ArrowRight className="w-4 h-4" />
        <span className="flex-1">Go to URL</span>
        <CommandShortcut>G</CommandShortcut>
      </Command.Item>
    </Command.Group>
  );
}

// ============================================================================
// Current Tab Group
// ============================================================================

interface CurrentTabGroupProps {
  onDuplicateTab: () => void;
}

export function CurrentTabGroup({ onDuplicateTab }: CurrentTabGroupProps) {
  return (
    <Command.Group heading="Current Tab" className="mb-2">
      <Command.Item
        onSelect={onDuplicateTab}
        className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer aria-selected:bg-accent"
      >
        <Copy className="w-4 h-4" />
        <span className="flex-1">Duplicate Tab</span>
        <CommandShortcut>D</CommandShortcut>
      </Command.Item>
    </Command.Group>
  );
}

// ============================================================================
// Recently Closed Group
// ============================================================================

interface RecentlyClosedGroupProps {
  tabs: Tab[];
  onRestore: (index: number) => void;
}

export function RecentlyClosedGroup({ tabs, onRestore }: RecentlyClosedGroupProps) {
  if (tabs.length === 0) return null;

  return (
    <Command.Group heading="Recently Closed" className="mb-2">
      {tabs.map((closedTab, index) => (
        <Command.Item
          key={`${closedTab.id}-${index}`}
          onSelect={() => onRestore(index)}
          className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer aria-selected:bg-accent"
        >
          <TabIcon type={closedTab.type} />
          <span className="flex-1">{closedTab.title}</span>
          <History className="w-3 h-3 text-muted-foreground" />
        </Command.Item>
      ))}
    </Command.Group>
  );
}
