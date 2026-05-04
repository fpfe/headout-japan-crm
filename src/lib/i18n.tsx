'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

/* ------------------------------------------------------------------ */
/*  Locale type                                                        */
/* ------------------------------------------------------------------ */

export type Locale = 'en' | 'ja'

/* ------------------------------------------------------------------ */
/*  Translation dictionary                                             */
/* ------------------------------------------------------------------ */

const dict: Record<string, Record<Locale, string>> = {
  /* --- Nav groups --- */
  'nav.overview': { en: 'Overview', ja: '概要' },
  'nav.acquisition': { en: 'Acquisition', ja: '獲得' },
  'nav.sales': { en: 'Sales', ja: '営業' },
  'nav.team': { en: 'Team', ja: 'チーム' },

  /* --- Nav items --- */
  'nav.dashboard': { en: 'Dashboard', ja: 'ダッシュボード' },
  'nav.leadFinder': { en: 'Lead Finder', ja: 'リード検索' },
  'nav.deepSearch': { en: 'Deep Search', ja: 'ディープサーチ' },
  'nav.leads': { en: 'Leads', ja: 'リード' },
  'nav.pipeline': { en: 'Pipeline', ja: 'パイプライン' },
  'nav.crm': { en: 'CRM', ja: 'CRM' },
  'nav.reports': { en: 'Reports', ja: 'レポート' },
  'nav.members': { en: 'Members', ja: 'メンバー' },
  'nav.news': { en: 'News', ja: 'ニュース' },
  'nav.intelligence': { en: 'Intelligence', ja: 'インテリジェンス' },
  'nav.signOut': { en: 'Sign out', ja: 'ログアウト' },

  /* --- Sidebar wordmark --- */
  'sidebar.title': { en: 'Acquisition', ja: 'アクイジション' },
  'sidebar.subtitle': { en: 'JAPAN MARKET', ja: '日本市場' },

  /* --- Page titles --- */
  'page.dashboard': { en: 'Dashboard', ja: 'ダッシュボード' },
  'page.leadManagement': { en: 'Lead Management', ja: 'リード管理' },
  'page.salesPipeline': { en: 'Sales Pipeline', ja: '営業パイプライン' },
  'page.reports': { en: 'Reports', ja: 'レポート' },
  'page.merchantProfile': { en: 'Merchant Profile', ja: '加盟店プロフィール' },
  'page.merchantCRM': { en: 'Merchant CRM', ja: '加盟店CRM' },
  'page.leadFinder': { en: 'Lead Finder', ja: 'リード検索' },
  'page.deepSearch': { en: 'Deep Search', ja: 'ディープサーチ' },
  'page.teamMembers': { en: 'Team Members', ja: 'チームメンバー' },

  /* --- Dashboard --- */
  'dash.title': { en: 'Dashboard', ja: 'ダッシュボード' },
  'dash.subtitle': { en: 'Acquisition performance · Japan Market', ja: '獲得実績 · 日本市場' },
  'dash.generateReport': { en: 'Generate Report', ja: 'レポート作成' },
  'dash.generating': { en: 'Generating...', ja: '作成中...' },
  'dash.downloadPDF': { en: 'Download PDF', ja: 'PDF ダウンロード' },
  'dash.downloadCSV': { en: 'Download CSV', ja: 'CSV ダウンロード' },
  'dash.addNewLead': { en: 'Add New Lead', ja: '新規リード追加' },
  'dash.totalLeads': { en: 'Total Leads', ja: '総リード数' },
  'dash.addedThisWeek': { en: 'Added This Week', ja: '今週の追加' },
  'dash.deepSearches': { en: 'Deep Searches This Week', ja: '今週のディープサーチ' },
  'dash.pipelineHealth': { en: 'Pipeline Health', ja: 'パイプライン状況' },
  'dash.recentActivity': { en: 'Recent Activity', ja: '最近のアクティビティ' },
  'dash.viewAll': { en: 'View All', ja: 'すべて表示' },
  'dash.todayActions': { en: "Today's Actions", ja: '本日のアクション' },
  'dash.followUpAlerts': { en: 'Follow-Up Alerts', ja: 'フォローアップ通知' },
  'dash.allClear': { en: 'All clear', ja: 'すべて完了' },
  'dash.noOverdue': { en: 'No overdue follow-ups or stale leads', ja: '期限超過・停滞リードなし' },

  /* --- Statuses --- */
  'status.new': { en: 'New', ja: '新規' },
  'status.contacted': { en: 'Contacted', ja: '連絡済' },
  'status.qualified': { en: 'Qualified', ja: '適格' },
  'status.proposalSent': { en: 'Proposal Sent', ja: '提案送付済' },
  'status.negotiation': { en: 'Negotiation', ja: '交渉中' },
  'status.closedWon': { en: 'Closed Won', ja: '成約' },
  'status.closedLost': { en: 'Closed Lost', ja: '失注' },

  /* --- Pipeline stages --- */
  'stage.prospecting': { en: 'Prospecting', ja: '発掘' },
  'stage.contacted': { en: 'Contacted', ja: '連絡済' },
  'stage.qualification': { en: 'Qualification', ja: '選定' },
  'stage.proposal': { en: 'Proposal', ja: '提案' },
  'stage.negotiation': { en: 'Negotiation', ja: '交渉' },
  'stage.closedWon': { en: 'Closed Won', ja: '成約' },

  /* --- Common UI --- */
  'ui.search': { en: 'Search commands or leads...', ja: 'コマンド・リード検索...' },
  'ui.active': { en: 'Active', ja: 'アクティブ' },
  'ui.empty': { en: 'Empty', ja: '空' },
  'ui.strongWeek': { en: 'Strong week', ja: '好調' },
  'ui.rampUp': { en: 'Ramp up', ja: '加速中' },
  'ui.noSearches': { en: 'No searches', ja: '検索なし' },
  'ui.avgScore': { en: 'Avg score', ja: '平均スコア' },
  'ui.activeDeals': { en: 'Active: {{count}} Deals', ja: 'アクティブ: {{count}} 件' },
  'ui.overdue': { en: 'overdue', ja: '期限超過' },
  'ui.upcoming': { en: 'Upcoming', ja: '予定' },
  'ui.goingCold': { en: 'Going Cold', ja: '冷え込み中' },
  'ui.staleDeals': { en: 'Stale Deals', ja: '停滞案件' },
  'ui.dueToday': { en: 'Due today', ja: '本日期限' },
  'ui.dueTomorrow': { en: 'Due tomorrow', ja: '明日期限' },
  'ui.daysOverdue': { en: '{{n}}d overdue', ja: '{{n}}日超過' },
  'ui.daysInactive': { en: '{{n}}d inactive', ja: '{{n}}日停滞' },
  'ui.daysUntouched': { en: '{{n}}d untouched', ja: '{{n}}日未対応' },
  'ui.noResults': { en: 'No results', ja: '結果なし' },
  'ui.cancel': { en: 'Cancel', ja: 'キャンセル' },
  'ui.save': { en: 'Save', ja: '保存' },
  'ui.delete': { en: 'Delete', ja: '削除' },
  'ui.edit': { en: 'Edit', ja: '編集' },
  'ui.close': { en: 'Close', ja: '閉じる' },
  'ui.actions': { en: 'actions', ja: 'アクション' },

  /* --- Leads page --- */
  'leads.title': { en: 'Leads', ja: 'リード一覧' },
  'leads.addLead': { en: 'Add Lead', ja: 'リード追加' },
  'leads.bulkActions': { en: 'Bulk Actions', ja: '一括操作' },
  'leads.noLeads': { en: 'No leads yet', ja: 'リードがありません' },
  'leads.addFirst': { en: 'Add your first lead to get started', ja: '最初のリードを追加して始めましょう' },

  /* --- Toast messages --- */
  'toast.leadAdded': { en: 'Lead added', ja: 'リード追加完了' },
  'toast.leadUpdated': { en: 'Lead updated', ja: 'リード更新完了' },
  'toast.leadDeleted': { en: 'Lead deleted', ja: 'リード削除完了' },
  'toast.statusUpdated': { en: 'Status updated', ja: 'ステータス更新完了' },
  'toast.error': { en: 'Something went wrong', ja: 'エラーが発生しました' },
  'toast.copied': { en: 'Copied to clipboard', ja: 'クリップボードにコピー' },
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

type I18nContextType = {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key,
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('crm-locale') as Locale) || 'en'
    }
    return 'en'
  })

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm-locale', l)
    }
  }, [])

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      let text = dict[key]?.[locale] ?? dict[key]?.en ?? key
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v))
        }
      }
      return text
    },
    [locale]
  )

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}

/* ------------------------------------------------------------------ */
/*  Language toggle component                                          */
/* ------------------------------------------------------------------ */

export function LanguageToggle() {
  const { locale, setLocale } = useI18n()
  return (
    <button
      type="button"
      onClick={() => setLocale(locale === 'en' ? 'ja' : 'en')}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-none text-[11px] font-bold transition-colors hover:bg-surface-hover"
      style={{ border: '1px solid rgba(24,28,35,0.08)' }}
      title={locale === 'en' ? 'Switch to Japanese' : 'Switch to English'}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>translate</span>
      {locale === 'en' ? 'JP' : 'EN'}
    </button>
  )
}
