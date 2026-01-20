import * as vscode from 'vscode'
import { ZenModeManager, ZenModeSettings } from '../logic/zenModeManager'
import { PomodoroTimer, PomodoroSettings } from '../logic/pomodoroTimer'
import { PresetManager } from '../logic/presetManager'
import { buildWebviewHtml, WebviewData, TimerVisibility } from '../webview/htmlBuilder'
import { t } from '../i18n/translations'
import { debounce } from '../utils/throttle'

export class ZenPanel {
  public static currentPanel: ZenPanel | undefined
  private static readonly viewType = 'harmoniaZen'

  private readonly panel: vscode.WebviewPanel
  private readonly extensionUri: vscode.Uri
  private readonly zenManager: ZenModeManager
  private readonly pomodoroTimer: PomodoroTimer
  private readonly presetManager: PresetManager
  private disposables: vscode.Disposable[] = []

  private debouncedUpdate = debounce(() => {
    this.updateWebview()
  }, 100)

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    zenManager: ZenModeManager,
    pomodoroTimer: PomodoroTimer,
    presetManager: PresetManager
  ) {
    this.panel = panel
    this.extensionUri = extensionUri
    this.zenManager = zenManager
    this.pomodoroTimer = pomodoroTimer
    this.presetManager = presetManager

    this.updateWebview()
    this.setupListeners()
  }

  public static createOrShow(
    extensionUri: vscode.Uri,
    zenManager: ZenModeManager,
    pomodoroTimer: PomodoroTimer,
    presetManager: PresetManager
  ): ZenPanel {
    const column = vscode.ViewColumn.Beside

    if (ZenPanel.currentPanel) {
      ZenPanel.currentPanel.panel.reveal(column)
      return ZenPanel.currentPanel
    }

    const panel = vscode.window.createWebviewPanel(
      ZenPanel.viewType,
      t('zenMode.title'),
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          extensionUri,
          vscode.Uri.joinPath(extensionUri, 'node_modules', '@vscode', 'codicons')
        ]
      }
    )

    ZenPanel.currentPanel = new ZenPanel(
      panel,
      extensionUri,
      zenManager,
      pomodoroTimer,
      presetManager
    )

    return ZenPanel.currentPanel
  }

  private setupListeners(): void {
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables)

    this.panel.webview.onDidReceiveMessage(
      (message) => this.handleMessage(message),
      null,
      this.disposables
    )

    // Send incremental zen status update instead of full re-render
    // Guard: check if THIS panel instance is still the active one
    this.zenManager.onStateChange((enabled) => {
      if (ZenPanel.currentPanel === this) {
        this.panel.webview.postMessage({
          type: 'updateZenStatus',
          enabled
        })
      }
    })

    // UI element toggles - use optimistic UI, no re-render needed
    this.zenManager.onSettingsChange(() => {
      // No action needed - webview handles optimistic updates
    })

    // Timer tick - incremental update only
    // Guard: check if THIS panel instance is still the active one
    this.pomodoroTimer.onTick((state) => {
      if (ZenPanel.currentPanel === this) {
        this.panel.webview.postMessage({
          type: 'updateTimer',
          formattedTime: this.pomodoroTimer.formatTime(state.timeRemaining),
          progress: this.pomodoroTimer.getProgress(),
          isRunning: state.isRunning,
          phase: state.phase,
          sessions: state.completedSessions
        })
      }
    })

    // Phase change needs full re-render for button state (Start/Pause)
    this.pomodoroTimer.onPhaseChange(() => {
      if (ZenPanel.currentPanel === this) {
        this.debouncedUpdate()
      }
    })

    // Settings change - no re-render needed, webview handles locally
    this.pomodoroTimer.onSettingsChange(() => {
      // No action needed - webview handles state locally
    })

    // Presets change needs full re-render to update the list
    this.presetManager.onPresetsChange(() => {
      if (ZenPanel.currentPanel === this) {
        this.debouncedUpdate()
      }
    })

    this.presetManager.onActivePresetChange(() => {
      if (ZenPanel.currentPanel === this) {
        this.debouncedUpdate()
      }
    })
  }

  private async handleMessage(message: WebviewMessage): Promise<void> {
    switch (message.type) {
      case 'toggleZen':
        await this.zenManager.toggle()
        break

      case 'updateToggle':
        if (message.toggleId && typeof message.value === 'boolean') {
          await this.zenManager.updateToggle(
            message.toggleId as keyof ZenModeSettings,
            message.value
          )
        }
        break

      case 'pomodoroStart':
        this.pomodoroTimer.start()
        break

      case 'pomodoroPause':
        this.pomodoroTimer.pause()
        break

      case 'pomodoroStop':
        this.pomodoroTimer.reset()
        break

      case 'pomodoroSkip':
        this.pomodoroTimer.skip()
        break

      case 'pomodoroReset':
        this.pomodoroTimer.reset()
        break

      case 'updatePomodoroSettings':
        if (message.settings) {
          this.pomodoroTimer.updateSettings(message.settings)
        }
        break

      case 'applyPreset':
        if (message.presetId) {
          const preset = this.presetManager.getPresetById(message.presetId)
          if (preset) {
            await this.zenManager.applySettings(preset.settings)
            await this.presetManager.setActivePreset(message.presetId)
            if (!this.zenManager.isZenModeEnabled()) {
              await this.zenManager.enable()
            }
          }
        }
        break

      case 'deletePreset':
        if (message.presetId) {
          await this.presetManager.deleteCustomPreset(message.presetId)
        }
        break

      case 'savePreset':
        const name = await vscode.window.showInputBox({
          prompt: t('presets.enterName'),
          placeHolder: 'My Custom Preset',
          validateInput: (value) => {
            if (!value || value.trim().length === 0) {
              return 'Preset name cannot be empty'
            }
            if (value.trim().length > 30) {
              return 'Preset name must be 30 characters or less'
            }
            return null
          }
        })
        if (name) {
          const settings = this.zenManager.getUserSettings()
          await this.presetManager.saveCustomPreset(name.trim(), settings)
        }
        break

      case 'updateTimerVisibility':
        if (message.visibility) {
          const config = vscode.workspace.getConfiguration('harmoniaZen')
          await config.update(
            'statusBar.timerVisibility',
            message.visibility,
            vscode.ConfigurationTarget.Global
          )
        }
        break
    }
  }

  private getTimerVisibility(): TimerVisibility {
    const config = vscode.workspace.getConfiguration('harmoniaZen')
    return config.get<TimerVisibility>('statusBar.timerVisibility', 'auto')
  }

  private updateWebview(): void {
    const data: WebviewData = {
      zenEnabled: this.zenManager.isZenModeEnabled(),
      zenSettings: this.zenManager.getUserSettings(),
      toggles: this.zenManager.getToggleDefinitions(),
      pomodoroState: this.pomodoroTimer.getState(),
      pomodoroSettings: this.pomodoroTimer.getSettings(),
      presets: this.presetManager.getAllPresets(),
      activePresetId: this.presetManager.getActivePresetId(),
      formattedTime: this.pomodoroTimer.formatTime(
        this.pomodoroTimer.getState().timeRemaining
      ),
      progress: this.pomodoroTimer.getProgress(),
      timerVisibility: this.getTimerVisibility()
    }

    this.panel.webview.html = buildWebviewHtml(
      this.panel.webview,
      this.extensionUri,
      data
    )
  }

  public dispose(): void {
    ZenPanel.currentPanel = undefined

    this.panel.dispose()

    while (this.disposables.length) {
      const disposable = this.disposables.pop()
      if (disposable) {
        disposable.dispose()
      }
    }
  }
}

interface WebviewMessage {
  type: string
  toggleId?: string
  value?: boolean
  presetId?: string
  settings?: Partial<PomodoroSettings>
  visibility?: TimerVisibility
}
