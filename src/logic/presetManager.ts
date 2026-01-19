import * as vscode from 'vscode'
import { ZenModeSettings } from './zenModeManager'

export interface Preset {
  id: string
  name: string
  settings: ZenModeSettings
  isBuiltIn: boolean
}

const STORAGE_KEY_CUSTOM_PRESETS = 'harmonia-zen.customPresets'
const STORAGE_KEY_ACTIVE_PRESET = 'harmonia-zen.activePreset'

const builtInPresets: Preset[] = [
  {
    id: 'minimal',
    name: 'presets.minimal',
    isBuiltIn: true,
    settings: {
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
    }
  },
  {
    id: 'writer',
    name: 'presets.writer',
    isBuiltIn: true,
    settings: {
      lineNumbers: false,
      gutter: false,
      minimap: false,
      breadcrumbs: false,
      scrollbarVertical: true,
      scrollbarHorizontal: false,
      indentGuides: false,
      bracketPairs: false,
      rulers: false,
      activityBar: false,
      statusBar: false,
      sideBar: false,
      panel: false,
      tabs: false,
      cursorBlinking: true,
      renderWhitespace: false,
      lineHighlight: true
    }
  },
  {
    id: 'focus',
    name: 'presets.focus',
    isBuiltIn: true,
    settings: {
      lineNumbers: true,
      gutter: true,
      minimap: false,
      breadcrumbs: false,
      scrollbarVertical: true,
      scrollbarHorizontal: true,
      indentGuides: true,
      bracketPairs: true,
      rulers: false,
      activityBar: false,
      statusBar: true,
      sideBar: false,
      panel: false,
      tabs: false,
      cursorBlinking: true,
      renderWhitespace: false,
      lineHighlight: true
    }
  }
]

export class PresetManager {
  private context: vscode.ExtensionContext
  private customPresets: Preset[]
  private activePresetId: string | null
  private onPresetsChangeCallbacks: Array<(presets: Preset[]) => void> = []
  private onActivePresetChangeCallbacks: Array<
    (preset: Preset | null) => void
  > = []

  constructor(context: vscode.ExtensionContext) {
    this.context = context
    this.customPresets = context.globalState.get(STORAGE_KEY_CUSTOM_PRESETS, [])
    this.activePresetId = context.globalState.get(STORAGE_KEY_ACTIVE_PRESET, null)
  }

  getAllPresets(): Preset[] {
    return [...builtInPresets, ...this.customPresets]
  }

  getBuiltInPresets(): Preset[] {
    return [...builtInPresets]
  }

  getCustomPresets(): Preset[] {
    return [...this.customPresets]
  }

  getActivePreset(): Preset | null {
    if (!this.activePresetId) {
      return null
    }
    return this.getAllPresets().find((p) => p.id === this.activePresetId) ?? null
  }

  getActivePresetId(): string | null {
    return this.activePresetId
  }

  onPresetsChange(callback: (presets: Preset[]) => void): void {
    this.onPresetsChangeCallbacks.push(callback)
  }

  onActivePresetChange(callback: (preset: Preset | null) => void): void {
    this.onActivePresetChangeCallbacks.push(callback)
  }

  private notifyPresetsChange(): void {
    const presets = this.getAllPresets()
    for (const callback of this.onPresetsChangeCallbacks) {
      callback(presets)
    }
  }

  private notifyActivePresetChange(): void {
    const preset = this.getActivePreset()
    for (const callback of this.onActivePresetChangeCallbacks) {
      callback(preset)
    }
  }

  getPresetById(id: string): Preset | undefined {
    return this.getAllPresets().find((p) => p.id === id)
  }

  async setActivePreset(id: string | null): Promise<void> {
    this.activePresetId = id
    await this.context.globalState.update(STORAGE_KEY_ACTIVE_PRESET, id)
    this.notifyActivePresetChange()
  }

  async saveCustomPreset(name: string, settings: ZenModeSettings): Promise<Preset> {
    const id = `custom-${Date.now()}`
    const preset: Preset = {
      id,
      name,
      settings: { ...settings },
      isBuiltIn: false
    }

    this.customPresets.push(preset)
    await this.context.globalState.update(
      STORAGE_KEY_CUSTOM_PRESETS,
      this.customPresets
    )

    this.notifyPresetsChange()
    return preset
  }

  async updateCustomPreset(
    id: string,
    updates: Partial<Pick<Preset, 'name' | 'settings'>>
  ): Promise<boolean> {
    const index = this.customPresets.findIndex((p) => p.id === id)
    if (index === -1) {
      return false
    }

    const preset = this.customPresets[index]
    if (updates.name !== undefined) {
      preset.name = updates.name
    }
    if (updates.settings !== undefined) {
      preset.settings = { ...updates.settings }
    }

    await this.context.globalState.update(
      STORAGE_KEY_CUSTOM_PRESETS,
      this.customPresets
    )

    this.notifyPresetsChange()
    return true
  }

  async deleteCustomPreset(id: string): Promise<boolean> {
    const index = this.customPresets.findIndex((p) => p.id === id)
    if (index === -1) {
      return false
    }

    this.customPresets.splice(index, 1)
    await this.context.globalState.update(
      STORAGE_KEY_CUSTOM_PRESETS,
      this.customPresets
    )

    if (this.activePresetId === id) {
      await this.setActivePreset(null)
    }

    this.notifyPresetsChange()
    return true
  }

  async selectPresetFromQuickPick(): Promise<Preset | undefined> {
    const presets = this.getAllPresets()
    const items = presets.map((p) => ({
      label: p.isBuiltIn ? `$(package) ${p.name}` : `$(settings-gear) ${p.name}`,
      description: p.isBuiltIn ? 'Built-in' : 'Custom',
      preset: p
    }))

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a preset to apply',
      title: 'Harmonia Zen Presets'
    })

    return selected?.preset
  }
}
