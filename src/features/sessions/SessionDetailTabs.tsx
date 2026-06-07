"use client"

import { useState } from "react"

export interface TabDef {
  id:       string
  label:    string
  content:  React.ReactNode
  badge?:   number | string
  disabled?: boolean
}

export function SessionDetailTabs({ tabs, defaultTab }: {
  tabs:        TabDef[]
  defaultTab?: string
}) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id)

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-0 border-b border-zinc-800 overflow-x-auto mb-8 -mx-1 px-1">
        {tabs.map((tab) => {
          const isActive = active === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActive(tab.id)}
              disabled={tab.disabled}
              className={`relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors
                ${isActive
                  ? "text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed"
                }`}
            >
              {tab.label}
              {tab.badge != null && (
                <span className="ml-1.5 text-[11px] text-zinc-600 font-normal tabular-nums">
                  {tab.badge}
                </span>
              )}
              {/* Active underline */}
              {isActive && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-cyan-400 rounded-t" />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab panels */}
      {tabs.map((tab) => (
        <div key={tab.id} className={active === tab.id ? "block" : "hidden"}>
          {tab.content}
        </div>
      ))}
    </div>
  )
}
