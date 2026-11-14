import type { App, Plugin } from 'vue'

const componentModules: Record<string, { default: Component }> = import.meta.glob(
  // 独立设置页在扩展页面中显式引入，不打进 B 站页面的内容脚本；
  // SettingsOverlay 是页面内设置浮层外壳，需要保留在内容脚本里。
  ['./*.vue', './*/*.vue', '!./Settings/Settings.vue'],
  { eager: true },
)

export default {
  install: (app: App) => {
    for (const path in componentModules) {
      const splitPath = path.split('/')
      const name = splitPath[splitPath.length - 1].replace('.vue', '').replace('.ts', '')
      app.component(name, componentModules[path].default)
    }
  },
} as Plugin
