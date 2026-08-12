export type Locale = 'en' | 'zh-CN'

export const LOCALES: { id: Locale; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'zh-CN', label: '简体中文' },
]

const en = {
  'menu.file': 'File',
  'menu.edit': 'Edit',
  'menu.view': 'View',
  'menu.theme': 'Theme',
  'menu.help': 'Help',

  'file.new': 'New',
  'file.openFile': 'Open File…',
  'file.openFolder': 'Open Folder…',
  'file.save': 'Save',
  'file.saveAs': 'Save As…',
  'file.exportHtml': 'Export HTML…',
  'file.exportPdf': 'Export PDF…',
  'file.settings': 'Settings…',
  'file.quit': 'Quit',
  'file.clearRecent': 'Clear Recent Files',

  'edit.bold': 'Bold',
  'edit.italic': 'Italic',
  'edit.strikethrough': 'Strikethrough',
  'edit.inlineCode': 'Inline Code',
  'edit.insertLink': 'Insert Link',
  'edit.insertImage': 'Insert Image',
  'edit.heading1': 'Heading 1',
  'edit.heading2': 'Heading 2',
  'edit.heading3': 'Heading 3',
  'edit.paragraph': 'Paragraph',
  'edit.quote': 'Quote',
  'edit.bulletedList': 'Bulleted List',
  'edit.numberedList': 'Numbered List',
  'edit.table': 'Table',
  'edit.tableAddRow': 'Add Row',
  'edit.tableDelRow': 'Delete Row',
  'edit.tableAddCol': 'Add Column',
  'edit.tableDelCol': 'Delete Column',
  'edit.codeBlock': 'Code Block',
  'edit.mathBlock': 'Math Block',
  'edit.horizontalRule': 'Horizontal Rule',
  'edit.findReplace': 'Find / Replace',

  'view.toggleSidebar': 'Toggle Sidebar',
  'view.sourceMode': 'Source Mode',

  'help.about': 'About yfmd',
  'about.version': 'Version',
  'about.tagline': 'A Typora-style markdown editor',
  'about.license': 'License',
  'about.close': 'Close',

  'status.untitled': 'untitled',
  'status.unsaved': 'unsaved changes',
  'status.source': 'SOURCE',

  'confirm.title': 'Save changes to {name}?',
  'confirm.save': 'Save',
  'confirm.dontSave': "Don't Save",
  'confirm.cancel': 'Cancel',

  'sidebar.files': 'Files',
  'sidebar.outline': 'Outline',
  'sidebar.openFolder': 'Open a folder to browse files.',
  'sidebar.newFile': 'New File',
  'sidebar.newFolder': 'New Folder',
  'sidebar.rename': 'Rename',
  'sidebar.delete': 'Delete',
  'outline.empty': 'No headings yet.',
  'outline.untitled': '(untitled)',

  'settings.title': 'Settings',
  'settings.theme': 'Theme',
  'settings.language': 'Language',
  'settings.editorFont': 'Editor font',
  'settings.codeFont': 'Code font',
  'settings.maxWidth': 'Max text width',
  'settings.sideMargin': 'Side margins',
  'settings.fontSize': 'Font size',
  'settings.lineHeight': 'Line height',
  'settings.autosave': 'Autosave',
  'settings.sidebarOpensOn': 'Sidebar opens on',

  'toast.exported': 'Exported to {path}',
  'toast.exportFailed': 'Export failed: {error}',
  'toast.closeTab': 'Close the browser tab to quit',
  'toast.openFailed': 'Could not open file: {error}',
  'toast.saveFailed': 'Could not save: {error}',
  'toast.openFolderFailed': 'Could not open folder: {error}',
  'toast.createFailed': 'Could not create: {error}',
  'toast.renameFailed': 'Could not rename: {error}',
  'toast.deleteFailed': 'Could not delete: {error}',
} as const

export type MessageKey = keyof typeof en

// `Record<MessageKey, string>` forces zh-CN to carry every key the English
// dictionary defines; a missing translation fails typecheck.
const zhCN: Record<MessageKey, string> = {
  'menu.file': '文件',
  'menu.edit': '编辑',
  'menu.view': '视图',
  'menu.theme': '主题',
  'menu.help': '帮助',

  'file.new': '新建',
  'file.openFile': '打开文件…',
  'file.openFolder': '打开文件夹…',
  'file.save': '保存',
  'file.saveAs': '另存为…',
  'file.exportHtml': '导出 HTML…',
  'file.exportPdf': '导出 PDF…',
  'file.settings': '设置…',
  'file.quit': '退出',
  'file.clearRecent': '清除最近文件',

  'edit.bold': '粗体',
  'edit.italic': '斜体',
  'edit.strikethrough': '删除线',
  'edit.inlineCode': '行内代码',
  'edit.insertLink': '插入链接',
  'edit.insertImage': '插入图片',
  'edit.heading1': '一级标题',
  'edit.heading2': '二级标题',
  'edit.heading3': '三级标题',
  'edit.paragraph': '正文',
  'edit.quote': '引用',
  'edit.bulletedList': '无序列表',
  'edit.numberedList': '有序列表',
  'edit.table': '表格',
  'edit.tableAddRow': '添加行',
  'edit.tableDelRow': '删除行',
  'edit.tableAddCol': '添加列',
  'edit.tableDelCol': '删除列',
  'edit.codeBlock': '代码块',
  'edit.mathBlock': '数学公式',
  'edit.horizontalRule': '水平分割线',
  'edit.findReplace': '查找 / 替换',

  'view.toggleSidebar': '切换侧边栏',
  'view.sourceMode': '源码模式',

  'help.about': '关于 yfmd',
  'about.version': '版本',
  'about.tagline': '一款 Typora 风格的 Markdown 编辑器',
  'about.license': '许可证',
  'about.close': '关闭',

  'status.untitled': '未命名',
  'status.unsaved': '未保存的更改',
  'status.source': '源码',

  'confirm.title': '保存对 {name} 的更改？',
  'confirm.save': '保存',
  'confirm.dontSave': '不保存',
  'confirm.cancel': '取消',

  'sidebar.files': '文件',
  'sidebar.outline': '大纲',
  'sidebar.openFolder': '打开文件夹以浏览文件。',
  'sidebar.newFile': '新建文件',
  'sidebar.newFolder': '新建文件夹',
  'sidebar.rename': '重命名',
  'sidebar.delete': '删除',
  'outline.empty': '暂无标题',
  'outline.untitled': '（未命名）',

  'settings.title': '设置',
  'settings.theme': '主题',
  'settings.language': '语言',
  'settings.editorFont': '编辑器字体',
  'settings.codeFont': '代码字体',
  'settings.maxWidth': '最大文本宽度',
  'settings.sideMargin': '侧边距',
  'settings.fontSize': '字号',
  'settings.lineHeight': '行高',
  'settings.autosave': '自动保存',
  'settings.sidebarOpensOn': '侧边栏默认显示',

  'toast.exported': '已导出到 {path}',
  'toast.exportFailed': '导出失败：{error}',
  'toast.closeTab': '关闭浏览器标签页以退出',
  'toast.openFailed': '无法打开文件：{error}',
  'toast.saveFailed': '无法保存：{error}',
  'toast.openFolderFailed': '无法打开文件夹：{error}',
  'toast.createFailed': '无法创建：{error}',
  'toast.renameFailed': '无法重命名：{error}',
  'toast.deleteFailed': '无法删除：{error}',
}

const MESSAGES: Record<Locale, Record<MessageKey, string>> = { en, 'zh-CN': zhCN }

let currentLocale: Locale = 'en'

export function setLocale(locale: Locale): void {
  currentLocale = locale
}

export function getLocale(): Locale {
  return currentLocale
}

/** Pure translation helper (locale passed explicitly) — the unit-testable core. */
export function translate(
  locale: Locale,
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  const template = MESSAGES[locale]?.[key] ?? en[key] ?? key
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    params[name] !== undefined ? String(params[name]) : `{${name}}`,
  )
}

/** Translate for the current locale (module state, set from Settings). */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  return translate(currentLocale, key, params)
}
