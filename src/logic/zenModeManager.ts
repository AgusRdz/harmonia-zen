import * as vscode from 'vscode'
import { debounce } from '../utils/throttle'

export interface ZenModeToggle {
  id: string
  label: string
  settingPath: string
  zenValue: unknown
  defaultValue: unknown
  isCommand?: boolean
}

export interface ZenModeSettings {
  lineNumbers: boolean
  gutter: boolean
  minimap: boolean
  breadcrumbs: boolean
  scrollbarVertical: boolean
  scrollbarHorizontal: boolean
  indentGuides: boolean
  bracketPairs: boolean
  rulers: boolean
  activityBar: boolean
  statusBar: boolean
  sideBar: boolean
  panel: boolean
  tabs: boolean
  cursorBlinking: boolean
  renderWhitespace: boolean
  lineHighlight: boolean
}

export interface SettingsSnapshot {
  [key: string]: unknown
}

const STORAGE_KEY_SNAPSHOT = 'harmonia-zen.settingsSnapshot'
const STORAGE_KEY_ZEN_ENABLED = 'harmonia-zen.zenEnabled'
const STORAGE_KEY_USER_SETTINGS = 'harmonia-zen.userSettings'

export const toggleDefinitions: ZenModeToggle[] = [
  {
    id: 'lineNumbers',
    label: 'zenMode.toggles.lineNumbers',
    settingPath: 'editor.lineNumbers',
    zenValue: 'off',
    defaultValue: 'on'
  },
  {
    id: 'gutter',
    label: 'zenMode.toggles.gutter',
    settingPath: 'editor.glyphMargin',
    zenValue: false,
    defaultValue: true
  },
  {
    id: 'minimap',
    label: 'zenMode.toggles.minimap',
    settingPath: 'editor.minimap.enabled',
    zenValue: false,
    defaultValue: true
  },
  {
    id: 'breadcrumbs',
    label: 'zenMode.toggles.breadcrumbs',
    settingPath: 'breadcrumbs.enabled',
    zenValue: false,
    defaultValue: true
  },
  {
    id: 'scrollbarVertical',
    label: 'zenMode.toggles.scrollbarVertical',
    settingPath: 'editor.scrollbar.vertical',
    zenValue: 'hidden',
    defaultValue: 'auto'
  },
  {
    id: 'scrollbarHorizontal',
    label: 'zenMode.toggles.scrollbarHorizontal',
    settingPath: 'editor.scrollbar.horizontal',
    zenValue: 'hidden',
    defaultValue: 'auto'
  },
  {
    id: 'indentGuides',
    label: 'zenMode.toggles.indentGuides',
    settingPath: 'editor.guides.indentation',
    zenValue: false,
    defaultValue: true
  },
  {
    id: 'bracketPairs',
    label: 'zenMode.toggles.bracketPairs',
    settingPath: 'editor.guides.bracketPairs',
    zenValue: false,
    defaultValue: 'active'
  },
  {
    id: 'rulers',
    label: 'zenMode.toggles.rulers',
    settingPath: 'editor.rulers',
    zenValue: [],
    defaultValue: []
  },
  {
    id: 'activityBar',
    label: 'zenMode.toggles.activityBar',
    settingPath: 'workbench.activityBar.location',
    zenValue: 'hidden',
    defaultValue: 'default'
  },
  {
    id: 'statusBar',
    label: 'zenMode.toggles.statusBar',
    settingPath: 'workbench.statusBar.visible',
    zenValue: false,
    defaultValue: true
  },
  {
    id: 'sideBar',
    label: 'zenMode.toggles.sideBar',
    settingPath: 'workbench.sideBar.location',
    zenValue: 'hidden',
    defaultValue: 'left',
    isCommand: true
  },
  {
    id: 'panel',
    label: 'zenMode.toggles.panel',
    settingPath: 'workbench.panel.defaultLocation',
    zenValue: 'hidden',
    defaultValue: 'bottom',
    isCommand: true
  },
  {
    id: 'tabs',
    label: 'zenMode.toggles.tabs',
    settingPath: 'workbench.editor.showTabs',
    zenValue: 'none',
    defaultValue: 'multiple'
  },
  {
    id: 'cursorBlinking',
    label: 'zenMode.toggles.cursorBlinking',
    settingPath: 'editor.cursorBlinking',
    zenValue: 'solid',
    defaultValue: 'blink'
  },
  {
    id: 'renderWhitespace',
    label: 'zenMode.toggles.renderWhitespace',
    settingPath: 'editor.renderWhitespace',
    zenValue: 'none',
    defaultValue: 'selection'
  },
  {
    id: 'lineHighlight',
    label: 'zenMode.toggles.lineHighlight',
    settingPath: 'editor.renderLineHighlight',
    zenValue: 'none',
    defaultValue: 'line'
  }
]

export class ZenModeManager {
  private context: vscode.ExtensionContext
  private zenEnabled = false
  private settingsSnapshot: SettingsSnapshot = {}
  private userSettings: ZenModeSettings
  private onStateChangeCallbacks: Array<(enabled: boolean) => void> = []
  private onSettingsChangeCallbacks: Array<(settings: ZenModeSettings) => void> =
    []
  private sideBarWasVisible = true
  private panelWasVisible = false

  private debouncedSaveUserSettings = debounce(() => {
    this.context.globalState.update(STORAGE_KEY_USER_SETTINGS, this.userSettings)
  }, 300)

  constructor(context: vscode.ExtensionContext) {
    this.context = context
    this.zenEnabled = context.globalState.get(STORAGE_KEY_ZEN_ENABLED, false)
    this.settingsSnapshot = context.globalState.get(STORAGE_KEY_SNAPSHOT, {})
    this.userSettings = context.globalState.get(STORAGE_KEY_USER_SETTINGS, {
      lineNumbers: false,
      gutter: false,
      minimap: false,
      breadcrumbs: false,
      scrollbarVertical: false,
      scrollbarHorizontal: false,
      indentGuides: false,
      bracketPairs: false,
      rulers: false,
      activityBar: false,
      statusBar: false,
      sideBar: false,
      panel: false,
      tabs: false,
      cursorBlinking: false,
      renderWhitespace: false,
      lineHighlight: false
    })
  }

  isZenModeEnabled(): boolean {
    return this.zenEnabled
  }

  getUserSettings(): ZenModeSettings {
    return { ...this.userSettings }
  }

  onStateChange(callback: (enabled: boolean) => void): void {
    this.onStateChangeCallbacks.push(callback)
  }

  onSettingsChange(callback: (settings: ZenModeSettings) => void): void {
    this.onSettingsChangeCallbacks.push(callback)
  }

  private notifyStateChange(): void {
    for (const callback of this.onStateChangeCallbacks) {
      callback(this.zenEnabled)
    }
  }

  private notifySettingsChange(): void {
    for (const callback of this.onSettingsChangeCallbacks) {
      callback(this.userSettings)
    }
  }

  async toggle(): Promise<void> {
    if (this.zenEnabled) {
      await this.disable()
    } else {
      await this.enable()
    }
  }

  async enable(): Promise<void> {
    if (this.zenEnabled) {
      return
    }

    await this.snapshotCurrentSettings()
    await this.applyZenSettings()

    this.zenEnabled = true
    await this.context.globalState.update(STORAGE_KEY_ZEN_ENABLED, true)
    this.notifyStateChange()
  }

  async disable(): Promise<void> {
    if (!this.zenEnabled) {
      return
    }

    await this.restoreSettings()

    this.zenEnabled = false
    await this.context.globalState.update(STORAGE_KEY_ZEN_ENABLED, false)
    this.notifyStateChange()
  }

  private async snapshotCurrentSettings(): Promise<void> {
    const config = vscode.workspace.getConfiguration()
    this.settingsSnapshot = {}

    for (const toggle of toggleDefinitions) {
      if (!toggle.isCommand) {
        const value = config.get(toggle.settingPath)
        this.settingsSnapshot[toggle.settingPath] = value
      }
    }

    this.sideBarWasVisible = vscode.window.tabGroups.all.length > 0
    this.panelWasVisible = false

    await this.context.globalState.update(
      STORAGE_KEY_SNAPSHOT,
      this.settingsSnapshot
    )
  }

  private async applyZenSettings(): Promise<void> {
    const config = vscode.workspace.getConfiguration()

    for (const toggle of toggleDefinitions) {
      const showElement = this.userSettings[toggle.id as keyof ZenModeSettings]

      if (toggle.isCommand) {
        if (toggle.id === 'sideBar') {
          if (showElement) {
            await vscode.commands.executeCommand('workbench.action.focusSideBar')
          } else {
            await vscode.commands.executeCommand('workbench.action.closeSidebar')
          }
        } else if (toggle.id === 'panel') {
          if (showElement) {
            await vscode.commands.executeCommand('workbench.action.togglePanel')
          } else {
            await vscode.commands.executeCommand('workbench.action.closePanel')
          }
        }
      } else {
        // Apply zen value (hide) or restore from snapshot (show)
        const value = showElement
          ? this.settingsSnapshot[toggle.settingPath] ?? toggle.defaultValue
          : toggle.zenValue

        await config.update(
          toggle.settingPath,
          value,
          vscode.ConfigurationTarget.Global
        )
      }
    }
  }

  private async restoreSettings(): Promise<void> {
    const config = vscode.workspace.getConfiguration()

    for (const toggle of toggleDefinitions) {
      if (!toggle.isCommand) {
        const originalValue = this.settingsSnapshot[toggle.settingPath]
        if (originalValue !== undefined) {
          await config.update(
            toggle.settingPath,
            originalValue,
            vscode.ConfigurationTarget.Global
          )
        }
      }
    }

    if (this.sideBarWasVisible) {
      await vscode.commands.executeCommand(
        'workbench.action.focusSideBar'
      ).then(
        () => {},
        () => {}
      )
    }
  }

  async updateToggle(
    toggleId: keyof ZenModeSettings,
    showElement: boolean
  ): Promise<void> {
    this.userSettings[toggleId] = showElement
    this.debouncedSaveUserSettings()
    this.notifySettingsChange()

    if (this.zenEnabled) {
      const toggle = toggleDefinitions.find((t) => t.id === toggleId)
      if (toggle) {
        await this.applySingleToggle(toggle, showElement)
      }
    }
  }

  private async applySingleToggle(
    toggle: ZenModeToggle,
    showElement: boolean
  ): Promise<void> {
    if (toggle.isCommand) {
      if (toggle.id === 'sideBar') {
        if (showElement) {
          await vscode.commands.executeCommand('workbench.action.focusSideBar')
        } else {
          await vscode.commands.executeCommand('workbench.action.closeSidebar')
        }
      } else if (toggle.id === 'panel') {
        if (showElement) {
          await vscode.commands.executeCommand('workbench.action.togglePanel')
        } else {
          await vscode.commands.executeCommand('workbench.action.closePanel')
        }
      }
    } else {
      const config = vscode.workspace.getConfiguration()
      const value = showElement
        ? this.settingsSnapshot[toggle.settingPath] ?? toggle.defaultValue
        : toggle.zenValue

      await config.update(
        toggle.settingPath,
        value,
        vscode.ConfigurationTarget.Global
      )
    }
  }

  async syncState(enabled: boolean, settings: ZenModeSettings): Promise<void> {
    this.userSettings = { ...settings }
    this.debouncedSaveUserSettings()
    this.notifySettingsChange()

    if (enabled && !this.zenEnabled) {
      await this.enable()
    } else if (!enabled && this.zenEnabled) {
      await this.disable()
    } else if (enabled && this.zenEnabled) {
      // Already enabled but settings changed — re-apply
      await this.applyZenSettings()
    }
  }

  async applySettings(settings: ZenModeSettings): Promise<void> {
    this.userSettings = { ...settings }
    this.debouncedSaveUserSettings()
    this.notifySettingsChange()

    // Apply immediately if zen mode is active
    if (this.zenEnabled) {
      await this.applyZenSettings()
    }
  }

  getToggleDefinitions(): ZenModeToggle[] {
    return toggleDefinitions
  }
}
