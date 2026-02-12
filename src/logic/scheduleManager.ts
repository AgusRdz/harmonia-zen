import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { PomodoroTimer } from './pomodoroTimer'
import { t } from '../i18n/translations'

export interface WorkSchedule {
  enabled: boolean
  activeDays: number[] // 0=Sun, 1=Mon, ..., 6=Sat
  startTime: string // "HH:MM" e.g. "09:00"
  endTime: string // "HH:MM" e.g. "17:00"
}

interface CoordData {
  claimedAt: number
  action: 'end' | 'extend' | 'dismiss' | null
  extendTime?: string
}

const STORAGE_KEY = 'harmonia-zen.workSchedule'
const COORD_FILE = 'schedule-coord.json'
const COORD_STALE_MS = 5 * 60 * 1000 // 5 minutes

const DEFAULT_SCHEDULE: WorkSchedule = {
  enabled: false,
  activeDays: [1, 2, 3, 4, 5], // Mon-Fri
  startTime: '09:00',
  endTime: '17:00'
}

export class ScheduleManager {
  private context: vscode.ExtensionContext
  private pomodoroTimer: PomodoroTimer
  private schedule: WorkSchedule
  private endTimeoutId: ReturnType<typeof setTimeout> | null = null
  private midnightTimeoutId: ReturnType<typeof setTimeout> | null = null
  private coordPollId: ReturnType<typeof setInterval> | null = null
  private coordFilePath: string
  private onSettingsChangeCallbacks: Array<(schedule: WorkSchedule) => void> =
    []
  private onExtendRequestedCallbacks: Array<() => void> = []
  private onEndSessionCallbacks: Array<() => void> = []

  constructor(
    context: vscode.ExtensionContext,
    pomodoroTimer: PomodoroTimer
  ) {
    this.context = context
    this.pomodoroTimer = pomodoroTimer
    this.schedule = context.globalState.get(STORAGE_KEY, DEFAULT_SCHEDULE)
    this.coordFilePath = path.join(context.globalStorageUri.fsPath, COORD_FILE)
    this.ensureStorageDir()
    this.scheduleNextEndCheck()
  }

  getSchedule(): WorkSchedule {
    return { ...this.schedule }
  }

  onSettingsChange(callback: (schedule: WorkSchedule) => void): void {
    this.onSettingsChangeCallbacks.push(callback)
  }

  onExtendRequested(callback: () => void): void {
    this.onExtendRequestedCallbacks.push(callback)
  }

  onEndSession(callback: () => void): void {
    this.onEndSessionCallbacks.push(callback)
  }

  private notifySettingsChange(): void {
    for (const callback of this.onSettingsChangeCallbacks) {
      callback(this.schedule)
    }
  }

  private notifyExtendRequested(): void {
    for (const callback of this.onExtendRequestedCallbacks) {
      callback()
    }
  }

  private notifyEndSession(): void {
    for (const callback of this.onEndSessionCallbacks) {
      callback()
    }
  }

  async updateSchedule(newSchedule: Partial<WorkSchedule>): Promise<void> {
    this.schedule = { ...this.schedule, ...newSchedule }
    await this.context.globalState.update(STORAGE_KEY, this.schedule)
    this.notifySettingsChange()
    this.scheduleNextEndCheck()
  }

  private ensureStorageDir(): void {
    const dir = path.dirname(this.coordFilePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  private readCoordFile(): CoordData | null {
    try {
      const raw = fs.readFileSync(this.coordFilePath, 'utf8')
      return JSON.parse(raw) as CoordData
    } catch {
      return null
    }
  }

  private writeCoordFile(data: CoordData): void {
    try {
      fs.writeFileSync(this.coordFilePath, JSON.stringify(data))
    } catch {
      // Ignore write errors (e.g. race condition)
    }
  }

  private deleteCoordFile(): void {
    try {
      if (fs.existsSync(this.coordFilePath)) {
        fs.unlinkSync(this.coordFilePath)
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Tries to atomically claim the alert by creating the coord file exclusively.
   * Returns true if this window owns the alert.
   */
  private tryClaimAlert(): boolean {
    try {
      // 'wx' flag = write exclusive — fails if file already exists
      fs.writeFileSync(
        this.coordFilePath,
        JSON.stringify({ claimedAt: Date.now(), action: null } as CoordData),
        { flag: 'wx' }
      )
      return true
    } catch {
      // File already exists — check if it's stale
      const existing = this.readCoordFile()
      if (existing && Date.now() - existing.claimedAt > COORD_STALE_MS) {
        // Stale claim, remove and retry once
        this.deleteCoordFile()
        try {
          fs.writeFileSync(
            this.coordFilePath,
            JSON.stringify({ claimedAt: Date.now(), action: null } as CoordData),
            { flag: 'wx' }
          )
          return true
        } catch {
          return false
        }
      }
      return false
    }
  }

  /**
   * Non-owner windows poll the coord file waiting for the owner to write a response.
   */
  private waitForCoordResponse(): void {
    this.stopCoordPoll()

    this.coordPollId = setInterval(() => {
      const data = this.readCoordFile()
      if (!data || !data.action) {
        // Check for stale claim (owner window closed without responding)
        if (!data || Date.now() - data.claimedAt > COORD_STALE_MS) {
          this.stopCoordPoll()
          this.deleteCoordFile()
          this.scheduleNextEndCheck()
        }
        return
      }

      // Action has been written by the owner window
      this.stopCoordPoll()

      if (data.action === 'end') {
        this.notifyEndSession()
        this.scheduleNextEndCheck()
      } else if (data.action === 'extend' && data.extendTime) {
        this.setTemporaryEndTime(data.extendTime)
      } else {
        // 'dismiss' — just reschedule
        this.scheduleNextEndCheck()
      }
    }, 500)
  }

  private stopCoordPoll(): void {
    if (this.coordPollId !== null) {
      clearInterval(this.coordPollId)
      this.coordPollId = null
    }
  }

  private clearTimeouts(): void {
    if (this.endTimeoutId !== null) {
      clearTimeout(this.endTimeoutId)
      this.endTimeoutId = null
    }
    if (this.midnightTimeoutId !== null) {
      clearTimeout(this.midnightTimeoutId)
      this.midnightTimeoutId = null
    }
  }

  private scheduleNextEndCheck(): void {
    this.clearTimeouts()

    if (!this.schedule.enabled || this.schedule.activeDays.length === 0) {
      return
    }

    const now = new Date()
    const nextEnd = this.getNextEndTime(now)

    if (!nextEnd) {
      return
    }

    const msUntilEnd = nextEnd.getTime() - now.getTime()

    if (msUntilEnd <= 0) {
      // End time already passed, schedule for next work day
      this.scheduleMidnightRecalc(now)
      return
    }

    // Cap setTimeout at ~24 hours to avoid overflow issues, recalculate at midnight
    const MAX_TIMEOUT = 24 * 60 * 60 * 1000
    if (msUntilEnd > MAX_TIMEOUT) {
      this.scheduleMidnightRecalc(now)
      return
    }

    this.endTimeoutId = setTimeout(() => {
      this.handleEndOfShift()
    }, msUntilEnd)
  }

  private scheduleMidnightRecalc(now: Date): void {
    const midnight = new Date(now)
    midnight.setDate(midnight.getDate() + 1)
    midnight.setHours(0, 0, 1, 0) // 1 second past midnight

    const msUntilMidnight = midnight.getTime() - now.getTime()

    this.midnightTimeoutId = setTimeout(() => {
      this.scheduleNextEndCheck()
    }, msUntilMidnight)
  }

  private getNextEndTime(now: Date): Date | null {
    const todayDay = now.getDay()
    const [endHour, endMinute] = this.parseTime(this.schedule.endTime)
    const [startHour, startMinute] = this.parseTime(this.schedule.startTime)

    // Check if today is a work day
    if (this.schedule.activeDays.includes(todayDay)) {
      const todayEnd = new Date(now)

      // Handle night shifts: endTime < startTime means end is next calendar day
      const isNightShift =
        endHour < startHour ||
        (endHour === startHour && endMinute < startMinute)

      if (isNightShift) {
        // If shift started yesterday evening and ends today morning
        const yesterdayDay = (todayDay + 6) % 7
        if (this.schedule.activeDays.includes(yesterdayDay)) {
          todayEnd.setHours(endHour, endMinute, 0, 0)
          if (todayEnd.getTime() > now.getTime()) {
            return todayEnd
          }
        }

        // If shift starts today evening and ends tomorrow morning
        todayEnd.setDate(todayEnd.getDate() + 1)
        todayEnd.setHours(endHour, endMinute, 0, 0)

        const todayStart = new Date(now)
        todayStart.setHours(startHour, startMinute, 0, 0)

        if (now.getTime() >= todayStart.getTime()) {
          return todayEnd
        }
      } else {
        todayEnd.setHours(endHour, endMinute, 0, 0)
        if (todayEnd.getTime() > now.getTime()) {
          return todayEnd
        }
      }
    } else {
      // Not a work day, but check for night shift from yesterday
      const [eH, eM] = this.parseTime(this.schedule.endTime)
      const [sH, sM] = this.parseTime(this.schedule.startTime)
      const isNightShift = eH < sH || (eH === sH && eM < sM)

      if (isNightShift) {
        const yesterdayDay = (todayDay + 6) % 7
        if (this.schedule.activeDays.includes(yesterdayDay)) {
          const todayEnd = new Date(now)
          todayEnd.setHours(eH, eM, 0, 0)
          if (todayEnd.getTime() > now.getTime()) {
            return todayEnd
          }
        }
      }
    }

    // Find next work day
    for (let i = 1; i <= 7; i++) {
      const checkDay = (todayDay + i) % 7
      if (this.schedule.activeDays.includes(checkDay)) {
        const nextEnd = new Date(now)
        nextEnd.setDate(nextEnd.getDate() + i)

        const isNightShift =
          endHour < startHour ||
          (endHour === startHour && endMinute < startMinute)

        if (isNightShift) {
          // Night shift: end time is the day after the work day
          nextEnd.setDate(nextEnd.getDate() + 1)
        }

        nextEnd.setHours(endHour, endMinute, 0, 0)
        return nextEnd
      }
    }

    return null
  }

  private parseTime(time: string): [number, number] {
    const parts = time.split(':')
    const hour = parseInt(parts[0], 10)
    const minute = parseInt(parts[1], 10)
    return [
      isNaN(hour) ? 0 : hour,
      isNaN(minute) ? 0 : minute
    ]
  }

  private handleEndOfShift(): void {
    // Only one window should show the alert — try to claim it
    if (!this.tryClaimAlert()) {
      // Another window already claimed it — wait for its response
      this.waitForCoordResponse()
      return
    }

    vscode.window
      .showInformationMessage(
        t('schedule.shiftEnded'),
        t('schedule.endSession'),
        t('schedule.extendSession')
      )
      .then(
        (selection) => {
          if (selection === t('schedule.extendSession')) {
            // Write a placeholder; the actual end time will be written
            // when the user confirms in the extend modal via writeExtendAction()
            this.notifyExtendRequested()
          } else if (selection === t('schedule.endSession')) {
            this.writeCoordFile({
              claimedAt: Date.now(),
              action: 'end'
            })
            this.notifyEndSession()
            this.scheduleNextEndCheck()
          } else {
            // Dismissed without selecting
            this.writeCoordFile({
              claimedAt: Date.now(),
              action: 'dismiss'
            })
            this.scheduleNextEndCheck()
          }
        },
        () => {
          this.writeCoordFile({
            claimedAt: Date.now(),
            action: 'dismiss'
          })
          this.scheduleNextEndCheck()
        }
      )
  }

  /**
   * Called when the user confirms the extend modal with a new end time.
   * Writes the coordination action so other windows pick it up.
   */
  dismissExtend(): void {
    this.writeCoordFile({
      claimedAt: Date.now(),
      action: 'end'
    })
    this.notifyEndSession()
    this.scheduleNextEndCheck()
  }

  writeExtendAction(endTime: string): void {
    this.writeCoordFile({
      claimedAt: Date.now(),
      action: 'extend',
      extendTime: endTime
    })
  }

  setTemporaryEndTime(endTime: string): void {
    this.clearTimeouts()

    const [hour, minute] = this.parseTime(endTime)
    const now = new Date()
    const target = new Date(now)
    target.setHours(hour, minute, 0, 0)

    // If the chosen time is already past, assume next day
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1)
    }

    const ms = target.getTime() - now.getTime()

    this.endTimeoutId = setTimeout(() => {
      this.handleEndOfShift()
    }, ms)
  }

  dispose(): void {
    this.clearTimeouts()
    this.stopCoordPoll()
  }
}
