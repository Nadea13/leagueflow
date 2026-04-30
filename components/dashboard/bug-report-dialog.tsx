"use client"

import { useState } from "react"
import { MessageSquareWarning, Send, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { submitBugReport } from "@/actions/common/bug-reports"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

interface BugReportDialogProps {
    className?: string
}

export function BugReportDialog({ className }: BugReportDialogProps) {
    const t = useTranslations("BugReport")
    const [open, setOpen] = useState(false)
    const [message, setMessage] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async () => {
        if (!message.trim()) {
            setError(t("error_empty"))
            return
        }

        setError(null)
        setIsSubmitting(true)

        try {
            const res = await submitBugReport(message)

            if (res.success) {
                toast.success(res.message || t("success"))
                setMessage("")
                setOpen(false)
            } else {
                setError(res.error || t("error_unexpected"))
            }
        } catch (e) {
            setError(t("error_unexpected"))
            console.error(e)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    className={cn("w-full justify-start gap-3 rounded-none px-3 py-2 text-muted-foreground hover:text-primary relative", className)}
                >
                    <MessageSquareWarning className="h-4 w-4" />
                    <span>{t("title")}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MessageSquareWarning className="h-5 w-5 text-destructive" />
                        {t("dialog_title")}
                    </DialogTitle>
                    <DialogDescription>
                        {t("dialog_desc")}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <Textarea
                        id="bug-message"
                        placeholder={t("placeholder")}
                        className="min-h-[120px] resize-none"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        disabled={isSubmitting}
                    />
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                        {t("cancel")}
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting || !message.trim()}>
                        {isSubmitting ? (
                            t("submitting")
                        ) : (
                            <>
                                <Send className="mr-2 h-4 w-4" />
                                {t("submit")}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
