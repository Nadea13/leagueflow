"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {  Plan, ManagerPlan, OrganizerPlan } from "@/types"
import { upsertPlan } from "@/actions/admin/plans"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"

const planSchema = z.object({
    name: z.string().min(1, "name_required"),
    description: z.array(z.object({ value: z.string().min(1, "feature_required") })).optional(),
    price: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
        message: "price_invalid",
    }),
    discounted_price: z.string().optional().refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), {
        message: "discount_invalid",
    }),
    duration: z.string().optional(),
    max_teams: z.string().optional(),
    max_players_per_team: z.string().optional(),
    max_tournaments: z.string().optional(),
    max_teams_per_tournament: z.string().optional(),
    format_support: z.string().optional(),
    invite_enabled: z.boolean().optional(),
    register_enabled: z.boolean().optional(),
    stats_support: z.string().optional(),
    support_level: z.string().optional(),
    recommended: z.boolean(),
})

type PlanFormValues = z.infer<typeof planSchema>

interface PlanDialogProps {
    initialPlan?: Plan
    role: 'organizer' | 'manager'
    open?: boolean
    onOpenChange?: (open: boolean) => void
    children?: React.ReactNode
}

export function PlanDialog({ initialPlan, role, open: controlledOpen, onOpenChange: setControlledOpen, children }: PlanDialogProps) {
    const t = useTranslations("Admin");
    const tCommon = useTranslations("Common");
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const { toast } = useToast()

    const isControlled = controlledOpen !== undefined
    const isOpen = isControlled ? controlledOpen : open
    const onOpenChange = isControlled ? setControlledOpen : setOpen

    const form = useForm<PlanFormValues>({
        resolver: zodResolver(planSchema),
        defaultValues: {
            name: "",
            description: [],
            price: "",
            discounted_price: "",
            duration: "",
            max_teams: "0",
            max_players_per_team: "0",
            max_tournaments: "0",
            max_teams_per_tournament: "0",
            format_support: "Basic",
            invite_enabled: false,
            register_enabled: false,
            stats_support: "Basic",
            support_level: "Standard",
            recommended: false,
        },
    })

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "description",
    })

    useEffect(() => {
        if (isOpen) {
            if (initialPlan) {
                const isManager = 'max_teams' in initialPlan;
                const isOrganizer = 'max_tournaments' in initialPlan;

                form.reset({
                    name: initialPlan.name,
                    description: initialPlan.description?.map(d => ({ value: d })) || [],
                    price: initialPlan.price.toString(),
                    discounted_price: initialPlan.discounted_price?.toString() || "",
                    duration: initialPlan.duration || "",
                    max_teams: isManager ? (initialPlan as ManagerPlan).max_teams?.toString() : "0",
                    max_players_per_team: isManager ? (initialPlan as ManagerPlan).max_players_per_team?.toString() : "0",
                    max_tournaments: isOrganizer ? (initialPlan as OrganizerPlan).max_tournaments?.toString() : "0",
                    max_teams_per_tournament: isOrganizer ? (initialPlan as OrganizerPlan).max_teams_per_tournament?.toString() : "0",
                    format_support: isOrganizer ? (initialPlan as OrganizerPlan).format_support || "Basic" : "Basic",
                    invite_enabled: isOrganizer ? !!(initialPlan as OrganizerPlan).invite_enabled : false,
                    register_enabled: isOrganizer ? !!(initialPlan as OrganizerPlan).register_enabled : false,
                    stats_support: isOrganizer ? (initialPlan as OrganizerPlan).stats_support || "Basic" : "Basic",
                    support_level: initialPlan.support_level || "Standard",
                    recommended: !!initialPlan.recommended,
                })
            } else {
                form.reset({
                    name: "",
                    description: [],
                    price: "",
                    discounted_price: "",
                    duration: "",
                    max_teams: "0",
                    max_players_per_team: "0",
                    max_tournaments: "0",
                    max_teams_per_tournament: "0",
                    format_support: "Basic",
                    support_level: "Standard",
                    recommended: false,
                })
            }
        }
    }, [initialPlan, form, isOpen])

    async function onSubmit(values: PlanFormValues) {
        setIsLoading(true)
        try {
            const planData: Record<string, unknown> = {
                id: initialPlan?.id,
                name: values.name,
                description: values.description?.map(d => d.value) || [],
                price: parseFloat(values.price),
                discounted_price: values.discounted_price ? parseFloat(values.discounted_price) : null,
                duration: values.duration,
                support_level: values.support_level,
                recommended: values.recommended,
            };

            if (role === 'manager') {
                planData.max_teams = parseInt(values.max_teams || "0");
                planData.max_players_per_team = parseInt(values.max_players_per_team || "0");
            } else {
                planData.max_tournaments = parseInt(values.max_tournaments || "0");
                planData.max_teams_per_tournament = parseInt(values.max_teams_per_tournament || "0");
                planData.format_support = values.format_support;
                planData.invite_enabled = values.invite_enabled;
                planData.register_enabled = values.register_enabled;
                planData.stats_support = values.stats_support;
            }

            const res = await upsertPlan(planData, role)

            if (res.success) {
                toast({
                    title: tCommon("success"),
                    description: t("plan_saved"),
                })
                setOpen(false)
            } else {
                toast({
                    title: tCommon("error"),
                    description: res.error || t("failed_to_save"),
                    variant: "destructive",
                })
            }
        } catch (_error) {
            toast({
                title: tCommon("error"),
                description: tCommon("unexpected_error"),
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                {children || (
                    <Button className="rounded-none text-[10px] font-black uppercase tracking-wider">
                        <Plus className="mr-2 h-4 w-4" /> {t("add_plan")}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto rounded-none border-border p-0">
                <div className="bg-secondary/10 px-6 py-5 border-b border-border relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-secondary" />
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black uppercase tracking-tighter text-foreground">
                            {initialPlan ? t("edit_plan") : t("add_plan")}
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground text-sm font-medium pt-1">
                            {initialPlan ? tCommon("edit_desc") : tCommon("create_desc")}
                        </DialogDescription>
                    </DialogHeader>
                </div>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 px-6 py-6">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                        <div className="col-span-2 grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right text-[10px] font-black uppercase tracking-wider">{t("plan_name")}</Label>
                            <div className="col-span-3">
                                <Input id="name" {...form.register("name")} />
                                {form.formState.errors.name && <p className="text-sm text-red-500 mt-1">{t("name_required")}</p>}
                            </div>
                        </div>

                        <div className="col-span-2 grid grid-cols-4 items-start gap-4">
                            <Label className="text-right pt-2 text-[10px] font-black uppercase tracking-wider">{t("description")}</Label>
                            <div className="col-span-3 space-y-2">
                                {fields.map((field, index) => (
                                    <div key={field.id} className="flex gap-2">
                                        <Input
                                            {...form.register(`description.${index}.value` as const)}
                                            placeholder={t("feature_description")}
                                        />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="shrink-0 text-destructive hover:bg-destructive/10">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => append({ value: "" })}
                                    className="w-full rounded-none text-[10px] font-black uppercase"
                                >
                                    <Plus className="mr-2 h-4 w-4" /> {t("add_feature")}
                                </Button>
                            </div>
                        </div>

                        {/* Pricing & Limits */}
                        <div className="col-span-2 border-t border-border pt-4 flex items-center gap-3">
                            <div className="w-1 h-4 bg-secondary" />
                            <span className="text-[10px] font-black uppercase tracking-[0.15em]">{t("pricing_and_limits")}</span>
                        </div>

                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="price" className="text-right text-[10px] font-black uppercase tracking-wider">{t("price")}</Label>
                            <div className="col-span-2">
                                <Input id="price" type="number" step="0.01" {...form.register("price")} />
                                {form.formState.errors.price && <p className="text-xs text-red-500 mt-1">{t(form.formState.errors.price.message || "")}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="discounted_price" className="text-right whitespace-nowrap text-[10px] font-black uppercase tracking-wider">{t("discounted_price")}</Label>
                            <div className="col-span-2">
                                <Input id="discounted_price" type="number" step="0.01" {...form.register("discounted_price")} />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="duration" className="text-right text-[10px] font-black uppercase tracking-wider">{t("duration")}</Label>
                            <div className="col-span-2">
                                <Input id="duration" placeholder={t("duration_placeholder")} {...form.register("duration")} />
                            </div>
                        </div>

                        {role === 'manager' ? (
                            <>
                                <div className="grid grid-cols-3 items-center gap-4">
                                    <Label htmlFor="max_teams" className="text-right text-[10px] font-black uppercase tracking-wider">{t("max_teams")}</Label>
                                    <div className="col-span-2">
                                        <Input id="max_teams" type="number" {...form.register("max_teams")} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 items-center gap-4">
                                    <Label htmlFor="max_players_per_team" className="text-right whitespace-nowrap text-[10px] font-black uppercase tracking-wider">{t("max_players_per_team")}</Label>
                                    <div className="col-span-2">
                                        <Input id="max_players_per_team" type="number" {...form.register("max_players_per_team")} />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="grid grid-cols-3 items-center gap-4">
                                    <Label htmlFor="max_tournaments" className="text-right text-[10px] font-black uppercase tracking-wider">{t("max_tournaments")}</Label>
                                    <div className="col-span-2">
                                        <Input id="max_tournaments" type="number" {...form.register("max_tournaments")} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 items-center gap-4">
                                    <Label htmlFor="max_teams_per_tournament" className="text-right whitespace-nowrap text-[10px] font-black uppercase tracking-wider">{t("max_teams_per_tournament")}</Label>
                                    <div className="col-span-2">
                                        <Input id="max_teams_per_tournament" type="number" {...form.register("max_teams_per_tournament")} />
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="recommended" className="text-right text-[10px] font-black uppercase tracking-wider">{t("recommended")}</Label>
                            <div className="col-span-2">
                                <Switch
                                    id="recommended"
                                    checked={form.watch("recommended")}
                                    onCheckedChange={(val) => form.setValue("recommended", val)}
                                />
                            </div>
                        </div>

                        {role === 'organizer' && (
                            <>
                                <div className="col-span-2 border-t border-border pt-4 flex items-center gap-3">
                                    <div className="w-1 h-4 bg-secondary" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.15em]">{t("features_and_support")}</span>
                                </div>

                                <div className="grid grid-cols-3 items-center gap-4">
                                    <Label htmlFor="format_support" className="text-right text-[10px] font-black uppercase tracking-wider">{t("format_support")}</Label>
                                    <div className="col-span-2">
                                        <Input id="format_support" {...form.register("format_support")} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 items-center gap-4">
                                    <Label htmlFor="stats_support" className="text-right text-[10px] font-black uppercase tracking-wider">{t("statistics")}</Label>
                                    <div className="col-span-2">
                                        <Input id="stats_support" {...form.register("stats_support")} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 items-center gap-4">
                                    <Label htmlFor="invite_enabled" className="text-right text-[10px] font-black uppercase tracking-wider">{t("invite_via_link")}</Label>
                                    <div className="col-span-2">
                                        <Switch
                                            id="invite_enabled"
                                            checked={form.watch("invite_enabled")}
                                            onCheckedChange={(val) => form.setValue("invite_enabled", val)}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 items-center gap-4">
                                    <Label htmlFor="register_enabled" className="text-right text-[10px] font-black uppercase tracking-wider">{t("open_registration")}</Label>
                                    <div className="col-span-2">
                                        <Switch
                                            id="register_enabled"
                                            checked={form.watch("register_enabled")}
                                            onCheckedChange={(val) => form.setValue("register_enabled", val)}
                                        />
                                    </div>
                                </div>


                            </>
                        )}

                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="support_level" className="text-right text-[10px] font-black uppercase tracking-wider">{t("support")}</Label>
                            <div className="col-span-2">
                                <Input id="support_level" {...form.register("support_level")} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="pt-4 border-t border-border">
                        <Button type="submit" disabled={isLoading} className="w-full rounded-none font-black uppercase tracking-wider">
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {tCommon("save")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
