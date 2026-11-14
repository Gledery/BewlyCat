import { ref } from 'vue'

import type { SettingsMenu, SettingsNavigationTarget } from '~/composables/useAppProvider'
import { settings } from '~/logic'
import { isInIframe } from '~/utils/main'
import { sendMessage } from '~/utils/messaging'

export const SETTINGS_PAGE_PATH = 'dist/options/index.html'

/** 后台 -> B 站页面：在页面内打开旧版设置浮层。 */
export const OPEN_SETTINGS_OVERLAY_MESSAGE = 'bewly-cat:settings-page:open-overlay'
/** B 站页面或工具栏 -> 后台：打开设置页，已打开时切换过去。 */
export const OPEN_SETTINGS_PAGE_MESSAGE = 'bewly-cat:settings-page:open'
/** 后台 -> 设置页：定位到指定设置项，并返回所在标签页。 */
export const NAVIGATE_SETTINGS_PAGE_MESSAGE = 'bewly-cat:settings-page:navigate'
/** 设置页 -> 后台 -> B 站标签页：执行依赖播放器或页面环境的操作。 */
export const BILIBILI_TAB_REQUEST_MESSAGE = 'bewly-cat:settings-page:bilibili-tab-request'

export interface SettingsPageTabLocation {
  tabId?: number
  windowId?: number
}

export type BilibiliTabRequest
  = | { action: 'applyPlaybackRate', rate: number }
    | { action: 'getEvolvedThemeColor' }

const MENU_SLUGS: Record<SettingsMenu, string> = {
  General: 'general',
  BewlyPages: 'bewly-pages',
  BewlyComponents: 'bewly-components',
  Bilibili: 'bilibili',
  Appearance: 'appearance',
  Shortcuts: 'shortcuts',
  Data: 'data',
  About: 'about',
}

const LOCATE_PARAM = 'locate'

function openSettingsPage(target?: SettingsNavigationTarget) {
  sendMessage(OPEN_SETTINGS_PAGE_MESSAGE, target).catch((error) => {
    console.error('[BewlyCat] 打开设置页失败:', error)
  })
}

/** 旧版应用内设置浮层的可见状态，由 App.vue 挂载的 SettingsOverlay 消费。 */
export const settingsOverlayVisible = ref(false)
/** 浮层打开时需要定位的设置项目标。 */
export const settingsOverlayTarget = ref<SettingsNavigationTarget | undefined>()

/**
 * 按 enableSettingsOverlay 开关分流：开启时在页面内弹出旧版设置浮层
 * （iframe 页面内不弹，避免在嵌入视图里挂载巨型组件），否则打开独立设置页。
 */
export function requestOpenSettings(target?: SettingsNavigationTarget) {
  if (settings.value.enableSettingsOverlay && !isInIframe()) {
    settingsOverlayTarget.value = target
    settingsOverlayVisible.value = true
    return
  }
  void openSettingsPage(target)
}

/** 按最近访问顺序交给 B 站标签页处理；没有页面能处理时返回 undefined。 */
export function requestBilibiliTab<R>(request: BilibiliTabRequest): Promise<R | undefined> {
  return sendMessage<BilibiliTabRequest, R | undefined>(BILIBILI_TAB_REQUEST_MESSAGE, request)
}

export function buildSettingsPageHash(target?: SettingsNavigationTarget): string {
  if (!target)
    return ''

  const path = [MENU_SLUGS[target.menu], target.secondaryPage].filter(Boolean).join('/')
  const query = target.targetTitleKey
    ? `?${LOCATE_PARAM}=${encodeURIComponent(target.targetTitleKey)}`
    : ''
  return `#/${path}${query}`
}

export function parseSettingsPageHash(hash: string): SettingsNavigationTarget | undefined {
  const match = hash.match(/^#\/([^?]*)(?:\?(.*))?$/)
  if (!match)
    return undefined

  const [menuSlug, secondaryPage] = match[1].split('/')
  const menu = (Object.keys(MENU_SLUGS) as SettingsMenu[]).find(key => MENU_SLUGS[key] === menuSlug)
  if (!menu)
    return undefined

  return {
    menu,
    secondaryPage: secondaryPage || undefined,
    targetTitleKey: new URLSearchParams(match[2]).get(LOCATE_PARAM) ?? undefined,
  }
}
