import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSnapshot } from 'valtio';
import { Command } from 'cmdk';
import {
  Terminal,
  Globe,
  FileText,
  Layout,
  Plus,
  Rocket,
  ArrowRight,
  Search,
  Copy,
  History,
  CheckSquare,
  Play,
  User,
  UserPlus,
} from 'lucide-react';
import { useWorkspaceStore, workspaceActions } from '@/stores/workspace.store';
import { useSpacesStore, spacesActions } from '@/stores/spaces.store';
import { useProfileStore, profileActions } from '@/stores/profile.store';
import { launcherStore, launcherActions } from '@/stores/launcher.store';
import { getBrowserState } from '@/stores/browser.store';
import { urlHistoryActions } from '@/stores/url-history.store';
import { launchTab } from '@/hooks/useTabClick';
import { handleError } from '@/lib/error-utils';

// Keyboard shortcut display component
function CommandShortcut({ children }: { children: string }) {
  return (
    <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
      {children}
    </kbd>
  );
}

interface CommandPaletteProps {
  onClose: () => void;
  isExiting?: boolean;
}

interface InstalledApp {
  name: string;
  path: string;
  bundleId: string | null;
  icon: string | null;
}

export function CommandPalette({ onClose, isExiting = false }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const { activeSpaceId, tabs, recentlyClosedTabs, activeTabId } = useWorkspaceStore();
  const { spaces } = useSpacesStore();
  const { profiles } = useProfileStore();
  const { connectedApps } = useSnapshot(launcherStore);

  // Load installed apps on mount
  useEffect(() => {
    launcherActions
      .getInstalledApps()
      .then(setInstalledApps)
      .catch(handleError({ prefix: '[CommandPalette]' }));
  }, []);

  // Get current active tab from workspace store
  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Create handlers
  const handleNewTerminal = useCallback(() => {
    if (!activeSpaceId) return;
    workspaceActions.openTab(activeSpaceId, 'terminal', 'Terminal');
    onClose();
  }, [activeSpaceId, onClose]);

  const handleNewBrowser = useCallback(() => {
    if (!activeSpaceId) return;
    workspaceActions.openTab(activeSpaceId, 'browser', 'Browser');
    onClose();
  }, [activeSpaceId, onClose]);

  const handleNewNote = useCallback(() => {
    if (!activeSpaceId) return;
    workspaceActions.openTab(activeSpaceId, 'note', 'Note');
    onClose();
  }, [activeSpaceId, onClose]);

  const handleNewSpace = useCallback(() => {
    const name = `Space ${spaces.length + 1}`;
    spacesActions.addSpace(name);
    onClose();
  }, [spaces.length, onClose]);

  const handleAddAppFavorite = useCallback(() => {
    launcherStore.isAddModalOpen = true;
    onClose();
  }, [onClose]);

  const handleLaunchApp = useCallback(
    (appId: string) => {
      launcherActions.launchApp(appId, {
        filePath: null,
        deepLink: null,
        launchMethod: 'app-only',
      });
      onClose();
    },
    [onClose]
  );

  const handleAddInstalledAppTab = useCallback(
    async (app: InstalledApp) => {
      if (!activeSpaceId) return;
      // Register the app first to get full info including icon
      try {
        const registeredApp = await launcherActions.registerApp(app.path);
        workspaceActions.openTab(activeSpaceId, 'app-launcher', registeredApp.name, {
          appLauncherConfig: {
            connectedAppId: registeredApp.id,
            icon: registeredApp.icon,
            color: null,
            launchConfig: {
              filePath: null,
              deepLink: null,
              launchMethod: 'app-only',
            },
            savedState: null,
          },
        });
      } catch (error) {
        console.error('Failed to register app:', error);
      }
      onClose();
    },
    [activeSpaceId, onClose]
  );

  const handleGoToUrl = useCallback(
    (url?: string) => {
      const spaceId = activeSpaceId || spaces[0]?.id;
      if (!spaceId) return;

      // If URL is provided, create a browser tab and navigate to it
      if (url) {
        const newTab = workspaceActions.openTab(spaceId, 'browser', url);
        // Initialize browser state with the URL
        getBrowserState(newTab.id, url);
        // Add to URL history
        urlHistoryActions.addUrl(url);
      } else {
        // Just create a browser tab if no URL provided
        if (!activeTab || activeTab.type !== 'browser') {
          workspaceActions.openTab(spaceId, 'browser', 'Browser');
        }
      }
      onClose();
    },
    [activeSpaceId, activeTab, spaces, onClose]
  );

  const handleDuplicateTab = useCallback(() => {
    if (!activeTab || !activeSpaceId) return;

    // Clone tab with same type and properties
    const newTitle = `${activeTab.title} (Copy)`;
    workspaceActions.openTab(activeSpaceId, activeTab.type, newTitle);

    onClose();
  }, [activeTab, activeSpaceId, onClose]);

  const handleRestoreClosedTab = useCallback(
    (index: number) => {
      workspaceActions.restoreRecentlyClosedTab(index);
      onClose();
    },
    [onClose]
  );

  const handleLaunchAllTabs = useCallback(() => {
    if (!activeSpaceId) return;
    // Get all enabled tabs for the active space and launch them
    const spaceTabs = tabs.filter((t) => t.spaceId === activeSpaceId && !t.disabled);
    spaceTabs.forEach((tab) => {
      launchTab(tab.id);
    });
    onClose();
  }, [activeSpaceId, tabs, onClose]);

  const handleCreateProfile = useCallback(() => {
    const name = `Profile ${profiles.length + 1}`;
    const profile = profileActions.createProfile(name);
    // Automatically switch to the new profile
    profileActions.switchProfile(profile.id);
    onClose();
  }, [profiles.length, onClose]);

  const handleAssignProfileToSpace = useCallback(
    (profileId: string) => {
      if (!activeSpaceId) return;
      spacesActions.setSpaceProfile(activeSpaceId, profileId === 'none' ? undefined : profileId);
      onClose();
    },
    [activeSpaceId, onClose]
  );

  // Memoize search results to avoid recomputing on every render
  const searchResults = useMemo(() => {
    const lowerSearch = search.toLowerCase();

    // Filter apps based on search
    const filteredApps = connectedApps.filter((app) =>
      app.name.toLowerCase().includes(lowerSearch)
    );

    // Get URL history suggestions
    const urlSuggestions = urlHistoryActions.searchHistory(search);

    // Filter installed apps based on search
    const filteredInstalledApps = installedApps.filter((app) =>
      app.name.toLowerCase().includes(lowerSearch)
    );

    return {
      tabs: tabs.filter((t) => t.title.toLowerCase().includes(lowerSearch)),
      spaces: spaces.filter((s) => s.name.toLowerCase().includes(lowerSearch)),
      apps: filteredApps,
      installedApps: filteredInstalledApps.slice(0, 10), // Limit to 10 results
      urls: urlSuggestions,
    };
  }, [search, connectedApps, installedApps, tabs, spaces]);

  const hasSearchResults = useMemo(
    () =>
      search.length > 0 &&
      (searchResults.tabs.length > 0 ||
        searchResults.spaces.length > 0 ||
        searchResults.apps.length > 0 ||
        searchResults.installedApps.length > 0 ||
        searchResults.urls.length > 0),
    [search, searchResults]
  );

  // Normalize URL - add protocol if missing
  const normalizeUrl = (input: string): string => {
    const trimmed = input.trim();
    if (!trimmed) return '';

    // Check if it already has a protocol
    if (trimmed.match(/^https?:\/\//i)) {
      return trimmed;
    }

    // Add https:// by default
    return `https://${trimmed}`;
  };

  return (
    <Command
      className={`w-full h-full bg-background rounded-lg shadow-2xl overflow-hidden flex flex-col transition-all duration-200 ${
        isExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      }`}
      loop
      onKeyDown={(e) => {
        // Handle Enter key when there's search text but no results
        if (e.key === 'Enter' && search.length > 0 && !hasSearchResults) {
          e.preventDefault();
          handleGoToUrl(normalizeUrl(search));
        }
      }}
    >
      <div className="flex items-center border-b border-border px-3">
        <Search className="w-4 h-4 text-muted-foreground mr-2" />
        <Command.Input
          value={search}
          onValueChange={setSearch}
          placeholder="Type a command or search..."
          className="flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
          autoFocus
        />
      </div>

      <Command.List className="flex-1 overflow-y-auto p-2">
        {/* Show "Go to URL" when there's search text but no results */}
        {search.length > 0 && !hasSearchResults ? (
          <Command.Item
            onSelect={() => handleGoToUrl(normalizeUrl(search))}
            className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer aria-selected:bg-accent"
          >
            <Globe className="w-4 h-4" />
            <span className="flex-1">Go to {normalizeUrl(search)}</span>
            <ArrowRight className="w-3 h-3 text-muted-foreground" />
          </Command.Item>
        ) : (
          <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
            Type to search or enter a URL...
          </Command.Empty>
        )}

        {/* Search Everything - show when there's a search query */}
        {hasSearchResults && (
          <>
            {/* URL History Suggestions - show first */}
            {searchResults.urls.length > 0 && (
              <Command.Group heading="Recent URLs" className="mb-2">
                {searchResults.urls.map((urlEntry) => (
                  <Command.Item
                    key={urlEntry.url}
                    onSelect={() => handleGoToUrl(urlEntry.url)}
                    className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer aria-selected:bg-accent"
                  >
                    <Globe className="w-4 h-4" />
                    <div className="flex-1 flex flex-col gap-0.5">
                      <span className="text-sm">{urlEntry.title || urlEntry.url}</span>
                      {urlEntry.title && (
                        <span className="text-xs text-muted-foreground truncate">
                          {urlEntry.url}
                        </span>
                      )}
                    </div>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {searchResults.tabs.length > 0 && (
              <Command.Group heading="Tabs" className="mb-2">
                {searchResults.tabs.map((tab) => (
                  <Command.Item
                    key={tab.id}
                    onSelect={() => {
                      workspaceActions.setActiveTab(tab.id);
                      onClose();
                    }}
                    className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer aria-selected:bg-accent"
                  >
                    {tab.type === 'terminal' && <Terminal className="w-4 h-4" />}
                    {tab.type === 'browser' && <Globe className="w-4 h-4" />}
                    {tab.type === 'note' && <FileText className="w-4 h-4" />}
                    <span className="flex-1">{tab.title}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {searchResults.spaces.length > 0 && (
              <Command.Group heading="Spaces" className="mb-2">
                {searchResults.spaces.map((space) => (
                  <Command.Item
                    key={space.id}
                    onSelect={() => {
                      workspaceActions.switchSpace(space.id);
                      onClose();
                    }}
                    className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer aria-selected:bg-accent"
                  >
                    <Layout className="w-4 h-4" />
                    <span className="flex-1">{space.name}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {searchResults.apps.length > 0 && (
              <Command.Group heading="Connected Apps" className="mb-2">
                {searchResults.apps.map((app) => (
                  <Command.Item
                    key={app.id}
                    onSelect={() => handleLaunchApp(app.id)}
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
            )}

            {searchResults.installedApps.length > 0 && (
              <Command.Group heading="Add App as Tab" className="mb-2">
                {searchResults.installedApps.map((app) => (
                  <Command.Item
                    key={app.path}
                    onSelect={() => handleAddInstalledAppTab(app)}
                    className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer aria-selected:bg-accent"
                  >
                    <Rocket className="w-4 h-4" />
                    <span className="flex-1">{app.name}</span>
                    <Plus className="w-3 h-3 text-muted-foreground" />
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </>
        )}

        {/* Actions - always shown, cmdk filters automatically */}
        <Command.Group heading="Create" className="mb-2">
          <Command.Item
            onSelect={handleNewTerminal}
            className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer aria-selected:bg-accent"
          >
            <Terminal className="w-4 h-4" />
            <span className="flex-1">New Terminal</span>
            <CommandShortcut>T</CommandShortcut>
          </Command.Item>

          <Command.Item
            onSelect={handleNewBrowser}
            className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer aria-selected:bg-accent"
          >
            <Globe className="w-4 h-4" />
            <span className="flex-1">New Browser</span>
            <CommandShortcut>B</CommandShortcut>
          </Command.Item>

          <Command.Item
            onSelect={handleNewNote}
            className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer aria-selected:bg-accent"
          >
            <FileText className="w-4 h-4" />
            <span className="flex-1">New Note</span>
            <CommandShortcut>N</CommandShortcut>
          </Command.Item>

          <Command.Item
            onSelect={handleNewSpace}
            className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer aria-selected:bg-accent"
          >
            <Layout className="w-4 h-4" />
            <span className="flex-1">New Space</span>
            <CommandShortcut>S</CommandShortcut>
          </Command.Item>
        </Command.Group>

        <Command.Group heading="Profiles" className="mb-2">
          <Command.Item
            onSelect={handleCreateProfile}
            className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer aria-selected:bg-accent"
          >
            <UserPlus className="w-4 h-4" />
            <span className="flex-1">New Profile</span>
            <CommandShortcut>P</CommandShortcut>
          </Command.Item>

          {activeSpaceId && (
            <>
              <Command.Item
                onSelect={() => handleAssignProfileToSpace('none')}
                className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer aria-selected:bg-accent"
              >
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="flex-1">Remove Profile from Space</span>
              </Command.Item>
              {profiles.map((profile) => (
                <Command.Item
                  key={profile.id}
                  onSelect={() => handleAssignProfileToSpace(profile.id)}
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

        <Command.Group heading="Launch" className="mb-2">
          <Command.Item
            onSelect={handleLaunchAllTabs}
            className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer aria-selected:bg-accent"
          >
            <Play className="w-4 h-4" />
            <span className="flex-1">Launch All Tabs</span>
            <CommandShortcut>L</CommandShortcut>
          </Command.Item>

          <Command.Item
            onSelect={handleAddAppFavorite}
            className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer aria-selected:bg-accent"
          >
            <Plus className="w-4 h-4" />
            <span className="flex-1">Connect New App...</span>
          </Command.Item>

          {connectedApps.slice(0, 5).map((app) => (
            <Command.Item
              key={app.id}
              onSelect={() => handleLaunchApp(app.id)}
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

        <Command.Group heading="Navigate" className="mb-2">
          <Command.Item
            onSelect={handleGoToUrl}
            className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer aria-selected:bg-accent"
          >
            <ArrowRight className="w-4 h-4" />
            <span className="flex-1">Go to URL</span>
            <CommandShortcut>G</CommandShortcut>
          </Command.Item>
        </Command.Group>

        {activeTab && (
          <Command.Group heading="Current Tab" className="mb-2">
            <Command.Item
              onSelect={handleDuplicateTab}
              className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer aria-selected:bg-accent"
            >
              <Copy className="w-4 h-4" />
              <span className="flex-1">Duplicate Tab</span>
              <CommandShortcut>D</CommandShortcut>
            </Command.Item>
          </Command.Group>
        )}

        {recentlyClosedTabs.length > 0 && (
          <Command.Group heading="Recently Closed" className="mb-2">
            {recentlyClosedTabs.map((closedTab, index) => (
              <Command.Item
                key={`${closedTab.id}-${index}`}
                onSelect={() => handleRestoreClosedTab(index)}
                className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer aria-selected:bg-accent"
              >
                {closedTab.type === 'terminal' && <Terminal className="w-4 h-4" />}
                {closedTab.type === 'browser' && <Globe className="w-4 h-4" />}
                {closedTab.type === 'note' && <FileText className="w-4 h-4" />}
                {closedTab.type === 'tasks' && <CheckSquare className="w-4 h-4" />}
                <span className="flex-1">{closedTab.title}</span>
                <History className="w-3 h-3 text-muted-foreground" />
              </Command.Item>
            ))}
          </Command.Group>
        )}
      </Command.List>
    </Command>
  );
}
