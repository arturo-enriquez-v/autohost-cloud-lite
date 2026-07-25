"use client"

import { useState, useEffect, useRef } from "react"
import { useProfile } from "@/lib/features/auth/hooks/useProfile"
import {
  User,
  Mail,
  Hash,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Save,
  Upload,
  Trash2,
  Camera,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />
}

export default function ProfilePage() {
  const { user, isLoading, isUpdating, error: profileError, updateProfile } = useProfile()

  const [name, setName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) {
      setName(user.name || "")
      setAvatarUrl(user.avatar_url || "")
    }
  }, [user])

  const initials = name
    ? name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "?"

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (PNG, JPG, WebP, etc.)")
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const maxDim = 256
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height)
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85)
          setAvatarUrl(dataUrl)
          setError(null)
        }
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const handleRemovePhoto = () => {
    setAvatarUrl("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaved(false)

    const res = await updateProfile({
      name: name.trim(),
      avatar_url: avatarUrl.trim(),
    })

    if (res.success) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      setError(res.error || "Failed to update profile")
    }
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your personal information and preferences</p>
      </div>

      {(error || profileError) && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error || profileError}
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Profile updated successfully!
        </div>
      )}

      {/* Hero Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
          <CardDescription>Update your photo and display name</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="flex flex-col sm:flex-row items-center gap-6 pb-2">
              {/* Avatar circle & upload trigger */}
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-primary/10 text-3xl font-bold text-primary ring-4 ring-primary/20 overflow-hidden shadow-md transition-opacity group-hover:opacity-90">
                  {isLoading ? (
                    <User className="h-10 w-10 opacity-40 animate-pulse" />
                  ) : avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="h-full w-full object-cover"
                      onError={() => setError("Invalid image format")}
                    />
                  ) : (
                    initials
                  )}
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-6 w-6 text-white" />
                </div>
              </div>

              <div className="space-y-2 text-center sm:text-left flex-1">
                {isLoading ? (
                  <>
                    <Skeleton className="h-7 w-36 mx-auto sm:mx-0 mb-1" />
                    <Skeleton className="h-4 w-52 mx-auto sm:mx-0" />
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-bold text-foreground">
                      {name || user?.email?.split("@")[0]}
                    </h2>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                    <div className="flex items-center gap-2 pt-1 justify-center sm:justify-start">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Subir foto
                      </Button>
                      {avatarUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                          onClick={handleRemovePhoto}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2 max-w-md">
              <Label htmlFor="user-name">Display Name</Label>
              <Input
                id="user-name"
                placeholder="e.g. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading || isUpdating}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isLoading || isUpdating} className="gap-2">
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isUpdating ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Read-only identity identifiers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-1 border-b border-border pb-4 sm:flex-row sm:items-center">
            <div className="flex w-40 shrink-0 items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              Email
            </div>
            <div className="flex-1">
              {isLoading ? (
                <Skeleton className="h-4 w-48" />
              ) : (
                <span className="text-sm text-foreground">{user?.email}</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
            <div className="flex w-40 shrink-0 items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Hash className="h-3.5 w-3.5" />
              User ID
            </div>
            <div className="flex-1">
              {isLoading ? (
                <Skeleton className="h-4 w-64" />
              ) : (
                <span className="font-mono text-xs text-muted-foreground">{user?.uid}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
