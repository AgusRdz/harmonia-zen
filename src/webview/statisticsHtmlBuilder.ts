import * as vscode from 'vscode'
import { StatisticsManager } from '../logic/statisticsManager'
import { t, TranslationKey } from '../i18n/translations'

export function buildStatisticsHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  statisticsManager: StatisticsManager
): string {
  const nonce = getNonce()
  const codiconsUri = webview.asWebviewUri(
    vscode.Uri.joinPath(
      extensionUri,
      'node_modules',
      '@vscode/codicons',
      'dist',
      'codicon.css'
    )
  )

  const stats = statisticsManager.getStatistics()
  const weekData = statisticsManager.getWeeklyChartData()
  const maxSessions = Math.max(...weekData.map(d => d.sessions), 1)
  const maxFocusMinutes = Math.max(...weekData.map(d => d.focusMinutes), 1)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
  <title>${t('statistics.title')}</title>
  <link href="${codiconsUri}" rel="stylesheet" />
  <style>
    ${getStyles()}
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>
        <span class="codicon codicon-graph"></span>
        ${t('statistics.title')}
      </h1>
    </header>

    <div class="stats-overview">
      ${buildOverviewCard('today-sessions', stats.today.sessionsCompleted.toString(), t('statistics.sessions'), t('statistics.today'), true)}
      ${buildOverviewCard('today-focus', statisticsManager.formatMinutes(stats.today.focusMinutes), t('statistics.focusTime'), t('statistics.today'), true)}
      ${buildOverviewCard('streak', stats.currentStreak.toString(), t('statistics.streak'), t('statistics.days'), false)}
      ${buildOverviewCard('longest', stats.longestStreak.toString(), t('statistics.longestStreak'), t('statistics.days'), false)}
    </div>

    <div class="charts-section">
      <div class="chart-card">
        <h2 class="chart-title">
          <span class="codicon codicon-pulse"></span>
          ${t('statistics.sessions')} - ${t('statistics.week')}
        </h2>
        <div class="bar-chart">
          ${weekData.map(d => `
            <div class="bar-column">
              <div class="bar-wrapper">
                <div class="bar sessions-bar" style="height: ${(d.sessions / maxSessions) * 100}%">
                  ${d.sessions > 0 ? `<span class="bar-value">${d.sessions}</span>` : ''}
                </div>
              </div>
              <span class="bar-label">${d.dayShort}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="chart-card">
        <h2 class="chart-title">
          <span class="codicon codicon-clock"></span>
          ${t('statistics.focusTime')} - ${t('statistics.week')}
        </h2>
        <div class="bar-chart">
          ${weekData.map(d => `
            <div class="bar-column">
              <div class="bar-wrapper">
                <div class="bar focus-bar" style="height: ${(d.focusMinutes / maxFocusMinutes) * 100}%">
                  ${d.focusMinutes > 0 ? `<span class="bar-value">${statisticsManager.formatMinutes(d.focusMinutes)}</span>` : ''}
                </div>
              </div>
              <span class="bar-label">${d.dayShort}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="totals-section">
      <div class="totals-card">
        <h2 class="totals-title">${t('statistics.week')}</h2>
        <div class="totals-row">
          <div class="total-item">
            <span class="total-value">${stats.weekSessions}</span>
            <span class="total-label">${t('statistics.sessions')}</span>
          </div>
          <div class="total-item">
            <span class="total-value">${statisticsManager.formatMinutes(stats.weekFocusMinutes)}</span>
            <span class="total-label">${t('statistics.focusTime')}</span>
          </div>
        </div>
      </div>
      <div class="totals-card">
        <h2 class="totals-title">${t('statistics.allTime')}</h2>
        <div class="totals-row">
          <div class="total-item">
            <span class="total-value">${stats.totalSessions}</span>
            <span class="total-label">${t('statistics.sessions')}</span>
          </div>
          <div class="total-item">
            <span class="total-value">${statisticsManager.formatMinutes(stats.totalFocusMinutes)}</span>
            <span class="total-label">${t('statistics.focusTime')}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`
}

function buildOverviewCard(id: string, value: string, label: string, sublabel: string, highlight: boolean): string {
  return `
    <div class="overview-card">
      <div class="overview-value ${highlight ? 'highlight' : ''}" id="${id}">${value}</div>
      <div class="overview-label">${label}</div>
      <div class="overview-sublabel">${sublabel}</div>
    </div>
  `
}

function getNonce(): string {
  let text = ''
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

function getStyles(): string {
  return `
    :root {
      --transition-fast: 150ms ease;
      --transition-normal: 200ms ease;
      --border-radius: 8px;
      --spacing-xs: 4px;
      --spacing-sm: 8px;
      --spacing-md: 16px;
      --spacing-lg: 24px;
      --spacing-xl: 32px;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      line-height: 1.5;
      padding: var(--spacing-lg);
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
    }

    .header {
      margin-bottom: var(--spacing-xl);
    }

    .header h1 {
      font-size: 24px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      color: var(--vscode-foreground);
    }

    .header h1 .codicon {
      font-size: 28px;
      color: var(--vscode-charts-blue);
    }

    /* Overview Cards */
    .stats-overview {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--spacing-md);
      margin-bottom: var(--spacing-xl);
    }

    .overview-card {
      background: var(--vscode-sideBar-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: var(--border-radius);
      padding: var(--spacing-lg);
      text-align: center;
    }

    .overview-value {
      font-size: 36px;
      font-weight: 700;
      line-height: 1;
      color: var(--vscode-foreground);
    }

    .overview-value.highlight {
      color: var(--vscode-charts-blue);
    }

    .overview-label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--vscode-descriptionForeground);
      margin-top: var(--spacing-sm);
    }

    .overview-sublabel {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      opacity: 0.7;
    }

    /* Charts Section */
    .charts-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--spacing-lg);
      margin-bottom: var(--spacing-xl);
    }

    .chart-card {
      background: var(--vscode-sideBar-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: var(--border-radius);
      padding: var(--spacing-lg);
    }

    .chart-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--vscode-foreground);
      margin-bottom: var(--spacing-lg);
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .chart-title .codicon {
      color: var(--vscode-descriptionForeground);
    }

    /* Bar Chart */
    .bar-chart {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      height: 160px;
      gap: var(--spacing-sm);
    }

    .bar-column {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
    }

    .bar-wrapper {
      flex: 1;
      width: 100%;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }

    .bar {
      width: 70%;
      min-height: 4px;
      border-radius: 4px 4px 0 0;
      position: relative;
      transition: height var(--transition-normal);
    }

    .sessions-bar {
      background: linear-gradient(180deg, var(--vscode-charts-blue) 0%, var(--vscode-charts-blue) 100%);
      opacity: 0.85;
    }

    .focus-bar {
      background: linear-gradient(180deg, var(--vscode-charts-green) 0%, var(--vscode-charts-green) 100%);
      opacity: 0.85;
    }

    .bar-value {
      position: absolute;
      top: -20px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 10px;
      font-weight: 600;
      color: var(--vscode-foreground);
      white-space: nowrap;
    }

    .bar-label {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      margin-top: var(--spacing-sm);
      font-weight: 500;
    }

    /* Totals Section */
    .totals-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--spacing-lg);
    }

    .totals-card {
      background: var(--vscode-sideBar-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: var(--border-radius);
      padding: var(--spacing-lg);
    }

    .totals-title {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: var(--spacing-md);
    }

    .totals-row {
      display: flex;
      gap: var(--spacing-xl);
    }

    .total-item {
      display: flex;
      flex-direction: column;
    }

    .total-value {
      font-size: 28px;
      font-weight: 600;
      color: var(--vscode-foreground);
      line-height: 1;
    }

    .total-label {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      margin-top: var(--spacing-xs);
    }

    /* Responsive */
    @media (max-width: 600px) {
      .stats-overview {
        grid-template-columns: repeat(2, 1fr);
      }

      .charts-section,
      .totals-section {
        grid-template-columns: 1fr;
      }
    }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      * {
        transition-duration: 0.01ms !important;
      }
    }
  `
}
