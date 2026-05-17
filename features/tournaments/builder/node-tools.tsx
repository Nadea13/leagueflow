"use client"

import { Button } from "@/components/ui/button"
import { Plus, Zap, Users, ListOrdered, Megaphone } from "lucide-react"

interface NodeToolsProps {
    onAddMatch: () => void
    onAddBye: () => void
    onAddGroup: () => void
    onAddStanding: () => void
    onAddTeamList: () => void
    onAddAnnouncement: () => void
}

export function NodeTools({
    onAddMatch,
    onAddBye,
    onAddGroup,
    onAddStanding,
    onAddTeamList,
    onAddAnnouncement
}: NodeToolsProps) {
    return (
        <div className="flex flex-col gap-1 p-1">
            <Button
                variant="ghost"
                onClick={onAddMatch}
                className="w-full justify-start gap-3 h-auto py-2 px-3 hover:bg-primary/10 border border-transparent hover:border-primary/30 transition-all group"
            >
                <div className="w-8 h-8 bg-primary/10 rounded-sm flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <Plus className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col items-start gap-0.5">
                    <span className="text-[11px] font-black tracking-tight">Add Match</span>
                    <span className="text-[9px] text-muted-foreground tracking-tighter font-medium text-left">
                        Knockout Slot
                    </span>
                </div>
            </Button>

            <Button
                variant="ghost"
                onClick={onAddBye}
                className="w-full justify-start gap-3 h-auto py-2 px-3 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/30 transition-all group"
            >
                <div className="w-8 h-8 bg-amber-500/10 rounded-sm flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
                    <Zap className="h-4 w-4 text-amber-500" />
                </div>
                <div className="flex flex-col items-start gap-0.5">
                    <span className="text-[11px] font-black tracking-tight">Add Bye Team</span>
                    <span className="text-[9px] text-muted-foreground tracking-tighter font-medium text-left">
                        Skip Round
                    </span>
                </div>
            </Button>

            <Button
                variant="ghost"
                onClick={onAddGroup}
                className="w-full justify-start gap-3 h-auto py-2 px-3 hover:bg-violet-500/10 border border-transparent hover:border-violet-500/30 transition-all group"
            >
                <div className="w-8 h-8 bg-violet-500/10 rounded-sm flex items-center justify-center shrink-0 group-hover:bg-violet-500/20 transition-colors">
                    <Users className="h-4 w-4 text-violet-500" />
                </div>
                <div className="flex flex-col items-start gap-0.5">
                    <span className="text-[11px] font-black tracking-tight">Add Group</span>
                    <span className="text-[9px] text-muted-foreground tracking-tighter font-medium text-left">
                        Stage / Pool
                    </span>
                </div>
            </Button>

            <Button
                variant="ghost"
                onClick={onAddStanding}
                className="w-full justify-start gap-3 h-auto py-2 px-3 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/30 transition-all group"
            >
                <div className="w-8 h-8 bg-emerald-500/10 rounded-sm flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                    <ListOrdered className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="flex flex-col items-start gap-0.5">
                    <span className="text-[11px] font-black tracking-tight">Add Standing</span>
                    <span className="text-[9px] text-muted-foreground tracking-tighter font-medium text-left">
                        Group Ranking
                    </span>
                </div>
            </Button>

            <Button
                variant="ghost"
                onClick={onAddTeamList}
                className="w-full justify-start gap-3 h-auto py-2 px-3 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/30 transition-all group"
            >
                <div className="w-8 h-8 bg-blue-500/10 rounded-sm flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-colors">
                    <Users className="h-4 w-4 text-blue-500" />
                </div>
                <div className="flex flex-col items-start gap-0.5">
                    <span className="text-[11px] font-black tracking-tight">Teams List</span>
                    <span className="text-[9px] text-muted-foreground tracking-tighter font-medium text-left">
                        Participating Teams
                    </span>
                </div>
            </Button>

            <Button
                variant="ghost"
                onClick={onAddAnnouncement}
                className="w-full justify-start gap-3 h-auto py-2 px-3 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/30 transition-all group"
            >
                <div className="w-8 h-8 bg-amber-500/10 rounded-sm flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
                    <Megaphone className="h-4 w-4 text-amber-500" />
                </div>
                <div className="flex flex-col items-start gap-0.5">
                    <span className="text-[11px] font-black tracking-tight">Announcement Node</span>
                    <span className="text-[9px] text-muted-foreground tracking-tighter font-medium text-left">
                        Display Live Updates
                    </span>
                </div>
            </Button>
        </div>
    )
}
