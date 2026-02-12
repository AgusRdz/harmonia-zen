import * as vscode from 'vscode'
import { ZenModeManager, ZenModeSettings } from '../logic/zenModeManager'
import { PomodoroTimer, PomodoroSettings } from '../logic/pomodoroTimer'
import { PresetManager } from '../logic/presetManager'
import { ScheduleManager, WorkSchedule } from '../logic/scheduleManager'
import { CrossWindowSync } from '../logic/crossWindowSync'
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
  private readonly scheduleManager: ScheduleManager
  private readonly crossWindowSync: CrossWindowSync
  private disposables: vscode.Disposable[] = []

  private debouncedUpdate = debounce(() => {
    this.updateWebview()
  }, 100)

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    zenManager: ZenModeManager,
    pomodoroTimer: PomodoroTimer,
    presetManager: PresetManager,
    scheduleManager: ScheduleManager,
    crossWindowSync: CrossWindowSync
  ) {
    this.panel = panel
    this.extensionUri = extensionUri
    this.zenManager = zenManager
    this.pomodoroTimer = pomodoroTimer
    this.presetManager = presetManager
    this.scheduleManager = scheduleManager
    this.crossWindowSync = crossWindowSync

    this.updateWebview()
    this.setupListeners()
  }

  public static createOrShow(
    extensionUri: vscode.Uri,
    zenManager: ZenModeManager,
    pomodoroTimer: PomodoroTimer,
    presetManager: PresetManager,
    scheduleManager: ScheduleManager,
    crossWindowSync: CrossWindowSync
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
      presetManager,
      scheduleManager,
      crossWindowSync
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

    // UI element toggles - push settings to webview for remote sync
    this.zenManager.onSettingsChange((settings) => {
      if (ZenPanel.currentPanel === this) {
        this.panel.webview.postMessage({
          type: 'updateZenToggles',
          settings
        })
      }
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

    // Schedule settings change - no re-render needed, webview handles locally
    this.scheduleManager.onSettingsChange(() => {
      // No action needed - webview handles state locally
    })
  }

  private async handleMessage(message: WebviewMessage): Promise<void> {
    switch (message.type) {
      case 'toggleZen':
        await this.zenManager.toggle()
        this.crossWindowSync.broadcast({
          type: this.zenManager.isZenModeEnabled() ? 'zenEnable' : 'zenDisable',
          settings: this.zenManager.getUserSettings()
        })
        break

      case 'updateToggle':
        if (message.toggleId && typeof message.value === 'boolean') {
          await this.zenManager.updateToggle(
            message.toggleId as keyof ZenModeSettings,
            message.value
          )
          this.crossWindowSync.broadcast({
            type: 'zenToggleUpdate',
            toggleId: message.toggleId,
            value: message.value,
            settings: this.zenManager.getUserSettings()
          })
        }
        break

      case 'pomodoroStart':
        this.pomodoroTimer.start()
        this.crossWindowSync.broadcast({
          type: 'pomodoroStart',
          state: this.pomodoroTimer.getState(),
          settings: this.pomodoroTimer.getSettings()
        })
        break

      case 'pomodoroPause':
        this.pomodoroTimer.pause()
        this.crossWindowSync.broadcast({
          type: 'pomodoroPause',
          state: this.pomodoroTimer.getState()
        })
        break

      case 'pomodoroStop':
        this.pomodoroTimer.reset()
        this.crossWindowSync.broadcast({ type: 'pomodoroReset' })
        break

      case 'pomodoroSkip':
        this.pomodoroTimer.skip()
        this.crossWindowSync.broadcast({
          type: 'pomodoroSkip',
          state: this.pomodoroTimer.getState(),
          settings: this.pomodoroTimer.getSettings()
        })
        break

      case 'pomodoroReset':
        this.pomodoroTimer.reset()
        this.crossWindowSync.broadcast({ type: 'pomodoroReset' })
        break

      case 'updatePomodoroSettings':
        if (message.settings) {
          this.pomodoroTimer.updateSettings(message.settings)
          this.crossWindowSync.broadcast({
            type: 'pomodoroSettingsChange',
            settings: this.pomodoroTimer.getSettings()
          })
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
            this.crossWindowSync.broadcast({
              type: 'zenApplyPreset',
              settings: this.zenManager.getUserSettings()
            })
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

      case 'updateScheduleSettings':
        if (message.scheduleSettings) {
          await this.scheduleManager.updateSchedule(message.scheduleSettings)
        }
        break

      case 'confirmExtendSession':
        if (message.endTime) {
          this.scheduleManager.writeExtendAction(message.endTime)
          this.scheduleManager.setTemporaryEndTime(message.endTime)
        }
        break

      case 'cancelExtendSession':
        this.scheduleManager.dismissExtend()
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
      timerVisibility: this.getTimerVisibility(),
      scheduleSettings: this.scheduleManager.getSchedule()
    }

    this.panel.webview.html = buildWebviewHtml(
      this.panel.webview,
      this.extensionUri,
      data
    )
  }

  public showExtendModal(): void {
    this.panel.reveal()
    this.panel.webview.postMessage({ type: 'showExtendModal' })
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
  scheduleSettings?: Partial<WorkSchedule>
  endTime?: string
}
