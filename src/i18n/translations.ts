import * as vscode from 'vscode'

export type TranslationKey =
  | 'zenMode.title'
  | 'zenMode.enable'
  | 'zenMode.disable'
  | 'zenMode.toggles.title'
  | 'zenMode.toggles.lineNumbers'
  | 'zenMode.toggles.gutter'
  | 'zenMode.toggles.minimap'
  | 'zenMode.toggles.breadcrumbs'
  | 'zenMode.toggles.scrollbarVertical'
  | 'zenMode.toggles.scrollbarHorizontal'
  | 'zenMode.toggles.indentGuides'
  | 'zenMode.toggles.bracketPairs'
  | 'zenMode.toggles.rulers'
  | 'zenMode.toggles.activityBar'
  | 'zenMode.toggles.statusBar'
  | 'zenMode.toggles.sideBar'
  | 'zenMode.toggles.panel'
  | 'zenMode.toggles.tabs'
  | 'zenMode.toggles.cursorBlinking'
  | 'zenMode.toggles.renderWhitespace'
  | 'zenMode.toggles.lineHighlight'
  | 'pomodoro.title'
  | 'pomodoro.work'
  | 'pomodoro.break'
  | 'pomodoro.longBreak'
  | 'pomodoro.start'
  | 'pomodoro.pause'
  | 'pomodoro.stop'
  | 'pomodoro.reset'
  | 'pomodoro.skip'
  | 'pomodoro.sessions'
  | 'pomodoro.settings'
  | 'pomodoro.workDuration'
  | 'pomodoro.breakDuration'
  | 'pomodoro.longBreakDuration'
  | 'pomodoro.autoStart'
  | 'pomodoro.statusBarVisibility'
  | 'pomodoro.statusBarAlways'
  | 'pomodoro.statusBarAuto'
  | 'pomodoro.statusBarHidden'
  | 'pomodoro.progressBarPosition'
  | 'pomodoro.progressBarTop'
  | 'pomodoro.progressBarBottom'
  | 'pomodoro.progressBarHidden'
  | 'pomodoro.notifications'
  | 'pomodoro.soundEnabled'
  | 'presets.title'
  | 'presets.minimal'
  | 'presets.minimal.desc'
  | 'presets.writer'
  | 'presets.writer.desc'
  | 'presets.focus'
  | 'presets.focus.desc'
  | 'presets.custom'
  | 'presets.save'
  | 'presets.apply'
  | 'presets.delete'
  | 'presets.saveCustom'
  | 'presets.enterName'
  | 'settings.title'
  | 'info.settingsBackup'
  | 'statistics.title'
  | 'statistics.today'
  | 'statistics.sessions'
  | 'statistics.focusTime'
  | 'statistics.streak'
  | 'statistics.longestStreak'
  | 'statistics.week'
  | 'statistics.allTime'
  | 'statistics.days'
  | 'common.on'
  | 'common.off'
  | 'common.minutes'
  | 'common.enabled'
  | 'common.disabled'

type Translations = Record<TranslationKey, string>

const en: Translations = {
  'zenMode.title': 'Zen Mode',
  'zenMode.enable': 'Enable Zen Mode',
  'zenMode.disable': 'Disable Zen Mode',
  'zenMode.toggles.title': 'UI Elements',
  'zenMode.toggles.lineNumbers': 'Line Numbers',
  'zenMode.toggles.gutter': 'Gutter',
  'zenMode.toggles.minimap': 'Minimap',
  'zenMode.toggles.breadcrumbs': 'Breadcrumbs',
  'zenMode.toggles.scrollbarVertical': 'Vertical Scrollbar',
  'zenMode.toggles.scrollbarHorizontal': 'Horizontal Scrollbar',
  'zenMode.toggles.indentGuides': 'Indent Guides',
  'zenMode.toggles.bracketPairs': 'Bracket Pairs',
  'zenMode.toggles.rulers': 'Rulers',
  'zenMode.toggles.activityBar': 'Activity Bar',
  'zenMode.toggles.statusBar': 'Status Bar',
  'zenMode.toggles.sideBar': 'Side Bar',
  'zenMode.toggles.panel': 'Panel',
  'zenMode.toggles.tabs': 'Tabs',
  'zenMode.toggles.cursorBlinking': 'Cursor Blinking',
  'zenMode.toggles.renderWhitespace': 'Render Whitespace',
  'zenMode.toggles.lineHighlight': 'Line Highlight',
  'pomodoro.title': 'Pomodoro Timer',
  'pomodoro.work': 'Work',
  'pomodoro.break': 'Break',
  'pomodoro.longBreak': 'Long Break',
  'pomodoro.start': 'Start',
  'pomodoro.pause': 'Pause',
  'pomodoro.stop': 'Stop',
  'pomodoro.reset': 'Reset',
  'pomodoro.skip': 'Skip',
  'pomodoro.sessions': 'Sessions',
  'pomodoro.settings': 'Timer Settings',
  'pomodoro.workDuration': 'Work Duration',
  'pomodoro.breakDuration': 'Break Duration',
  'pomodoro.longBreakDuration': 'Long Break Duration',
  'pomodoro.autoStart': 'Auto-start Next Session',
  'pomodoro.statusBarVisibility': 'Status Bar Timer',
  'pomodoro.statusBarAlways': 'Always',
  'pomodoro.statusBarAuto': 'Auto',
  'pomodoro.statusBarHidden': 'Hidden',
  'pomodoro.progressBarPosition': 'Progress Bar Position',
  'pomodoro.progressBarTop': 'Top',
  'pomodoro.progressBarBottom': 'Bottom',
  'pomodoro.progressBarHidden': 'Hidden',
  'pomodoro.notifications': 'Notifications',
  'pomodoro.soundEnabled': 'Sound Enabled',
  'presets.title': 'Presets',
  'presets.minimal': 'Minimal',
  'presets.minimal.desc': 'Hide everything for maximum focus',
  'presets.writer': 'Writer',
  'presets.writer.desc': 'Clean view with cursor and scrollbar',
  'presets.focus': 'Focus',
  'presets.focus.desc': 'Keep code aids, hide distractions',
  'presets.custom': 'Custom',
  'presets.save': 'Save',
  'presets.apply': 'Apply',
  'presets.delete': 'Delete',
  'presets.saveCustom': 'Save Custom Preset',
  'presets.enterName': 'Enter preset name',
  'settings.title': 'Settings',
  'info.settingsBackup':
    'Your editor settings are automatically saved when enabling Zen Mode and restored when disabling it.',
  'statistics.title': 'Focus Statistics',
  'statistics.today': 'Today',
  'statistics.sessions': 'Sessions',
  'statistics.focusTime': 'Focus Time',
  'statistics.streak': 'Current Streak',
  'statistics.longestStreak': 'Longest Streak',
  'statistics.week': 'This Week',
  'statistics.allTime': 'All Time',
  'statistics.days': 'days',
  'common.on': 'On',
  'common.off': 'Off',
  'common.minutes': 'min',
  'common.enabled': 'Enabled',
  'common.disabled': 'Disabled'
}

const es: Translations = {
  'zenMode.title': 'Modo Zen',
  'zenMode.enable': 'Activar Modo Zen',
  'zenMode.disable': 'Desactivar Modo Zen',
  'zenMode.toggles.title': 'Elementos de UI',
  'zenMode.toggles.lineNumbers': 'Numeros de linea',
  'zenMode.toggles.gutter': 'Margen',
  'zenMode.toggles.minimap': 'Minimapa',
  'zenMode.toggles.breadcrumbs': 'Migas de pan',
  'zenMode.toggles.scrollbarVertical': 'Barra de desplazamiento vertical',
  'zenMode.toggles.scrollbarHorizontal': 'Barra de desplazamiento horizontal',
  'zenMode.toggles.indentGuides': 'Guias de sangria',
  'zenMode.toggles.bracketPairs': 'Pares de corchetes',
  'zenMode.toggles.rulers': 'Reglas',
  'zenMode.toggles.activityBar': 'Barra de actividad',
  'zenMode.toggles.statusBar': 'Barra de estado',
  'zenMode.toggles.sideBar': 'Barra lateral',
  'zenMode.toggles.panel': 'Panel',
  'zenMode.toggles.tabs': 'Pestanas',
  'zenMode.toggles.cursorBlinking': 'Parpadeo del cursor',
  'zenMode.toggles.renderWhitespace': 'Mostrar espacios',
  'zenMode.toggles.lineHighlight': 'Resaltado de linea',
  'pomodoro.title': 'Temporizador Pomodoro',
  'pomodoro.work': 'Trabajo',
  'pomodoro.break': 'Descanso',
  'pomodoro.longBreak': 'Descanso largo',
  'pomodoro.start': 'Iniciar',
  'pomodoro.pause': 'Pausar',
  'pomodoro.stop': 'Detener',
  'pomodoro.reset': 'Reiniciar',
  'pomodoro.skip': 'Saltar',
  'pomodoro.sessions': 'Sesiones',
  'pomodoro.settings': 'Configuracion del temporizador',
  'pomodoro.workDuration': 'Duracion del trabajo',
  'pomodoro.breakDuration': 'Duracion del descanso',
  'pomodoro.longBreakDuration': 'Duracion del descanso largo',
  'pomodoro.autoStart': 'Iniciar siguiente sesion automaticamente',
  'pomodoro.statusBarVisibility': 'Temporizador en barra de estado',
  'pomodoro.statusBarAlways': 'Siempre',
  'pomodoro.statusBarAuto': 'Automatico',
  'pomodoro.statusBarHidden': 'Oculto',
  'pomodoro.progressBarPosition': 'Posicion de la barra de progreso',
  'pomodoro.progressBarTop': 'Arriba',
  'pomodoro.progressBarBottom': 'Abajo',
  'pomodoro.progressBarHidden': 'Oculta',
  'pomodoro.notifications': 'Notificaciones',
  'pomodoro.soundEnabled': 'Sonido activado',
  'presets.title': 'Ajustes predefinidos',
  'presets.minimal': 'Minimo',
  'presets.minimal.desc': 'Oculta todo para maxima concentracion',
  'presets.writer': 'Escritor',
  'presets.writer.desc': 'Vista limpia con cursor y scrollbar',
  'presets.focus': 'Enfoque',
  'presets.focus.desc': 'Mantiene ayudas de codigo, oculta distracciones',
  'presets.custom': 'Personalizado',
  'presets.save': 'Guardar',
  'presets.apply': 'Aplicar',
  'presets.delete': 'Eliminar',
  'presets.saveCustom': 'Guardar ajuste personalizado',
  'presets.enterName': 'Ingrese el nombre del ajuste',
  'settings.title': 'Configuracion',
  'info.settingsBackup':
    'La configuracion del editor se guarda automaticamente al activar el Modo Zen y se restaura al desactivarlo.',
  'statistics.title': 'Estadisticas de Enfoque',
  'statistics.today': 'Hoy',
  'statistics.sessions': 'Sesiones',
  'statistics.focusTime': 'Tiempo de Enfoque',
  'statistics.streak': 'Racha Actual',
  'statistics.longestStreak': 'Racha Mas Larga',
  'statistics.week': 'Esta Semana',
  'statistics.allTime': 'Todo el Tiempo',
  'statistics.days': 'dias',
  'common.on': 'Activado',
  'common.off': 'Desactivado',
  'common.minutes': 'min',
  'common.enabled': 'Activado',
  'common.disabled': 'Desactivado'
}

const translations: Record<string, Translations> = {
  en,
  es
}

let currentLanguage = 'en'

export function initializeTranslations(): void {
  const vscodeLanguage = vscode.env.language
  currentLanguage = vscodeLanguage.startsWith('es') ? 'es' : 'en'
}

export function t(key: TranslationKey): string {
  return translations[currentLanguage]?.[key] ?? translations['en'][key] ?? key
}

export function getCurrentLanguage(): string {
  return currentLanguage
}

export function getAllTranslations(): Translations {
  return translations[currentLanguage] ?? translations['en']
}
