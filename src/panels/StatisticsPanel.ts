import * as vscode from 'vscode'
import { StatisticsManager } from '../logic/statisticsManager'
import { buildStatisticsHtml } from '../webview/statisticsHtmlBuilder'
import { t } from '../i18n/translations'
import { debounce } from '../utils/throttle'

export class StatisticsPanel {
  public static currentPanel: StatisticsPanel | undefined
  private static readonly viewType = 'harmoniaZenStatistics'

  private readonly panel: vscode.WebviewPanel
  private readonly extensionUri: vscode.Uri
  private readonly statisticsManager: StatisticsManager
  private disposables: vscode.Disposable[] = []

  private debouncedUpdate = debounce(() => {
    this.updateWebview()
  }, 100)

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    statisticsManager: StatisticsManager
  ) {
    this.panel = panel
    this.extensionUri = extensionUri
    this.statisticsManager = statisticsManager

    this.updateWebview()
    this.setupListeners()
  }

  public static createOrShow(
    extensionUri: vscode.Uri,
    statisticsManager: StatisticsManager
  ): StatisticsPanel {
    const column = vscode.ViewColumn.Active

    if (StatisticsPanel.currentPanel) {
      StatisticsPanel.currentPanel.panel.reveal(column)
      StatisticsPanel.currentPanel.updateWebview()
      return StatisticsPanel.currentPanel
    }

    const panel = vscode.window.createWebviewPanel(
      StatisticsPanel.viewType,
      t('statistics.title'),
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

    StatisticsPanel.currentPanel = new StatisticsPanel(
      panel,
      extensionUri,
      statisticsManager
    )

    return StatisticsPanel.currentPanel
  }

  private setupListeners(): void {
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables)

    // Update when statistics change
    this.statisticsManager.onStatsChange(() => {
      this.debouncedUpdate()
    })
  }

  private updateWebview(): void {
    this.panel.webview.html = buildStatisticsHtml(
      this.panel.webview,
      this.extensionUri,
      this.statisticsManager
    )
  }

  public dispose(): void {
    StatisticsPanel.currentPanel = undefined

    this.panel.dispose()

    while (this.disposables.length) {
      const disposable = this.disposables.pop()
      if (disposable) {
        disposable.dispose()
      }
    }
  }
}
