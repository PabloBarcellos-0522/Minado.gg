import { createContext, useContext, useState, type ReactNode } from 'react'

interface TabsContextValue {
  activeTab: string
  setActiveTab: (_id: string) => void
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined)

interface TabsProps {
  defaultValue: string
  children: ReactNode
  className?: string
}

export function Tabs({ defaultValue, children, className = '' }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue)

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

interface TabListProps {
  children: ReactNode
  className?: string
}

export function TabList({ children, className = '' }: TabListProps) {
  return (
    <div
      className={[
        'flex gap-1 border-b-2 border-border',
        className,
      ].join(' ')}
      role="tablist"
    >
      {children}
    </div>
  )
}

interface TabTriggerProps {
  value: string
  children: ReactNode
  className?: string
}

export function TabTrigger({ value, children, className = '' }: TabTriggerProps) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('TabTrigger must be used within Tabs')

  const isActive = context.activeTab === value

  return (
    <button
      role="tab"
      aria-selected={isActive}
      onClick={() => context.setActiveTab(value)}
      className={[
        'font-heading font-bold',
        'px-5 py-3',
        'bg-transparent border-none cursor-pointer',
        'text-ink-muted',
        'border-b-3 border-transparent',
        'mb-[-2px]',
        'rounded-t-[8px]',
        'transition-all duration-base ease-standard',
        isActive
          ? 'text-primary-600 border-b-primary-500'
          : 'hover:text-primary-600',
        className,
      ].join(' ')}
    >
      {children}
    </button>
  )
}

interface TabContentProps {
  value: string
  children: ReactNode
  className?: string
}

export function TabContent({ value, children, className = '' }: TabContentProps) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('TabContent must be used within Tabs')

  if (context.activeTab !== value) return null

  return (
    <div role="tabpanel" className={className}>
      {children}
    </div>
  )
}
