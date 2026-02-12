import * as vscode from 'vscode'
import { ZenPanel } from './panels/ZenPanel'
import { StatisticsPanel } from './panels/StatisticsPanel'
import { ZenModeManager } from './logic/zenModeManager'
import { PomodoroTimer } from './logic/pomodoroTimer'
import { PresetManager } from './logic/presetManager'
import { StatisticsManager } from './logic/statisticsManager'
import { ScheduleManager } from './logic/scheduleManager'
import { CrossWindowSync, SyncAction } from './logic/crossWindowSync'
import { initializeTranslations } from './i18n/translations'

let zenManager: ZenModeManager
let pomodoroTimer: PomodoroTimer
let presetManager: PresetManager
let statisticsManager: StatisticsManager
let scheduleManager: ScheduleManager
let crossWindowSync: CrossWindowSync
let statusBarItem: vscode.StatusBarItem
let extensionContext: vscode.ExtensionContext

type TimerVisibility = 'always' | 'auto' | 'hidden'

interface HarmoniaTimerState {
  isRunning: boolean
  phase: string
  timeRemaining: number
}

function getTimerVisibility(): TimerVisibility {
  const config = vscode.workspace.getConfiguration('harmoniaZen')
  return config.get<TimerVisibility>('statusBar.timerVisibility', 'auto')
}

async function isHarmoniaFocusTimerRunning(): Promise<boolean> {
  try {
    const state = await vscode.commands.executeCommand<HarmoniaTimerState | undefined>(
      'harmoniaVision.getTimerState'
    )
    return state?.isRunning === true
  } catch {
    // Harmonia Focus not installed or command not available
    return false
  }
}

export function activate(context: vscode.ExtensionContext): void {
  initializeTranslations()
  extensionContext = context

  zenManager = new ZenModeManager(context)
  pomodoroTimer = new PomodoroTimer(context)
  presetManager = new PresetManager(context)
  statisticsManager = new StatisticsManager(context)
  scheduleManager = new ScheduleManager(context, pomodoroTimer)
  crossWindowSync = new CrossWindowSync(context)

  // Register cross-window sync handlers
  crossWindowSync.onPomodoroSync((action: SyncAction) => {
    switch (action.type) {
      case 'pomodoroStart':
      case 'pomodoroPause':
      case 'pomodoroSkip':
        pomodoroTimer.syncState(action.state, action.settings)
        break
      case 'pomodoroReset':
        pomodoroTimer.syncState(
          {
            phase: 'idle',
            timeRemaining: pomodoroTimer.getSettings().workDuration * 60,
            totalTime: pomodoroTimer.getSettings().workDuration * 60,
            isRunning: false,
            completedSessions: 0,
            sessionsUntilLongBreak: pomodoroTimer.getSettings().sessionsBeforeLongBreak
          }
        )
        break
      case 'pomodoroSettingsChange':
        if ('settings' in action) {
          pomodoroTimer.syncSettings(action.settings)
        }
        break
    }
  })

  crossWindowSync.onZenSync(async (action: SyncAction) => {
    switch (action.type) {
      case 'zenEnable':
      case 'zenApplyPreset':
        if ('settings' in action) {
          await zenManager.syncState(true, action.settings)
        }
        break
      case 'zenDisable':
        if ('settings' in action) {
          await zenManager.syncState(false, action.settings)
        }
        break
      case 'zenToggleUpdate':
        if ('settings' in action) {
          await zenManager.syncState(
            zenManager.isZenModeEnabled(),
            action.settings
          )
        }
        break
    }
  })

  // Track completed work sessions for statistics
  pomodoroTimer.onWorkSessionComplete((focusMinutes) => {
    statisticsManager.recordCompletedSession(focusMinutes)
  })

  scheduleManager.onEndSession(async () => {
    pomodoroTimer.reset()
    if (zenManager.isZenModeEnabled()) {
      await zenManager.disable()
    }
  })

  scheduleManager.onExtendRequested(() => {
    const panel = ZenPanel.createOrShow(
      context.extensionUri,
      zenManager,
      pomodoroTimer,
      presetManager,
      scheduleManager,
      crossWindowSync
    )
    panel.showExtendModal()
  })

  statusBarItem = createStatusBarItem()
  context.subscriptions.push(statusBarItem)

  updateStatusBar()

  pomodoroTimer.onTick(() => {
    updateStatusBar()
  })

  pomodoroTimer.onPhaseChange(() => {
    updateStatusBar()
  })

  zenManager.onStateChange(() => {
    updateStatusBar()
  })

  const openPanelCommand = vscode.commands.registerCommand(
    'harmonia-zen.openPanel',
    () => {
      ZenPanel.createOrShow(
        context.extensionUri,
        zenManager,
        pomodoroTimer,
        presetManager,
        scheduleManager,
        crossWindowSync
      )
    }
  )

  const toggleCommand = vscode.commands.registerCommand(
    'harmonia-zen.toggle',
    async () => {
      await zenManager.toggle()
      const enabled = zenManager.isZenModeEnabled()
      crossWindowSync.broadcast({
        type: enabled ? 'zenEnable' : 'zenDisable',
        settings: zenManager.getUserSettings()
      })
    }
  )

  const startPomodoroCommand = vscode.commands.registerCommand(
    'harmonia-zen.startPomodoro',
    () => {
      pomodoroTimer.start()
      crossWindowSync.broadcast({
        type: 'pomodoroStart',
        state: pomodoroTimer.getState(),
        settings: pomodoroTimer.getSettings()
      })
    }
  )

  const pausePomodoroCommand = vscode.commands.registerCommand(
    'harmonia-zen.pausePomodoro',
    () => {
      pomodoroTimer.pause()
      crossWindowSync.broadcast({
        type: 'pomodoroPause',
        state: pomodoroTimer.getState()
      })
    }
  )

  const stopPomodoroCommand = vscode.commands.registerCommand(
    'harmonia-zen.stopPomodoro',
    () => {
      pomodoroTimer.reset()
      crossWindowSync.broadcast({ type: 'pomodoroReset' })
    }
  )

  const resetPomodoroCommand = vscode.commands.registerCommand(
    'harmonia-zen.resetPomodoro',
    () => {
      pomodoroTimer.reset()
      crossWindowSync.broadcast({ type: 'pomodoroReset' })
    }
  )

  const skipSessionCommand = vscode.commands.registerCommand(
    'harmonia-zen.skipSession',
    () => {
      pomodoroTimer.skip()
      crossWindowSync.broadcast({
        type: 'pomodoroSkip',
        state: pomodoroTimer.getState(),
        settings: pomodoroTimer.getSettings()
      })
    }
  )

  // Toggle pomodoro start/pause - useful for status bar click
  const togglePomodoroCommand = vscode.commands.registerCommand(
    'harmonia-zen.togglePomodoro',
    () => {
      const state = pomodoroTimer.getState()
      if (state.isRunning) {
        pomodoroTimer.pause()
        crossWindowSync.broadcast({
          type: 'pomodoroPause',
          state: pomodoroTimer.getState()
        })
      } else {
        pomodoroTimer.start()
        crossWindowSync.broadcast({
          type: 'pomodoroStart',
          state: pomodoroTimer.getState(),
          settings: pomodoroTimer.getSettings()
        })
      }
    }
  )

  const applyPresetCommand = vscode.commands.registerCommand(
    'harmonia-zen.applyPreset',
    async () => {
      const preset = await presetManager.selectPresetFromQuickPick()
      if (preset) {
        await zenManager.applySettings(preset.settings)
        await presetManager.setActivePreset(preset.id)
        if (!zenManager.isZenModeEnabled()) {
          await zenManager.enable()
        }
        crossWindowSync.broadcast({
          type: 'zenApplyPreset',
          settings: zenManager.getUserSettings()
        })
      }
    }
  )

  const showStatisticsCommand = vscode.commands.registerCommand(
    'harmonia-zen.showStatistics',
    () => {
      StatisticsPanel.createOrShow(context.extensionUri, statisticsManager)
    }
  )

  // Command to expose timer state for cross-extension coordination
  const getTimerStateCommand = vscode.commands.registerCommand(
    'harmonia-zen.getTimerState',
    (): HarmoniaTimerState => {
      const state = pomodoroTimer.getState()
      return {
        isRunning: state.isRunning,
        phase: state.phase,
        timeRemaining: state.timeRemaining
      }
    }
  )

  // Listen for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('harmoniaZen.statusBar.timerVisibility')) {
        updateStatusBar()
      }
    })
  )

  context.subscriptions.push(
    openPanelCommand,
    toggleCommand,
    startPomodoroCommand,
    pausePomodoroCommand,
    stopPomodoroCommand,
    resetPomodoroCommand,
    skipSessionCommand,
    togglePomodoroCommand,
    applyPresetCommand,
    showStatisticsCommand,
    getTimerStateCommand
  )

  // Late-joiner support: apply recent state from other windows
  crossWindowSync.initialSync()
}

function createStatusBarItem(): vscode.StatusBarItem {
  const item = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    101 // Higher priority than Harmonia Focus (100) to show on left when both visible
  )
  // Click opens the panel for better UX (instead of toggle which can be confusing)
  item.command = 'harmonia-zen.openPanel'
  return item
}

function updateStatusBar(): void {
  const visibility = getTimerVisibility()
  const state = pomodoroTimer.getState()
  const isZenEnabled = zenManager.isZenModeEnabled()
  const isTimerActive = state.phase !== 'idle'

  // Handle visibility modes
  if (visibility === 'hidden') {
    statusBarItem.hide()
    return
  }

  if (visibility === 'auto') {
    // In auto mode, only show when timer is running (not idle)
    if (!isTimerActive) {
      statusBarItem.hide()
      return
    }
    // Zen Pomodoro has priority - always show when running
    // (Harmonia Focus will check our state and hide itself)
  }

  // Build the status bar display
  const zenIcon = isZenEnabled ? '$(eye-closed)' : '$(eye)'

  if (state.phase === 'idle') {
    statusBarItem.text = `${zenIcon} Zen`
    statusBarItem.tooltip = 'Harmonia Zen - Click to open panel'
  } else {
    const phaseLabel = state.phase === 'work' ? 'Work' : state.phase === 'break' ? 'Break' : 'Long Break'
    const phaseIcon = state.phase === 'work' ? '$(clock)' : '$(coffee)'
    const time = pomodoroTimer.formatTime(state.timeRemaining)
    const runningIndicator = state.isRunning ? '' : ' $(debug-pause)'

    statusBarItem.text = `${zenIcon} ${phaseIcon} ${time}${runningIndicator}`
    statusBarItem.tooltip = `Harmonia Zen - Pomodoro ${phaseLabel} (${time})${state.isRunning ? '' : ' [Paused]'}`
  }

  // Remove the yellow warning background - keep it clean and consistent
  statusBarItem.backgroundColor = undefined
  statusBarItem.show()
}

export function deactivate(): void {
  if (pomodoroTimer) {
    pomodoroTimer.dispose()
  }

  if (ZenPanel.currentPanel) {
    ZenPanel.currentPanel.dispose()
  }

  if (StatisticsPanel.currentPanel) {
    StatisticsPanel.currentPanel.dispose()
  }

  if (scheduleManager) {
    scheduleManager.dispose()
  }

  if (crossWindowSync) {
    crossWindowSync.dispose()
  }
}
