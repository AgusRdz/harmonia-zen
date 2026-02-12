import * as fs from 'fs'
import * as path from 'path'
import * as vscode from 'vscode'
import { PomodoroState, PomodoroSettings } from './pomodoroTimer'
import { ZenModeSettings } from './zenModeManager'

export type SyncActionType =
  | 'pomodoroStart'
  | 'pomodoroPause'
  | 'pomodoroSkip'
  | 'pomodoroReset'
  | 'pomodoroSettingsChange'
  | 'zenEnable'
  | 'zenDisable'
  | 'zenToggleUpdate'
  | 'zenApplyPreset'

export interface PomodoroSyncAction {
  type: 'pomodoroStart' | 'pomodoroPause' | 'pomodoroSkip'
  state: PomodoroState
  settings?: PomodoroSettings
}

export interface PomodoroResetAction {
  type: 'pomodoroReset'
}

export interface PomodoroSettingsAction {
  type: 'pomodoroSettingsChange'
  settings: PomodoroSettings
}

export interface ZenEnableAction {
  type: 'zenEnable'
  settings: ZenModeSettings
}

export interface ZenDisableAction {
  type: 'zenDisable'
  settings: ZenModeSettings
}

export interface ZenToggleUpdateAction {
  type: 'zenToggleUpdate'
  toggleId: string
  value: boolean
  settings: ZenModeSettings
}

export interface ZenApplyPresetAction {
  type: 'zenApplyPreset'
  settings: ZenModeSettings
}

export type SyncAction =
  | PomodoroSyncAction
  | PomodoroResetAction
  | PomodoroSettingsAction
  | ZenEnableAction
  | ZenDisableAction
  | ZenToggleUpdateAction
  | ZenApplyPresetAction

interface SyncFileData {
  windowId: string
  seq: number
  timestamp: number
  action: SyncAction
}

type PomodoroHandler = (action: SyncAction) => void
type ZenHandler = (action: SyncAction) => void

const SYNC_FILE = 'window-sync.json'
const STALE_THRESHOLD_MS = 60_000
const POLL_INTERVAL_MS = 500

export class CrossWindowSync {
  private readonly windowId: string
  private readonly syncFilePath: string
  private seq = 0
  private lastSeq = -1
  private applyingRemoteFlag = false
  private pomodoroHandlers: PomodoroHandler[] = []
  private zenHandlers: ZenHandler[] = []
  private watcher: fs.FSWatcher | null = null
  private pollId: ReturnType<typeof setInterval> | null = null

  constructor(context: vscode.ExtensionContext) {
    this.windowId =
      Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    const storageDir = context.globalStorageUri.fsPath
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true })
    }
    this.syncFilePath = path.join(storageDir, SYNC_FILE)
    this.startWatching()
  }

  isApplyingRemote(): boolean {
    return this.applyingRemoteFlag
  }

  onPomodoroSync(handler: PomodoroHandler): void {
    this.pomodoroHandlers.push(handler)
  }

  onZenSync(handler: ZenHandler): void {
    this.zenHandlers.push(handler)
  }

  broadcast(action: SyncAction): void {
    if (this.applyingRemoteFlag) {
      return
    }
    this.seq++
    const data: SyncFileData = {
      windowId: this.windowId,
      seq: this.seq,
      timestamp: Date.now(),
      action
    }
    try {
      fs.writeFileSync(this.syncFilePath, JSON.stringify(data))
    } catch {
      // Ignore write errors (race condition with other windows)
    }
  }

  initialSync(): void {
    const data = this.readSyncFile()
    if (!data) {
      return
    }
    // Only apply if recent and from another window
    if (data.windowId === this.windowId) {
      return
    }
    if (Date.now() - data.timestamp > STALE_THRESHOLD_MS) {
      return
    }
    this.lastSeq = data.seq
    this.dispatchAction(data.action)
  }

  dispose(): void {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
    if (this.pollId !== null) {
      clearInterval(this.pollId)
      this.pollId = null
    }
  }

  private startWatching(): void {
    // fs.watch for instant detection
    try {
      const dir = path.dirname(this.syncFilePath)
      this.watcher = fs.watch(dir, (eventType, filename) => {
        if (filename === SYNC_FILE) {
          this.checkForUpdate()
        }
      })
      this.watcher.on('error', () => {
        // Watcher failed, polling fallback handles it
      })
    } catch {
      // fs.watch not available, rely on polling
    }

    // Polling fallback for reliability
    this.pollId = setInterval(() => {
      this.checkForUpdate()
    }, POLL_INTERVAL_MS)
  }

  private checkForUpdate(): void {
    const data = this.readSyncFile()
    if (!data) {
      return
    }
    // Skip own writes
    if (data.windowId === this.windowId) {
      return
    }
    // Skip already-processed updates
    if (data.seq <= this.lastSeq) {
      return
    }
    // Skip stale updates
    if (Date.now() - data.timestamp > STALE_THRESHOLD_MS) {
      return
    }
    this.lastSeq = data.seq
    this.dispatchAction(data.action)
  }

  private dispatchAction(action: SyncAction): void {
    this.applyingRemoteFlag = true
    try {
      if (action.type.startsWith('pomodoro')) {
        for (const handler of this.pomodoroHandlers) {
          handler(action)
        }
      } else {
        for (const handler of this.zenHandlers) {
          handler(action)
        }
      }
    } finally {
      this.applyingRemoteFlag = false
    }
  }

  private readSyncFile(): SyncFileData | null {
    try {
      const raw = fs.readFileSync(this.syncFilePath, 'utf8')
      return JSON.parse(raw) as SyncFileData
    } catch {
      return null
    }
  }
}
