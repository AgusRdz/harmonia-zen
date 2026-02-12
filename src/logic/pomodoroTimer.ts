import * as vscode from 'vscode'

export type PomodoroPhase = 'work' | 'break' | 'longBreak' | 'idle'
export type ProgressBarPosition = 'top' | 'bottom' | 'hidden'

export interface PomodoroSettings {
  workDuration: number
  breakDuration: number
  longBreakDuration: number
  autoStart: boolean
  soundEnabled: boolean
  progressBarPosition: ProgressBarPosition
  sessionsBeforeLongBreak: number
}

export interface PomodoroState {
  phase: PomodoroPhase
  timeRemaining: number
  totalTime: number
  isRunning: boolean
  completedSessions: number
  sessionsUntilLongBreak: number
}

const STORAGE_KEY_SETTINGS = 'harmonia-zen.pomodoroSettings'
const STORAGE_KEY_STATE = 'harmonia-zen.pomodoroState'

const DEFAULT_SETTINGS: PomodoroSettings = {
  workDuration: 25,
  breakDuration: 5,
  longBreakDuration: 15,
  autoStart: false,
  soundEnabled: true,
  progressBarPosition: 'top',
  sessionsBeforeLongBreak: 4
}

export class PomodoroTimer {
  private context: vscode.ExtensionContext
  private settings: PomodoroSettings
  private state: PomodoroState
  private intervalId: ReturnType<typeof setInterval> | null = null
  private onTickCallbacks: Array<(state: PomodoroState) => void> = []
  private onPhaseChangeCallbacks: Array<
    (phase: PomodoroPhase, state: PomodoroState) => void
  > = []
  private onSettingsChangeCallbacks: Array<
    (settings: PomodoroSettings) => void
  > = []
  private onWorkSessionCompleteCallbacks: Array<
    (focusMinutes: number) => void
  > = []

  constructor(context: vscode.ExtensionContext) {
    this.context = context
    this.settings = context.globalState.get(
      STORAGE_KEY_SETTINGS,
      DEFAULT_SETTINGS
    )
    this.state = context.globalState.get(STORAGE_KEY_STATE, {
      phase: 'idle' as PomodoroPhase,
      timeRemaining: this.settings.workDuration * 60,
      totalTime: this.settings.workDuration * 60,
      isRunning: false,
      completedSessions: 0,
      sessionsUntilLongBreak: this.settings.sessionsBeforeLongBreak
    })

    if (this.state.isRunning) {
      this.state.isRunning = false
      this.saveState()
    }
  }

  getSettings(): PomodoroSettings {
    return { ...this.settings }
  }

  getState(): PomodoroState {
    return { ...this.state }
  }

  onTick(callback: (state: PomodoroState) => void): void {
    this.onTickCallbacks.push(callback)
  }

  onPhaseChange(
    callback: (phase: PomodoroPhase, state: PomodoroState) => void
  ): void {
    this.onPhaseChangeCallbacks.push(callback)
  }

  onSettingsChange(callback: (settings: PomodoroSettings) => void): void {
    this.onSettingsChangeCallbacks.push(callback)
  }

  onWorkSessionComplete(callback: (focusMinutes: number) => void): void {
    this.onWorkSessionCompleteCallbacks.push(callback)
  }

  private notifyTick(): void {
    for (const callback of this.onTickCallbacks) {
      callback(this.state)
    }
  }

  private notifyPhaseChange(): void {
    for (const callback of this.onPhaseChangeCallbacks) {
      callback(this.state.phase, this.state)
    }
  }

  private notifySettingsChange(): void {
    for (const callback of this.onSettingsChangeCallbacks) {
      callback(this.settings)
    }
  }

  private notifyWorkSessionComplete(focusMinutes: number): void {
    for (const callback of this.onWorkSessionCompleteCallbacks) {
      callback(focusMinutes)
    }
  }

  private async saveState(): Promise<void> {
    await this.context.globalState.update(STORAGE_KEY_STATE, this.state)
  }

  private async saveSettings(): Promise<void> {
    await this.context.globalState.update(STORAGE_KEY_SETTINGS, this.settings)
  }

  start(): void {
    if (this.state.isRunning) {
      return
    }

    if (this.state.phase === 'idle') {
      this.state.phase = 'work'
      this.state.timeRemaining = this.settings.workDuration * 60
      this.state.totalTime = this.settings.workDuration * 60
      this.notifyPhaseChange()
    }

    this.state.isRunning = true
    this.saveState()

    this.intervalId = setInterval(() => {
      this.tick()
    }, 1000)

    this.notifyTick()
  }

  pause(): void {
    if (!this.state.isRunning) {
      return
    }

    this.state.isRunning = false
    this.saveState()

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    this.notifyTick()
  }

  reset(): void {
    this.pause()

    this.state = {
      phase: 'idle',
      timeRemaining: this.settings.workDuration * 60,
      totalTime: this.settings.workDuration * 60,
      isRunning: false,
      completedSessions: 0,
      sessionsUntilLongBreak: this.settings.sessionsBeforeLongBreak
    }

    this.saveState()
    this.notifyTick()
    this.notifyPhaseChange()
  }

  skip(): void {
    this.completePhase()
  }

  private tick(): void {
    if (this.state.timeRemaining > 0) {
      this.state.timeRemaining--
      this.saveState()
      this.notifyTick()
    } else {
      this.completePhase()
    }
  }

  private completePhase(): void {
    const previousPhase = this.state.phase

    if (this.settings.soundEnabled) {
      this.playNotificationSound()
    }

    this.showNotification(previousPhase)

    switch (this.state.phase) {
      case 'work':
        this.state.completedSessions++
        this.state.sessionsUntilLongBreak--

        // Notify statistics tracker about completed work session
        this.notifyWorkSessionComplete(this.settings.workDuration)

        if (this.state.sessionsUntilLongBreak <= 0) {
          this.state.phase = 'longBreak'
          this.state.timeRemaining = this.settings.longBreakDuration * 60
          this.state.totalTime = this.settings.longBreakDuration * 60
          this.state.sessionsUntilLongBreak =
            this.settings.sessionsBeforeLongBreak
        } else {
          this.state.phase = 'break'
          this.state.timeRemaining = this.settings.breakDuration * 60
          this.state.totalTime = this.settings.breakDuration * 60
        }
        break

      case 'break':
      case 'longBreak':
        this.state.phase = 'work'
        this.state.timeRemaining = this.settings.workDuration * 60
        this.state.totalTime = this.settings.workDuration * 60
        break

      case 'idle':
        this.state.phase = 'work'
        this.state.timeRemaining = this.settings.workDuration * 60
        this.state.totalTime = this.settings.workDuration * 60
        break
    }

    this.saveState()
    this.notifyPhaseChange()

    if (!this.settings.autoStart) {
      this.pause()
    } else {
      this.notifyTick()
    }
  }

  private playNotificationSound(): void {
    // VS Code doesn't have native sound support, so we rely on system notifications
    // In the future, we could use a webview to play audio
  }

  private showNotification(completedPhase: PomodoroPhase): void {
    let message: string

    switch (completedPhase) {
      case 'work':
        if (this.state.phase === 'longBreak') {
          message = `Great work! You completed ${this.settings.sessionsBeforeLongBreak} sessions. Time for a long break!`
        } else {
          message = 'Work session complete! Time for a short break.'
        }
        break
      case 'break':
        message = 'Break is over! Ready to focus?'
        break
      case 'longBreak':
        message = 'Long break is over! Ready to start a new cycle?'
        break
      default:
        message = 'Pomodoro session complete!'
    }

    vscode.window.showInformationMessage(message, 'Start', 'Dismiss').then(
      (selection) => {
        if (selection === 'Start' && !this.state.isRunning) {
          this.start()
        }
      },
      () => {}
    )
  }

  syncState(remoteState: PomodoroState, remoteSettings?: PomodoroSettings): void {
    // Stop current interval
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    // Apply remote settings if provided
    if (remoteSettings) {
      this.settings = { ...remoteSettings }
      this.saveSettings()
    }

    // Apply remote state directly
    this.state = { ...remoteState }
    this.saveState()

    // Restart interval if running
    if (this.state.isRunning) {
      this.intervalId = setInterval(() => {
        this.tick()
      }, 1000)
    }

    // Notify UI (but NOT notifications/statistics — those are local-only)
    this.notifyTick()
    this.notifyPhaseChange()
  }

  syncSettings(remoteSettings: PomodoroSettings): void {
    this.settings = { ...remoteSettings }
    this.saveSettings()
    this.notifySettingsChange()

    if (this.state.phase === 'idle') {
      this.state.timeRemaining = this.settings.workDuration * 60
      this.state.totalTime = this.settings.workDuration * 60
      this.state.sessionsUntilLongBreak = this.settings.sessionsBeforeLongBreak
      this.saveState()
      this.notifyTick()
    }
  }

  updateSettings(newSettings: Partial<PomodoroSettings>): void {
    this.settings = { ...this.settings, ...newSettings }
    this.saveSettings()
    this.notifySettingsChange()

    if (this.state.phase === 'idle') {
      this.state.timeRemaining = this.settings.workDuration * 60
      this.state.totalTime = this.settings.workDuration * 60
      this.state.sessionsUntilLongBreak = this.settings.sessionsBeforeLongBreak
      this.saveState()
      this.notifyTick()
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  getProgress(): number {
    if (this.state.totalTime === 0) {
      return 0
    }
    return (
      ((this.state.totalTime - this.state.timeRemaining) / this.state.totalTime) *
      100
    )
  }

  dispose(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }
}
