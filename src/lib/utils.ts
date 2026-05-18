import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = "CNY"): string {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string | Date, format: "short" | "long" | "month" = "short"): string {
  const d = new Date(date)
  switch (format) {
    case "short":
      return d.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" })
    case "long":
      return d.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" })
    case "month":
      return d.toLocaleDateString("zh-CN", { year: "numeric", month: "long" })
  }
}
