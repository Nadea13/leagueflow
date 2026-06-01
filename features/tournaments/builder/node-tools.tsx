"use client"

import { Button } from "@/components/ui/button"
import { Users, ListOrdered, Megaphone, LayoutGrid, Heart } from "lucide-react"

interface NodeToolsProps {
    onAddMatch: () => void
    onAddGroup: () => void
    onAddStanding: () => void
    onAddTeamList: () => void
    onAddAnnouncement: () => void
    onAddSponsor: () => void
}

export function NodeTools({
    onAddMatch,
    onAddGroup,
    onAddStanding,
    onAddTeamList,
    onAddAnnouncement,
    onAddSponsor
}: NodeToolsProps) {
    return (
        <div className="flex flex-col gap-1 p-1">
            <Button
                variant="ghost"
                onClick={onAddMatch}
                className="w-full justify-start gap-3 h-auto py-2 px-3 hover:bg-node-2/10 border border-transparent hover:border-node-2/30 transition-all group"
            >
                <div className="w-8 h-8 bg-node-2/10 rounded-sm flex items-center justify-center shrink-0 group-hover:bg-node-2/20 transition-colors">
                    <span className="text-xs font-bold text-node-2 select-none">VS</span>
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
                onClick={onAddGroup}
                className="w-full justify-start gap-3 h-auto py-2 px-3 hover:bg-node-5/10 border border-transparent hover:border-node-5/30 transition-all group"
            >
                <div className="w-8 h-8 bg-node-5/10 rounded-sm flex items-center justify-center shrink-0 group-hover:bg-node-5/20 transition-colors">
                    <LayoutGrid className="h-4 w-4 text-node-5" />
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
                className="w-full justify-start gap-3 h-auto py-2 px-3 hover:bg-node-1/10 border border-transparent hover:border-node-1/30 transition-all group"
            >
                <div className="w-8 h-8 bg-node-1/10 rounded-sm flex items-center justify-center shrink-0 group-hover:bg-node-1/20 transition-colors">
                    <ListOrdered className="h-4 w-4 text-node-1" />
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
                className="w-full justify-start gap-3 h-auto py-2 px-3 hover:bg-node-3/10 border border-transparent hover:border-node-3/30 transition-all group"
            >
                <div className="w-8 h-8 bg-node-3/10 rounded-sm flex items-center justify-center shrink-0 group-hover:bg-node-3/20 transition-colors">
                    <Users className="h-4 w-4 text-node-3" />
                </div>
                <div className="flex flex-col items-start gap-0.5">
                    <span className="text-[11px] font-black tracking-tight">Teams List</span>
                    <span className="text-[9px] text-muted-foreground tracking-tighter font-medium text-left">
                        Team List
                    </span>
                </div>
            </Button>

            <Button
                variant="ghost"
                onClick={onAddAnnouncement}
                className="w-full justify-start gap-3 h-auto py-2 px-3 hover:bg-node-4/10 border border-transparent hover:border-node-4/30 transition-all group"
            >
                <div className="w-8 h-8 bg-node-4/10 rounded-sm flex items-center justify-center shrink-0 group-hover:bg-node-4/20 transition-colors">
                    <Megaphone className="h-4 w-4 text-node-4" />
                </div>
                <div className="flex flex-col items-start gap-0.5">
                    <span className="text-[11px] font-black tracking-tight">Announcement Node</span>
                    <span className="text-[9px] text-muted-foreground tracking-tighter font-medium text-left">
                        Display Live Updates
                    </span>
                </div>
            </Button>

            <Button
                variant="ghost"
                onClick={onAddSponsor}
                className="w-full justify-start gap-3 h-auto py-2 px-3 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition-all group"
            >
                <div className="w-8 h-8 bg-red-500/10 rounded-sm flex items-center justify-center shrink-0 group-hover:bg-red-500/20 transition-colors">
                    <Heart className="h-4 w-4 text-red-500" />
                </div>
                <div className="flex flex-col items-start gap-0.5">
                    <span className="text-[11px] font-black tracking-tight">Sponsor Node</span>
                    <span className="text-[9px] text-muted-foreground tracking-tighter font-medium text-left">
                        Display Sponsors (Drag to Order)
                    </span>
                </div>
            </Button>
        </div>
    )
}

