import {
  createElement,
  isValidElement,
  type ElementType,
  type ReactNode,
} from "react"

import { cn } from "@/lib/utils"

type EmptyStateIcon = ElementType<{
  className?: string
  "aria-hidden"?: boolean
}> | ReactNode

type EmptyStateProps = {
  icon?: EmptyStateIcon
  title: string
  description?: ReactNode
  children?: ReactNode
  className?: string
}

function renderIcon(icon: EmptyStateIcon) {
  if (isValidElement(icon)) {
    return icon
  }

  if (typeof icon === "string" || typeof icon === "number") {
    return (
      <span aria-hidden="true" className="text-sm leading-none">
        {icon}
      </span>
    )
  }

  return createElement(icon as ElementType, {
    "aria-hidden": true,
    className: "size-5",
  })
}

export function EmptyState({
  icon,
  title,
  description,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-8 text-center",
        className
      )}
    >
      {icon ? (
        <div className="mb-3 flex size-10 items-center justify-center rounded-full border bg-muted/50 text-muted-foreground">
          {renderIcon(icon)}
        </div>
      ) : null}

      <div className="space-y-1">
        <h3 className="text-base font-medium text-foreground">{title}</h3>
        {description ? (
          <div className="mx-auto max-w-md text-sm text-muted-foreground">
            {description}
          </div>
        ) : null}
      </div>

      {children ? (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {children}
        </div>
      ) : null}
    </div>
  )
}
