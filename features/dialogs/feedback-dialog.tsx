"use client"

import { useState, useEffect, useRef } from "react"
import { MessageSquareWarning, AlertCircle, Loader2 } from "lucide-react"
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
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (open) {
            setError(null);
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTop = 0;
            }
        }
    }, [open]);

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
                    suppressHydrationWarning
                    className={cn(
                        "w-full h-auto flex items-center gap-0 md:group-hover/sidebar:gap-2 p-2 rounded-sm transition-all duration-300 ease-in-out relative group/btn tracking-wide justify-center md:justify-start text-muted-foreground hover:text-muted-foreground/90 hover:bg-primary/10 font-normal",
                        className
                    )}
                >
                    <MessageSquareWarning className="h-4 w-4 shrink-0 transition-all duration-300 ease-in-out text-muted-foreground" />
                    <span className="text-sm font-medium whitespace-nowrap transition-all duration-300 ease-in-out opacity-100 w-auto md:opacity-0 md:w-0 md:group-hover/sidebar:opacity-100 md:group-hover/sidebar:w-auto overflow-hidden">{t("dialog_title")}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-4 border-b shrink-0">
                    <DialogTitle>{t("dialog_title")}</DialogTitle>
                </DialogHeader>

                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSubmit();
                    }}
                    className="flex flex-col flex-1 min-h-0"
                >
                    <div ref={scrollContainerRef} className="p-4 space-y-4 flex-1 min-h-0 overflow-y-auto">
                        <DialogDescription className="text-sm">
                            {t("dialog_desc")}
                        </DialogDescription>

                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-1.5">
                            <Textarea
                                id="bug-message"
                                className="min-h-[160px] resize-none text-sm"
                                placeholder={t("placeholder")}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                disabled={isSubmitting}
                                required
                            />
                        </div>
                    </div>

                    <DialogFooter className="border-t p-4 shrink-0 flex items-center justify-end gap-2 bg-muted/20">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={isSubmitting}
                        >
                            {t("cancel")}
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !message.trim()}
                        >
                            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            {isSubmitting ? t("submitting") : t("submit")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
