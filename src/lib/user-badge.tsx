"use client"

import { Badge } from "@/components/ui/badge"

type RoleType = "ADMIN" | "MOD" | "GUEST"
type UserBadgeProps = {
  role?: RoleType | null
  size?: "sm" | "default"
}

export function UserBadge({ role = "GUEST", size = "default" }: UserBadgeProps) {
  const safeRole: RoleType = ["ADMIN", "MOD", "GUEST"].includes(role ?? "")
    ? (role as RoleType)
    : "GUEST"

  const roleLabel: Record<RoleType, string> = {
    ADMIN: "Admin",
    MOD: "Modérateur",
    GUEST: "Invité",
  }

  const roleColor: Record<RoleType, "default" | "secondary" | "destructive" | "outline"> = {
    ADMIN: "destructive",
    MOD: "secondary",
    GUEST: "outline",
  }

  return (
    <Badge variant={roleColor[safeRole]} className={size === "sm" ? "text-xs px-2 py-0.5" : ""}>
      {roleLabel[safeRole]}
    </Badge>
  )
}
