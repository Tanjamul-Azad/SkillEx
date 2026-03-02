
"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastTitle,
  ToastViewport,
  ToastProgress,
  ToastIcons,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastViewport>
      {toasts.map(function ({ id, title, description, action, duration = 3000, variant, ...props }) {
        const icon = variant ? ToastIcons[variant as keyof typeof ToastIcons] : null;
        return (
          <Toast key={id} variant={variant} {...props}>
            {icon}
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
            <ToastProgress duration={duration} />
          </Toast>
        )
      })}
    </ToastViewport>
  )
}
