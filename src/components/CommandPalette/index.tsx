import { useState, useEffect, useMemo } from 'react';
import { useSnapshot } from 'valtio';
import { Command } from 'cmdk';
import { Globe, Search, ArrowRight } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { useSpacesStore } from '@/stores/spaces.store';
import { useProfileStore } from '@/stores/profile.store';
import { launcherStore, launcherActions } from '@/stores/launcher.store';
import { urlHistoryActions } from '@/stores/url-history.store';
import { handleError } from '@/lib/error-utils';
import { useCommandPaletteActions, type InstalledApp } from './useCommandPaletteActions';
import {
  UrlHistoryGroup,
  TabsGroup,
  SpacesGroup,
  ConnectedAppsGroup,
  InstalledAppsGroup,
  CreateGroup,
  ProfilesGroup,
  LaunchGroup,
  NavigateGroup,
  CurrentTabGroup,
  RecentlyClosedGroup,
} from './CommandGroups';

// ============================================================================
// Types
// ============================================================================

interface CommandPaletteProps {
  onClose: () => void;
  isExiting?: boolean;
}

// ============================================================================
// URL Normalization
// ============================================================================

/**
 * Normalize URL - add protocol if missing
 */
function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  // Check if it already has a protocol
  if (trimmed.match(/^https?:\/\//i)) {
    return trimmed;
  }

  // Add https:// by default
  return `https://${trimmed}`;
}

// ============================================================================
// Main Component
// ============================================================================

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

  // Get current active tab
  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Get all action handlers
  const actions = useCommandPaletteActions({
    activeSpaceId,
    activeTab,
    spaces,
    tabs,
    profiles,
    onClose,
  });

  // Memoize search results
  const searchResults = useMemo(() => {
    const lowerSearch = search.toLowerCase();

    return {
      tabs: tabs.filter((t) => t.title.toLowerCase().includes(lowerSearch)),
      spaces: spaces.filter((s) => s.name.toLowerCase().includes(lowerSearch)),
      apps: connectedApps.filter((app) => app.name.toLowerCase().includes(lowerSearch)),
      installedApps: installedApps
        .filter((app) => app.name.toLowerCase().includes(lowerSearch))
        .slice(0, 10),
      urls: urlHistoryActions.searchHistory(search),
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
          actions.handleGoToUrl(normalizeUrl(search));
        }
      }}
    >
      {/* Search Input */}
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
            onSelect={() => actions.handleGoToUrl(normalizeUrl(search))}
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

        {/* Search Results */}
        {hasSearchResults && (
          <>
            <UrlHistoryGroup urls={searchResults.urls} onSelect={actions.handleGoToUrl} />
            <TabsGroup tabs={searchResults.tabs} onSelect={actions.handleSwitchToTab} />
            <SpacesGroup spaces={searchResults.spaces} onSelect={actions.handleSwitchToSpace} />
            <ConnectedAppsGroup apps={searchResults.apps} onSelect={actions.handleLaunchApp} />
            <InstalledAppsGroup
              apps={searchResults.installedApps}
              onSelect={actions.handleAddInstalledAppTab}
            />
          </>
        )}

        {/* Static Command Groups */}
        <CreateGroup
          onNewTerminal={actions.handleNewTerminal}
          onNewBrowser={actions.handleNewBrowser}
          onNewNote={actions.handleNewNote}
          onNewSpace={actions.handleNewSpace}
        />

        <ProfilesGroup
          profiles={profiles}
          activeSpaceId={activeSpaceId}
          onCreateProfile={actions.handleCreateProfile}
          onAssignProfile={actions.handleAssignProfileToSpace}
        />

        <LaunchGroup
          connectedApps={connectedApps}
          onLaunchAll={actions.handleLaunchAllTabs}
          onAddAppFavorite={actions.handleAddAppFavorite}
          onLaunchApp={actions.handleLaunchApp}
        />

        <NavigateGroup onGoToUrl={() => actions.handleGoToUrl()} />

        {activeTab && <CurrentTabGroup onDuplicateTab={actions.handleDuplicateTab} />}

        <RecentlyClosedGroup
          tabs={recentlyClosedTabs}
          onRestore={actions.handleRestoreClosedTab}
        />
      </Command.List>
    </Command>
  );
}

// Re-export for backwards compatibility
export { CommandPalette as default };
