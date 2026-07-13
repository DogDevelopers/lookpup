"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          "--width": "320px",
        } as React.CSSProperties
      }
      toastOptions={{
        // 헤더 유저 프로필 호버 박스/알림 드롭다운 톤에 맞춤
        classNames: {
          toast:
            "bg-white! text-stone-900! border! border-orange-100! rounded-xl! shadow-[0px_4px_20px_0px_rgba(232,116,42,0.15)]!",
          description: "text-stone-500!",
          actionButton:
            "rounded-lg! bg-orange-50! text-orange-600! font-medium! hover:bg-orange-100!",
          closeButton: "border-orange-100! text-stone-400! hover:bg-orange-50!",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
