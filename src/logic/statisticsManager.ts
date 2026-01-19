import * as vscode from 'vscode'

export interface DailyStats {
  date: string // YYYY-MM-DD format
  sessionsCompleted: number
  focusMinutes: number
}

export interface FocusStatistics {
  today: DailyStats
  currentStreak: number
  longestStreak: number
  totalSessions: number
  totalFocusMinutes: number
  weekSessions: number
  weekFocusMinutes: number
}

interface StoredStatistics {
  dailyStats: Record<string, DailyStats> // keyed by date
  longestStreak: number
}

const STORAGE_KEY = 'harmonia-zen.statistics'

export class StatisticsManager {
  private context: vscode.ExtensionContext
  private stats: StoredStatistics
  private onStatsChangeCallbacks: Array<(stats: FocusStatistics) => void> = []

  constructor(context: vscode.ExtensionContext) {
    this.context = context
    this.stats = context.globalState.get<StoredStatistics>(STORAGE_KEY, {
      dailyStats: {},
      longestStreak: 0
    })
  }

  private getTodayKey(): string {
    return new Date().toISOString().split('T')[0]
  }

  private getWeekKeys(): string[] {
    const keys: string[] = []
    const today = new Date()
    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      keys.push(date.toISOString().split('T')[0])
    }
    return keys
  }

  private calculateStreak(): number {
    let streak = 0
    const today = new Date()
    const checkDate = new Date(today)

    // Check if today has sessions - if not, start checking from yesterday
    const todayKey = this.getTodayKey()
    const todayStats = this.stats.dailyStats[todayKey]
    if (!todayStats || todayStats.sessionsCompleted === 0) {
      checkDate.setDate(checkDate.getDate() - 1)
    }

    // Count consecutive days with at least one session
    while (true) {
      const dateKey = checkDate.toISOString().split('T')[0]
      const dayStats = this.stats.dailyStats[dateKey]

      if (dayStats && dayStats.sessionsCompleted > 0) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }

    return streak
  }

  recordCompletedSession(focusMinutes: number): void {
    const todayKey = this.getTodayKey()

    if (!this.stats.dailyStats[todayKey]) {
      this.stats.dailyStats[todayKey] = {
        date: todayKey,
        sessionsCompleted: 0,
        focusMinutes: 0
      }
    }

    this.stats.dailyStats[todayKey].sessionsCompleted++
    this.stats.dailyStats[todayKey].focusMinutes += focusMinutes

    // Update longest streak if current streak is higher
    const currentStreak = this.calculateStreak()
    if (currentStreak > this.stats.longestStreak) {
      this.stats.longestStreak = currentStreak
    }

    this.saveStats()
    this.notifyStatsChange()
  }

  getStatistics(): FocusStatistics {
    const todayKey = this.getTodayKey()
    const weekKeys = this.getWeekKeys()

    const today = this.stats.dailyStats[todayKey] || {
      date: todayKey,
      sessionsCompleted: 0,
      focusMinutes: 0
    }

    // Calculate week totals
    let weekSessions = 0
    let weekFocusMinutes = 0
    for (const key of weekKeys) {
      const dayStats = this.stats.dailyStats[key]
      if (dayStats) {
        weekSessions += dayStats.sessionsCompleted
        weekFocusMinutes += dayStats.focusMinutes
      }
    }

    // Calculate all-time totals
    let totalSessions = 0
    let totalFocusMinutes = 0
    for (const dayStats of Object.values(this.stats.dailyStats)) {
      totalSessions += dayStats.sessionsCompleted
      totalFocusMinutes += dayStats.focusMinutes
    }

    return {
      today,
      currentStreak: this.calculateStreak(),
      longestStreak: this.stats.longestStreak,
      totalSessions,
      totalFocusMinutes,
      weekSessions,
      weekFocusMinutes
    }
  }

  onStatsChange(callback: (stats: FocusStatistics) => void): void {
    this.onStatsChangeCallbacks.push(callback)
  }

  private notifyStatsChange(): void {
    const stats = this.getStatistics()
    for (const callback of this.onStatsChangeCallbacks) {
      callback(stats)
    }
  }

  private saveStats(): void {
    // Clean up old data (keep last 90 days to prevent unbounded growth)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 90)
    const cutoffKey = cutoffDate.toISOString().split('T')[0]

    const cleanedStats: Record<string, DailyStats> = {}
    for (const [key, value] of Object.entries(this.stats.dailyStats)) {
      if (key >= cutoffKey) {
        cleanedStats[key] = value
      }
    }
    this.stats.dailyStats = cleanedStats

    this.context.globalState.update(STORAGE_KEY, this.stats)
  }

  formatMinutes(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`
    }
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  getWeeklyChartData(): Array<{ day: string; dayShort: string; sessions: number; focusMinutes: number }> {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const data: Array<{ day: string; dayShort: string; sessions: number; focusMinutes: number }> = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateKey = date.toISOString().split('T')[0]
      const dayStats = this.stats.dailyStats[dateKey]

      data.push({
        day: dateKey,
        dayShort: days[date.getDay()],
        sessions: dayStats?.sessionsCompleted || 0,
        focusMinutes: dayStats?.focusMinutes || 0
      })
    }

    return data
  }
}
