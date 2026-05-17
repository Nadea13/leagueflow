"use client"

import {  Plan, ManagerPlan, OrganizerPlan } from "@/types"
import { deletePlan } from "@/actions/admin/plans"
import { useTranslations } from "next-intl"
import { useState } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit2, Trash2, Loader2, Search, CreditCard } from "lucide-react"
import { PlanDialog } from "./plan-dialog"
import { Input } from "@/components/ui/input"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"

interface PlansTableProps {
    plans: Plan[]
    role: 'organizer' | 'manager'
}

export function PlansTable({ plans, role }: PlansTableProps) {
    const t = useTranslations("Admin");
    const tCommon = useTranslations("Common");
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [page, setPage] = useState(1);
    const itemsPerPage = 100;
    const { toast } = useToast()

    const filteredPlans = plans.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description?.some(d => d.toLowerCase().includes(searchTerm.toLowerCase())) ?? false)
    );

    const paginatedPlans = filteredPlans.slice((page - 1) * itemsPerPage, page * itemsPerPage);
    const totalPages = Math.ceil(filteredPlans.length / itemsPerPage) || 1;

    const handleDelete = async (id: string) => {
        setDeletingId(id)
        try {
            const res = await deletePlan(id, role)
            if (res.success) {
                toast({ title: tCommon("success"), description: t("delete_success") })
            } else {
                toast({ title: tCommon("error"), description: res.error || tCommon("error_desc"), variant: "destructive" })
            }
        } catch (error) {
            console.error("Failed to delete", error)
            toast({ title: tCommon("error"), description: tCommon("error_desc"), variant: "destructive" })
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <div className="space-y-4">
            <div className="relative w-full md:w-[300px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder={t("search_plans")}
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setPage(1);
                    }}
                />
            </div>

            <div className="border border-border bg-card overflow-x-auto overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="border-b border-border bg-muted/30 hover:bg-muted/30">
                            <TableHead className="min-w-[200px] text-[10px] font-black tracking-[0.15em] text-muted-foreground">{t("plan_name")}</TableHead>
                            <TableHead className="text-[10px] font-black tracking-[0.15em] text-muted-foreground">{t("price")}</TableHead>
                            <TableHead className="text-[10px] font-black tracking-[0.15em] text-muted-foreground">{t("duration")}</TableHead>
                            
                            {role === 'manager' ? (
                                <>
                                    <TableHead className="text-[10px] font-black tracking-[0.15em] text-muted-foreground">{t("max_teams")}</TableHead>
                                    <TableHead className="text-[10px] font-black tracking-[0.15em] text-muted-foreground">{t("players_per_team")}</TableHead>
                                </>
                            ) : (
                                <>
                                    <TableHead className="text-[10px] font-black tracking-[0.15em] text-muted-foreground">{t("max_tournaments")}</TableHead>
                                    <TableHead className="text-[10px] font-black tracking-[0.15em] text-muted-foreground">{t("teams_per_tournament")}</TableHead>
                                    <TableHead className="text-[10px] font-black tracking-[0.15em] text-muted-foreground">{t("formats")}</TableHead>
                                </>
                            )}
                            
                            <TableHead className="text-[10px] font-black tracking-[0.15em] text-muted-foreground">{t("support")}</TableHead>
                            <TableHead className="text-[10px] font-black tracking-[0.15em] text-muted-foreground">{t("recommended")}</TableHead>
                            <TableHead className="text-right text-[10px] font-black tracking-[0.15em] text-muted-foreground">{t("actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedPlans.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={role === 'manager' ? 7 : 8} className="text-center h-24 text-muted-foreground">
                                    {t("no_results")}
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedPlans.map((plan) => (
                                <TableRow key={plan.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                                                <CreditCard className="h-4 w-4 text-primary" />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-bold text-sm">{plan.name}</span>
                                                {plan.description && plan.description.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {plan.description.slice(0, 3).map((feature, i) => (
                                                            <Badge key={i} variant="default" className="text-[9px] font-medium px-1">
                                                                {feature}
                                                            </Badge>
                                                        ))}
                                                        {plan.description.length > 3 && (
                                                            <span className="text-[9px] text-muted-foreground font-bold">
                                                                +{plan.description.length - 3} {tCommon("more")}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className={plan.discounted_price ? "line-through text-[10px] text-muted-foreground" : "font-black text-sm"}>
                                                ฿{plan.price.toLocaleString()}
                                            </span>
                                            {plan.discounted_price && (
                                                <span className="text-primary font-black text-sm">
                                                    ฿{plan.discounted_price.toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm">{plan.duration || t("lifetime")}</TableCell>
                                    
                                    {role === 'manager' ? (
                                        <>
                                            <TableCell className="text-sm font-bold">{(plan as ManagerPlan).max_teams === 0 ? t("unlimited") : (plan as ManagerPlan).max_teams}</TableCell>
                                            <TableCell className="text-sm font-bold">{(plan as ManagerPlan).max_players_per_team === 0 ? t("unlimited") : (plan as ManagerPlan).max_players_per_team}</TableCell>
                                        </>
                                    ) : (
                                        <>
                                            <TableCell className="text-sm font-bold">{(plan as OrganizerPlan).max_tournaments === 0 ? t("unlimited") : (plan as OrganizerPlan).max_tournaments}</TableCell>
                                            <TableCell className="text-sm font-bold">{(plan as OrganizerPlan).max_teams_per_tournament === 0 ? t("unlimited") : (plan as OrganizerPlan).max_teams_per_tournament}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-[10px] font-black">
                                                    {(plan as OrganizerPlan).format_support || "Basic"}
                                                </Badge>
                                            </TableCell>
                                        </>
                                    )}
                                    
                                    <TableCell>
                                        <Badge variant="outline" className="text-[10px] font-black">
                                            {plan.support_level || "Standard"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {plan.recommended && (
                                            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-black">
                                                {t("recommended")}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <PlanDialog initialPlan={plan} role={role}>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted/30">
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                            </PlanDialog>

                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent className="border-border">
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle className="font-black tracking-tighter">
                                                            {tCommon("are_you_sure")}
                                                        </AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            {t("delete_plan_confirm")}
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel className="text-[10px] font-black">
                                                            {tCommon("cancel")}
                                                        </AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => handleDelete(plan.id)}
                                                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground text-[10px] font-black"
                                                        >
                                                            {deletingId === plan.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                tCommon("delete")
                                                            )}
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {filteredPlans.length > itemsPerPage && (
                <div className="flex items-center justify-between py-2">
                    <div className="text-[10px] tracking-wider font-bold text-muted-foreground hidden sm:block">
                        Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, filteredPlans.length)} of {filteredPlans.length} entries
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-[10px] font-black"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            Previous
                        </Button>
                        <span className="text-[10px] tracking-wider font-bold text-muted-foreground px-2">Page {page} of {totalPages}</span>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-[10px] font-black"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
