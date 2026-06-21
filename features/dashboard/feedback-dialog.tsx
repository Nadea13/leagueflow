"use client"

import { useState } from "react"
import { MessageSquareWarning, Send, AlertCircle, Loader2 } from "lucide-react"
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

interface FeedbackDialogProps {
    className?: string
}

export function FeedbackDialog({ className }: FeedbackDialogProps) {
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
                    variant="outline"
                    className={cn("w-full justify-start", className)}
                >
                    <MessageSquareWarning className="h-4 w-4" />
                    <span>{t("title")}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] bg-background border-border p-0 overflow-hidden shadow-2xl rounded-xl">
                <div className="relative bg-background p-2 md:p-4 border-b">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black tracking-tighter text-foreground leading-none flex items-center gap-2">
                            {t("dialog_title")}
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground text-sm mt-1">
                            {t("dialog_desc")}
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="p-2 space-y-2 md:p-4 md:space-y-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <Textarea
                        id="bug-message"
                        placeholder={t("placeholder")}
                        className="min-h-[120px] resize-none bg-transparent text-foreground focus-visible:ring-0 text-sm"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        disabled={isSubmitting}
                    />
                </div>

                <DialogFooter className="border-t p-2 md:p-4">
                    <Button onClick={handleSubmit} disabled={isSubmitting || !message.trim()} className="flex-1">
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                {t("submitting")}
                            </>
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
