import * as vscode from 'vscode'
import { ZenModeSettings, ZenModeToggle } from '../logic/zenModeManager'
import {
  PomodoroSettings,
  PomodoroState,
  PomodoroPhase
} from '../logic/pomodoroTimer'
import { Preset } from '../logic/presetManager'
import { t, getAllTranslations, TranslationKey } from '../i18n/translations'

export type TimerVisibility = 'always' | 'auto' | 'hidden'

export interface WebviewData {
  zenEnabled: boolean
  zenSettings: ZenModeSettings
  toggles: ZenModeToggle[]
  pomodoroState: PomodoroState
  pomodoroSettings: PomodoroSettings
  presets: Preset[]
  activePresetId: string | null
  formattedTime: string
  progress: number
  timerVisibility: TimerVisibility
}

export function buildWebviewHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  data: WebviewData
): string {
  const nonce = getNonce()
  const translations = getAllTranslations()
  const codiconsUri = webview.asWebviewUri(
    vscode.Uri.joinPath(
      extensionUri,
      'node_modules',
      '@vscode/codicons',
      'dist',
      'codicon.css'
    )
  )

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
  <title>${t('zenMode.title')}</title>
  <link href="${codiconsUri}" rel="stylesheet" />
  <style>
    ${getStyles()}
  </style>
</head>
<body>
  <div class="container" role="main">
    ${buildHeader(data)}
    <div class="info-banner" role="note" aria-label="Information">
      <span class="codicon codicon-info"></span>
      <span>${t('info.settingsBackup')}</span>
    </div>
    <div class="main-content">
      <div class="left-column">
        ${buildPomodoroSection(data)}
        ${buildPresetsSection(data)}
      </div>
      <div class="right-column">
        ${buildTogglesSection(data)}
      </div>
    </div>
  </div>
  <script nonce="${nonce}">
    ${getScript(translations, data)}
  </script>
</body>
</html>`
}

function getNonce(): string {
  let text = ''
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
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
      --border-radius: 6px;
      --spacing-xs: 4px;
      --spacing-sm: 8px;
      --spacing-md: 12px;
      --spacing-lg: 16px;
      --spacing-xl: 24px;
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
      min-width: 520px;
    }

    .container {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-lg);
      max-width: 680px;
      margin: 0 auto;
    }

    /* Header */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-md) var(--spacing-lg);
      background: var(--vscode-sideBar-background);
      border-radius: var(--border-radius);
      border: 1px solid var(--vscode-widget-border);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
    }

    .header h1 {
      font-size: 16px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .zen-status {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }

    .zen-status.active {
      color: var(--vscode-charts-green);
    }

    /* Two-column layout */
    .main-content {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--spacing-xl);
    }

    .left-column,
    .right-column {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-lg);
    }

    /* Toggle Switch */
    .toggle-switch {
      position: relative;
      width: 40px;
      height: 22px;
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 11px;
      cursor: pointer;
      transition: all var(--transition-fast);
      flex-shrink: 0;
    }

    .toggle-switch:hover {
      border-color: var(--vscode-focusBorder);
    }

    .toggle-switch:focus {
      outline: 2px solid var(--vscode-focusBorder);
      outline-offset: 2px;
    }

    .toggle-switch::after {
      content: '';
      position: absolute;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--vscode-foreground);
      top: 2px;
      left: 2px;
      transition: transform var(--transition-fast);
      opacity: 0.6;
    }

    .toggle-switch.active {
      background: var(--vscode-button-background);
      border-color: var(--vscode-button-background);
    }

    .toggle-switch.active::after {
      transform: translateX(18px);
      background: var(--vscode-button-foreground);
      opacity: 1;
    }

    /* Cards */
    .card {
      background: var(--vscode-sideBar-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: var(--border-radius);
      overflow: hidden;
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-md) var(--spacing-lg);
      background: var(--vscode-sideBarSectionHeader-background);
      border-bottom: 1px solid var(--vscode-widget-border);
    }

    .card-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--vscode-sideBarSectionHeader-foreground);
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
    }

    .card-content {
      padding: var(--spacing-lg);
    }

    /* Pomodoro Section */
    .pomodoro-display {
      text-align: center;
      padding: var(--spacing-md) 0 var(--spacing-lg);
    }

    .pomodoro-phase {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: var(--spacing-xs);
    }

    .pomodoro-phase.work { color: var(--vscode-charts-blue); }
    .pomodoro-phase.break { color: var(--vscode-charts-green); }
    .pomodoro-phase.longBreak { color: var(--vscode-charts-purple); }

    .pomodoro-time {
      font-size: 42px;
      font-weight: 200;
      font-variant-numeric: tabular-nums;
      letter-spacing: 3px;
      line-height: 1;
    }

    .pomodoro-sessions {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      margin-top: var(--spacing-md);
    }

    .pomodoro-controls {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: var(--spacing-sm);
      margin-top: var(--spacing-lg);
    }

    /* Buttons */
    .btn {
      padding: var(--spacing-sm) var(--spacing-md);
      border: none;
      border-radius: var(--border-radius);
      cursor: pointer;
      font-size: 12px;
      font-family: inherit;
      font-weight: 500;
      transition: all var(--transition-fast);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-xs);
      min-height: 32px;
    }

    .btn:focus {
      outline: 2px solid var(--vscode-focusBorder);
      outline-offset: 2px;
    }

    .btn-primary {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      min-width: 90px;
    }

    .btn-primary:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .btn-secondary {
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      min-width: 70px;
    }

    .btn-secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }

    .btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    /* Timer Settings - Always visible, collapsible */
    .timer-settings {
      margin-top: var(--spacing-lg);
      padding-top: var(--spacing-md);
      border-top: 1px solid var(--vscode-widget-border);
    }

    .timer-settings-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      padding: var(--spacing-sm) 0;
      user-select: none;
    }

    .timer-settings-header:hover {
      color: var(--vscode-textLink-foreground);
    }

    .timer-settings-title {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
    }

    .timer-settings-content {
      overflow: hidden;
      transition: max-height var(--transition-normal), opacity var(--transition-normal);
    }

    .timer-settings-content.collapsed {
      max-height: 0 !important;
      opacity: 0;
    }

    .settings-grid {
      display: grid;
      gap: var(--spacing-sm);
      padding-top: var(--spacing-md);
    }

    .settings-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-xs) 0;
    }

    .settings-label {
      font-size: 12px;
      color: var(--vscode-foreground);
    }

    .settings-control {
      display: flex;
      align-items: center;
      gap: var(--spacing-xs);
    }

    .settings-input {
      width: 56px;
      padding: var(--spacing-xs) var(--spacing-sm);
      border: 1px solid var(--vscode-input-border);
      border-radius: var(--border-radius);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      font-family: inherit;
      font-size: 12px;
      text-align: center;
    }

    .settings-input:focus {
      outline: none;
      border-color: var(--vscode-focusBorder);
    }

    .settings-unit {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
    }

    .settings-select {
      padding: var(--spacing-xs) var(--spacing-sm);
      border: 1px solid var(--vscode-input-border);
      border-radius: var(--border-radius);
      background: var(--vscode-dropdown-background);
      color: var(--vscode-dropdown-foreground);
      font-family: inherit;
      font-size: 12px;
      cursor: pointer;
    }

    .settings-select:focus {
      outline: none;
      border-color: var(--vscode-focusBorder);
    }

    /* Toggle List */
    .toggle-list {
      display: flex;
      flex-direction: column;
    }

    .toggle-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-sm) var(--spacing-xs);
      border-radius: var(--border-radius);
      transition: background var(--transition-fast);
    }

    .toggle-item:hover {
      background: var(--vscode-list-hoverBackground);
    }

    .toggle-label {
      font-size: 12px;
    }

    /* Compact toggle for list items */
    .toggle-switch-sm {
      width: 32px;
      height: 18px;
      border-radius: 9px;
    }

    .toggle-switch-sm::after {
      width: 12px;
      height: 12px;
      top: 2px;
      left: 2px;
    }

    .toggle-switch-sm.active::after {
      transform: translateX(14px);
    }

    /* Preset List */
    .preset-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs);
    }

    .preset-item {
      position: relative;
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-md);
      padding-right: 36px;
      border-radius: var(--border-radius);
      cursor: pointer;
      transition: all var(--transition-fast);
      border: 1px solid transparent;
    }

    .preset-item:hover {
      background: var(--vscode-list-hoverBackground);
    }

    .preset-item:focus {
      outline: 2px solid var(--vscode-focusBorder);
      outline-offset: -2px;
    }

    .preset-item.active {
      background: var(--vscode-list-activeSelectionBackground);
      color: var(--vscode-list-activeSelectionForeground);
      border-color: var(--vscode-focusBorder);
    }

    .preset-icon {
      font-size: 14px;
      opacity: 0.7;
    }

    .preset-item.active .preset-icon {
      opacity: 1;
    }

    .preset-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .preset-name {
      font-size: 12px;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 180px;
    }

    .preset-desc {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      opacity: 0.8;
    }

    .preset-item.active .preset-desc {
      color: var(--vscode-list-activeSelectionForeground);
      opacity: 0.7;
    }

    .preset-badge {
      font-size: 9px;
      padding: 2px 6px;
      border-radius: 10px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .preset-actions {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      opacity: 0;
      transition: opacity 0.15s ease;
    }

    .preset-item:hover .preset-actions,
    .preset-item:focus-within .preset-actions {
      opacity: 1;
    }

    .preset-delete-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      padding: 0;
      background: transparent;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      color: var(--vscode-foreground);
      opacity: 0.5;
      transition: all 0.15s ease;
    }

    .preset-delete-btn:hover {
      opacity: 1;
      color: var(--vscode-errorForeground, #f48771);
      background: color-mix(in srgb, var(--vscode-errorForeground, #f48771) 15%, transparent);
    }

    .preset-delete-btn:focus {
      outline: 1px solid var(--vscode-focusBorder);
      outline-offset: 1px;
    }

    .preset-delete-btn svg {
      width: 14px;
      height: 14px;
      fill: currentColor;
    }


    .save-preset-btn {
      margin-top: var(--spacing-md);
      width: 100%;
    }

    /* Chevron animation */
    .chevron {
      transition: transform var(--transition-fast);
    }

    .chevron.collapsed {
      transform: rotate(-90deg);
    }

    /* Accessibility */
    @media (prefers-reduced-motion: reduce) {
      * {
        transition-duration: 0.01ms !important;
      }
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    /* Info Banner */
    .info-banner {
      display: flex;
      align-items: flex-start;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-md);
      background: var(--vscode-editorInfo-background, rgba(75, 156, 211, 0.1));
      border-radius: var(--border-radius);
      border-left: 3px solid var(--vscode-editorInfo-foreground, #3794ff);
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      line-height: 1.4;
    }

    .info-banner .codicon {
      color: var(--vscode-editorInfo-foreground, #3794ff);
      flex-shrink: 0;
      margin-top: 1px;
    }

    /* Responsive */
    @media (max-width: 560px) {
      .main-content {
        grid-template-columns: 1fr;
      }

      body {
        min-width: auto;
        padding: var(--spacing-md);
      }
    }
  `
}

function buildHeader(data: WebviewData): string {
  return `
    <div class="header">
      <div class="header-left">
        <h1>
          <span class="codicon codicon-eye"></span>
          ${t('zenMode.title')}
        </h1>
        <span class="zen-status ${data.zenEnabled ? 'active' : ''}" id="zen-status">
          ${data.zenEnabled ? 'Active' : 'Inactive'}
        </span>
      </div>
      <button class="toggle-switch ${data.zenEnabled ? 'active' : ''}"
              id="zen-toggle"
              role="switch"
              aria-checked="${data.zenEnabled}"
              aria-label="${data.zenEnabled ? t('zenMode.disable') : t('zenMode.enable')}"
              title="${data.zenEnabled ? t('zenMode.disable') : t('zenMode.enable')}"
              tabindex="0">
      </button>
    </div>
  `
}

function buildPomodoroSection(data: WebviewData): string {
  const { pomodoroState: state, pomodoroSettings: settings } = data
  const phaseLabels: Record<PomodoroPhase, TranslationKey> = {
    work: 'pomodoro.work',
    break: 'pomodoro.break',
    longBreak: 'pomodoro.longBreak',
    idle: 'pomodoro.work'
  }

  return `
    <div class="card">
      <div class="card-header">
        <span class="card-title">
          <span class="codicon codicon-clock"></span>
          ${t('pomodoro.title')}
        </span>
      </div>
      <div class="card-content">
        <div class="pomodoro-display">
          <div class="pomodoro-phase ${state.phase}" id="pomodoro-phase">${t(phaseLabels[state.phase])}</div>
          <div class="pomodoro-time" id="pomodoro-time" aria-live="polite" aria-atomic="true">${data.formattedTime}</div>
          <div class="pomodoro-sessions">${t('pomodoro.sessions')}: <span id="pomodoro-sessions">${state.completedSessions}</span></div>
        </div>

        <div class="pomodoro-controls">
          ${
            state.isRunning
              ? `<button class="btn btn-primary" id="pomodoro-pause" title="${t('pomodoro.pause')}" aria-label="${t('pomodoro.pause')}">
                  <span class="codicon codicon-debug-pause"></span>
                  ${t('pomodoro.pause')}
                </button>`
              : `<button class="btn btn-primary" id="pomodoro-start" title="${t('pomodoro.start')}" aria-label="${t('pomodoro.start')}">
                  <span class="codicon codicon-play"></span>
                  ${t('pomodoro.start')}
                </button>`
          }
          <button class="btn btn-secondary"
                  id="pomodoro-stop"
                  title="${t('pomodoro.stop')}"
                  aria-label="${t('pomodoro.stop')}"
                  ${state.phase === 'idle' ? 'disabled' : ''}>
            <span class="codicon codicon-debug-stop"></span>
            ${t('pomodoro.stop')}
          </button>
          <button class="btn btn-secondary"
                  id="pomodoro-skip"
                  title="${t('pomodoro.skip')}"
                  aria-label="${t('pomodoro.skip')}"
                  ${state.phase === 'idle' ? 'disabled' : ''}>
            <span class="codicon codicon-chevron-right"></span>
            ${t('pomodoro.skip')}
          </button>
        </div>

        <div class="timer-settings">
          <div class="timer-settings-header" id="timer-settings-toggle" tabindex="0" role="button" aria-expanded="false">
            <span class="timer-settings-title">
              <span class="codicon codicon-settings-gear"></span>
              ${t('pomodoro.settings')}
            </span>
            <span class="codicon codicon-chevron-down chevron collapsed" id="timer-settings-chevron"></span>
          </div>
          <div class="timer-settings-content collapsed" id="timer-settings-content">
            <div class="settings-grid">
              <div class="settings-row">
                <label class="settings-label" for="work-duration">${t('pomodoro.workDuration')}</label>
                <div class="settings-control">
                  <input type="number" id="work-duration" class="settings-input"
                         value="${settings.workDuration}" min="1" max="120"
                         inputmode="numeric" pattern="[0-9]*">
                  <span class="settings-unit">${t('common.minutes')}</span>
                </div>
              </div>
              <div class="settings-row">
                <label class="settings-label" for="break-duration">${t('pomodoro.breakDuration')}</label>
                <div class="settings-control">
                  <input type="number" id="break-duration" class="settings-input"
                         value="${settings.breakDuration}" min="1" max="60"
                         inputmode="numeric" pattern="[0-9]*">
                  <span class="settings-unit">${t('common.minutes')}</span>
                </div>
              </div>
              <div class="settings-row">
                <label class="settings-label" for="long-break-duration">${t('pomodoro.longBreakDuration')}</label>
                <div class="settings-control">
                  <input type="number" id="long-break-duration" class="settings-input"
                         value="${settings.longBreakDuration}" min="1" max="120"
                         inputmode="numeric" pattern="[0-9]*">
                  <span class="settings-unit">${t('common.minutes')}</span>
                </div>
              </div>
              <div class="settings-row">
                <label class="settings-label" for="auto-start">${t('pomodoro.autoStart')}</label>
                <button class="toggle-switch toggle-switch-sm ${settings.autoStart ? 'active' : ''}"
                        id="auto-start"
                        role="switch"
                        aria-checked="${settings.autoStart}"
                        title="${t('pomodoro.autoStart')}">
                </button>
              </div>
              <div class="settings-row">
                <label class="settings-label" for="timer-visibility">${t('pomodoro.statusBarVisibility')}</label>
                <select id="timer-visibility" class="settings-select" title="${t('pomodoro.statusBarVisibility')}">
                  <option value="always" ${data.timerVisibility === 'always' ? 'selected' : ''}>${t('pomodoro.statusBarAlways')}</option>
                  <option value="auto" ${data.timerVisibility === 'auto' ? 'selected' : ''}>${t('pomodoro.statusBarAuto')}</option>
                  <option value="hidden" ${data.timerVisibility === 'hidden' ? 'selected' : ''}>${t('pomodoro.statusBarHidden')}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
}

function buildTogglesSection(data: WebviewData): string {
  const toggleItems = data.toggles
    .map((toggle) => {
      const isEnabled = data.zenSettings[toggle.id as keyof ZenModeSettings]
      return `
        <div class="toggle-item">
          <span class="toggle-label">${t(toggle.label as TranslationKey)}</span>
          <button class="toggle-switch toggle-switch-sm ${isEnabled ? 'active' : ''}"
                  data-toggle-id="${toggle.id}"
                  role="switch"
                  aria-checked="${isEnabled}"
                  aria-label="${t(toggle.label as TranslationKey)}"
                  title="${isEnabled ? 'Show' : 'Hide'} ${t(toggle.label as TranslationKey)}"
                  tabindex="0">
          </button>
        </div>
      `
    })
    .join('')

  return `
    <div class="card">
      <div class="card-header">
        <span class="card-title">
          <span class="codicon codicon-layout"></span>
          ${t('zenMode.toggles.title')}
        </span>
      </div>
      <div class="card-content">
        <div class="toggle-list">
          ${toggleItems}
        </div>
      </div>
    </div>
  `
}

function buildPresetsSection(data: WebviewData): string {
  const presetDescriptions: Record<string, TranslationKey> = {
    minimal: 'presets.minimal.desc',
    writer: 'presets.writer.desc',
    focus: 'presets.focus.desc'
  }

  const presetItems = data.presets
    .map((preset) => {
      const isActive = data.activePresetId === preset.id
      const icon = preset.isBuiltIn ? 'codicon-symbol-constant' : 'codicon-bookmark'
      const displayName = preset.isBuiltIn
        ? t(preset.name as TranslationKey)
        : preset.name
      const description = preset.isBuiltIn && presetDescriptions[preset.id]
        ? t(presetDescriptions[preset.id])
        : ''

      return `
        <div class="preset-item ${isActive ? 'active' : ''}"
             data-preset-id="${preset.id}"
             tabindex="0"
             role="option"
             aria-selected="${isActive}"
             title="${description || `Apply ${displayName} preset`}">
          <span class="preset-icon codicon ${icon}"></span>
          <div class="preset-info">
            <span class="preset-name">${displayName}</span>
            ${description ? `<span class="preset-desc">${description}</span>` : ''}
          </div>
          ${
            !preset.isBuiltIn
              ? `
            <div class="preset-actions">
              <button class="preset-delete-btn"
                      data-delete-preset="${preset.id}"
                      title="Delete ${displayName}"
                      aria-label="Delete ${displayName}">
                <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                  <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                </svg>
              </button>
            </div>
          `
              : ''
          }
        </div>
      `
    })
    .join('')

  return `
    <div class="card">
      <div class="card-header">
        <span class="card-title">
          <span class="codicon codicon-library"></span>
          ${t('presets.title')}
        </span>
      </div>
      <div class="card-content">
        <div class="preset-list" role="listbox" aria-label="${t('presets.title')}">
          ${presetItems}
        </div>
        <button class="btn btn-secondary save-preset-btn" id="save-preset" title="${t('presets.saveCustom')}">
          <span class="codicon codicon-save"></span>
          ${t('presets.saveCustom')}
        </button>
      </div>
    </div>
  `
}

function getScript(
  translations: Record<string, string>,
  initialData: WebviewData
): string {
  return `
    (function() {
      const vscode = acquireVsCodeApi();

      // Restore state if available
      const previousState = vscode.getState() || {};
      let settingsExpanded = previousState.settingsExpanded || false;

      // Initialize timer settings toggle state
      const settingsContent = document.getElementById('timer-settings-content');
      const settingsChevron = document.getElementById('timer-settings-chevron');
      const settingsToggle = document.getElementById('timer-settings-toggle');

      function updateSettingsVisibility() {
        if (settingsExpanded) {
          settingsContent.classList.remove('collapsed');
          settingsContent.style.maxHeight = settingsContent.scrollHeight + 'px';
          settingsChevron.classList.remove('collapsed');
          settingsToggle.setAttribute('aria-expanded', 'true');
        } else {
          settingsContent.classList.add('collapsed');
          settingsChevron.classList.add('collapsed');
          settingsToggle.setAttribute('aria-expanded', 'false');
        }
      }

      // Apply initial state
      updateSettingsVisibility();

      // Timer settings toggle (client-side only, no re-render)
      if (settingsToggle) {
        settingsToggle.addEventListener('click', () => {
          settingsExpanded = !settingsExpanded;
          vscode.setState({ ...previousState, settingsExpanded });
          updateSettingsVisibility();
        });

        settingsToggle.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            settingsToggle.click();
          }
        });
      }

      // Zen mode toggle
      const zenToggle = document.getElementById('zen-toggle');
      if (zenToggle) {
        zenToggle.addEventListener('click', () => {
          vscode.postMessage({ type: 'toggleZen' });
        });

        zenToggle.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            zenToggle.click();
          }
        });
      }

      // Toggle switches for UI elements
      document.querySelectorAll('[data-toggle-id]').forEach(toggle => {
        toggle.addEventListener('click', () => {
          const toggleId = toggle.getAttribute('data-toggle-id');
          const isActive = toggle.classList.contains('active');

          // Optimistic UI update
          toggle.classList.toggle('active');
          toggle.setAttribute('aria-checked', (!isActive).toString());

          vscode.postMessage({
            type: 'updateToggle',
            toggleId: toggleId,
            value: !isActive
          });
        });

        toggle.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle.click();
          }
        });
      });

      // Pomodoro controls
      document.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        if (target.id === 'pomodoro-start') {
          vscode.postMessage({ type: 'pomodoroStart' });
        } else if (target.id === 'pomodoro-pause') {
          vscode.postMessage({ type: 'pomodoroPause' });
        } else if (target.id === 'pomodoro-stop') {
          vscode.postMessage({ type: 'pomodoroStop' });
        } else if (target.id === 'pomodoro-skip') {
          vscode.postMessage({ type: 'pomodoroSkip' });
        } else if (target.id === 'pomodoro-reset') {
          vscode.postMessage({ type: 'pomodoroReset' });
        } else if (target.id === 'save-preset') {
          vscode.postMessage({ type: 'savePreset' });
        } else if (target.dataset.deletePreset) {
          e.stopPropagation();
          vscode.postMessage({ type: 'deletePreset', presetId: target.dataset.deletePreset });
        }
      });

      // Pomodoro settings - use blur instead of change to avoid too many updates
      const workDuration = document.getElementById('work-duration');
      const breakDuration = document.getElementById('break-duration');
      const longBreakDuration = document.getElementById('long-break-duration');
      const autoStart = document.getElementById('auto-start');

      // Validate and sanitize numeric input
      function sanitizeNumericInput(input, min, max, defaultVal) {
        let value = parseInt(input.value, 10);
        if (isNaN(value) || value < min) {
          value = min;
        } else if (value > max) {
          value = max;
        }
        input.value = value;
        return value;
      }

      function sendSettingsUpdate() {
        const work = sanitizeNumericInput(workDuration, 1, 120, 25);
        const brk = sanitizeNumericInput(breakDuration, 1, 60, 5);
        const longBrk = sanitizeNumericInput(longBreakDuration, 1, 120, 15);

        vscode.postMessage({
          type: 'updatePomodoroSettings',
          settings: {
            workDuration: work,
            breakDuration: brk,
            longBreakDuration: longBrk
          }
        });
      }

      // Only send on blur (when user leaves the field)
      [workDuration, breakDuration, longBreakDuration].forEach(input => {
        if (input) {
          // Prevent non-numeric input
          input.addEventListener('keypress', (e) => {
            if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab') {
              e.preventDefault();
            }
          });

          // Prevent paste of non-numeric content
          input.addEventListener('paste', (e) => {
            const paste = (e.clipboardData || window.clipboardData).getData('text');
            if (!/^[0-9]+$/.test(paste)) {
              e.preventDefault();
            }
          });

          input.addEventListener('blur', sendSettingsUpdate);
          input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              input.blur();
            }
          });
        }
      });

      if (autoStart) {
        autoStart.addEventListener('click', () => {
          const isActive = autoStart.classList.contains('active');
          autoStart.classList.toggle('active');
          autoStart.setAttribute('aria-checked', (!isActive).toString());
          vscode.postMessage({
            type: 'updatePomodoroSettings',
            settings: { autoStart: !isActive }
          });
        });

        autoStart.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            autoStart.click();
          }
        });
      }

      // Timer visibility setting
      const timerVisibility = document.getElementById('timer-visibility');
      if (timerVisibility) {
        timerVisibility.addEventListener('change', () => {
          vscode.postMessage({
            type: 'updateTimerVisibility',
            visibility: timerVisibility.value
          });
        });
      }

      // Presets
      document.querySelectorAll('.preset-item').forEach(item => {
        item.addEventListener('click', (e) => {
          if (e.target.closest('[data-delete-preset]')) return;
          const presetId = item.getAttribute('data-preset-id');
          vscode.postMessage({ type: 'applyPreset', presetId: presetId });
        });

        item.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!e.target.closest('[data-delete-preset]')) {
              item.click();
            }
          }
        });
      });

      // Handle messages from extension - update only what changed
      window.addEventListener('message', event => {
        const message = event.data;

        switch (message.type) {
          case 'updateTimer':
            const timeDisplay = document.getElementById('pomodoro-time');
            const phaseDisplay = document.getElementById('pomodoro-phase');
            const sessionsDisplay = document.getElementById('pomodoro-sessions');

            if (timeDisplay && message.formattedTime) {
              timeDisplay.textContent = message.formattedTime;
            }
            if (phaseDisplay && message.phase) {
              phaseDisplay.className = 'pomodoro-phase ' + message.phase;
            }
            if (sessionsDisplay && message.sessions !== undefined) {
              sessionsDisplay.textContent = message.sessions;
            }
            break;

          case 'updateZenStatus':
            const zenStatus = document.getElementById('zen-status');
            const zenToggleBtn = document.getElementById('zen-toggle');
            if (zenStatus) {
              zenStatus.textContent = message.enabled ? 'Active' : 'Inactive';
              zenStatus.classList.toggle('active', message.enabled);
            }
            if (zenToggleBtn) {
              zenToggleBtn.classList.toggle('active', message.enabled);
              zenToggleBtn.setAttribute('aria-checked', message.enabled.toString());
            }
            break;
        }
      });
    })();
  `
}
