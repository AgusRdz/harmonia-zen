# Changelog

## [1.1.0] - 2026-01-20

### Added

- **Status Bar Timer Visibility Setting**
  - New setting `harmoniaZen.statusBar.timerVisibility` with options:
    - `always` - Always show the status bar timer
    - `auto` (default) - Show only when timer is running; hides when idle
    - `hidden` - Never show the status bar timer
  - **UI Control** - Configurable directly from the Zen Panel under Timer Settings
  - Enables clean UX when using both Harmonia Zen and Harmonia Focus together
  - Zen Pomodoro timer has priority over Focus Eye Break timer in `auto` mode

- **Cross-Extension Coordination**
  - New internal command `harmonia-zen.getTimerState` for extension communication
  - Allows Harmonia Focus to detect when Zen Pomodoro is active and yield the status bar

### Fixed

- **Webview Disposed Error** - Fixed "webview disposed" error when clicking the status bar timer after closing and reopening the Zen Panel
  - Added proper guards to check if the panel instance is still active before posting messages
  - Prevents stale callbacks from attempting to update disposed webviews

### Improved

- **Status Bar Click Behavior** - Now opens the Zen Panel instead of toggling timer (more intuitive UX)
- **Tooltips** - Clearer, more descriptive tooltips:
  - Idle: `Harmonia Zen - Click to open panel`
  - Running: `Harmonia Zen - Pomodoro Work (25:00)`
  - Break: `Harmonia Zen - Pomodoro Break (05:00)`

---

## [1.0.0] - 2025-01-18

### Added

#### Zen Mode Panel

- **17 customizable UI element toggles** - Granular control over what stays visible during focus sessions
  - Line Numbers, Gutter, Minimap, Breadcrumbs
  - Vertical & Horizontal Scrollbars
  - Indent Guides, Bracket Pairs, Rulers
  - Activity Bar, Status Bar, Side Bar, Panel, Tabs
  - Cursor Blinking, Render Whitespace, Line Highlight
- **Settings preservation** - Your original editor settings are automatically backed up when entering Zen Mode and restored when exiting
- **Real-time toggle updates** - Changes apply instantly without needing to restart or refresh

#### Preset Profiles

- **3 built-in presets** for quick setup:
  - **Minimal** - Hide everything for maximum focus
  - **Writer** - Clean view with cursor and scrollbar visible
  - **Focus** - Keep code aids, hide distractions
- **Custom presets** - Save your own configurations for quick switching
- **Preset management** - Create, apply, and delete custom presets

#### Pomodoro Timer

- **Integrated timer** with work/break/long break phases
- **Customizable durations** - Adjust work (default 25min), break (5min), and long break (15min) intervals
- **Session counter** - Track completed pomodoro sessions
- **Auto-start option** - Automatically begin the next session
- **Status bar integration** - View timer and control playback from the status bar
- **Visual notifications** - Get notified when sessions complete

#### Focus Statistics

- **Dedicated statistics view** - Track your focus journey
- **Daily tracking** - Sessions completed and focus time for today
- **Streak tracking** - Current streak and longest streak (consecutive days with sessions)
- **Weekly overview** - Sessions and focus time for the last 7 days
- **All-time totals** - Cumulative sessions and focus time
- **Visual charts** - Bar charts showing daily sessions and focus time trends
- **Data persistence** - Statistics saved locally (last 90 days)

#### Internationalization

- **English** (default)
- **Spanish** - Full translation support

#### Keyboard Shortcuts

- `Cmd/Ctrl+Alt+Z` - Toggle Zen Mode
- `Cmd/Ctrl+Alt+Shift+Z` - Open Zen Mode Panel
- `Cmd/Ctrl+Alt+P` - Toggle Pomodoro Timer (Start/Pause)
- `Cmd/Ctrl+Alt+S` - Stop Pomodoro Timer
- `Cmd/Ctrl+Alt+N` - Skip Current Session

#### Commands

- `Harmonia Zen: Open Zen Mode Panel`
- `Harmonia Zen: Toggle Zen Mode`
- `Harmonia Zen: Start Pomodoro Timer`
- `Harmonia Zen: Pause Pomodoro Timer`
- `Harmonia Zen: Stop Pomodoro Timer`
- `Harmonia Zen: Toggle Pomodoro Timer (Start/Pause)`
- `Harmonia Zen: Reset Pomodoro Timer`
- `Harmonia Zen: Skip Current Session`
- `Harmonia Zen: Apply Preset`
- `Harmonia Zen: Show Focus Statistics`

### Technical

- Full TypeScript implementation with strict mode
- VS Code theme integration using CSS variables
- Accessible UI with ARIA labels and keyboard navigation
- Reduced motion support for users with motion sensitivity
- Zero external dependencies in webviews
- No telemetry - all data stays local
