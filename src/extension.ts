import * as vscode from 'vscode'
import { ZenPanel } from './panels/ZenPanel'
import { StatisticsPanel } from './panels/StatisticsPanel'
import { ZenModeManager } from './logic/zenModeManager'
import { PomodoroTimer } from './logic/pomodoroTimer'
import { PresetManager } from './logic/presetManager'
import { StatisticsManager } from './logic/statisticsManager'
import { initializeTranslations } from './i18n/translations'

let zenManager: ZenModeManager
let pomodoroTimer: PomodoroTimer
let presetManager: PresetManager
let statisticsManager: StatisticsManager
let statusBarItem: vscode.StatusBarItem

export function activate(context: vscode.ExtensionContext): void {
  initializeTranslations()

  zenManager = new ZenModeManager(context)
  pomodoroTimer = new PomodoroTimer(context)
  presetManager = new PresetManager(context)
  statisticsManager = new StatisticsManager(context)

  // Track completed work sessions for statistics
  pomodoroTimer.onWorkSessionComplete((focusMinutes) => {
    statisticsManager.recordCompletedSession(focusMinutes)
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
        presetManager
      )
    }
  )

  const toggleCommand = vscode.commands.registerCommand(
    'harmonia-zen.toggle',
    async () => {
      await zenManager.toggle()
    }
  )

  const startPomodoroCommand = vscode.commands.registerCommand(
    'harmonia-zen.startPomodoro',
    () => {
      pomodoroTimer.start()
    }
  )

  const pausePomodoroCommand = vscode.commands.registerCommand(
    'harmonia-zen.pausePomodoro',
    () => {
      pomodoroTimer.pause()
    }
  )

  const stopPomodoroCommand = vscode.commands.registerCommand(
    'harmonia-zen.stopPomodoro',
    () => {
      pomodoroTimer.reset()
    }
  )

  const resetPomodoroCommand = vscode.commands.registerCommand(
    'harmonia-zen.resetPomodoro',
    () => {
      pomodoroTimer.reset()
    }
  )

  const skipSessionCommand = vscode.commands.registerCommand(
    'harmonia-zen.skipSession',
    () => {
      pomodoroTimer.skip()
    }
  )

  // Toggle pomodoro start/pause - useful for status bar click
  const togglePomodoroCommand = vscode.commands.registerCommand(
    'harmonia-zen.togglePomodoro',
    () => {
      const state = pomodoroTimer.getState()
      if (state.isRunning) {
        pomodoroTimer.pause()
      } else {
        pomodoroTimer.start()
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
      }
    }
  )

  const showStatisticsCommand = vscode.commands.registerCommand(
    'harmonia-zen.showStatistics',
    () => {
      StatisticsPanel.createOrShow(context.extensionUri, statisticsManager)
    }
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
    showStatisticsCommand
  )
}

function createStatusBarItem(): vscode.StatusBarItem {
  const item = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  )
  // Click toggles pomodoro start/pause instead of opening panel
  item.command = 'harmonia-zen.togglePomodoro'
  item.show()
  return item
}

function updateStatusBar(): void {
  const state = pomodoroTimer.getState()
  const isZenEnabled = zenManager.isZenModeEnabled()

  const zenIcon = isZenEnabled ? '$(eye-closed)' : '$(eye)'

  if (state.phase === 'idle') {
    statusBarItem.text = `${zenIcon} Zen`
    statusBarItem.tooltip = 'Harmonia Zen - Click to start timer'
  } else {
    const phaseIcon = state.phase === 'work' ? '$(clock)' : '$(coffee)'
    const time = pomodoroTimer.formatTime(state.timeRemaining)
    const runningIndicator = state.isRunning ? '' : ' $(debug-pause)'

    statusBarItem.text = `${zenIcon} ${phaseIcon} ${time}${runningIndicator}`
    statusBarItem.tooltip = state.isRunning
      ? 'Click to pause'
      : 'Click to resume'
  }

  // Remove the yellow warning background - keep it clean and consistent
  statusBarItem.backgroundColor = undefined
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
}
