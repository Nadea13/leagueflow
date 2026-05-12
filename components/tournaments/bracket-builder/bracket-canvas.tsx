"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import {
    Background,
    BackgroundVariant,
    ConnectionLineType,
    ConnectionMode,
    Controls,
    MiniMap,
    ReactFlow,
    ReactFlowProvider,
    useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Loader2, Plus, RefreshCw, RotateCcw, Save, Users, X, Zap, List, ListOrdered } from "lucide-react";
import { saveBracketCanvas } from "@/actions/organizer/tournaments/bracket";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { useBracketStore } from "@/lib/stores/bracket-store";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { BracketCanvasData, Match } from "@/types";
import { ByeNode } from "./bye-node";
import { GroupNode } from "./group-node";
import { MatchNode } from "./match-node";
import { StandingNode } from "./standing-node";
import { NodeSettings } from "./node-settings";

const nodeTypes = {
    matchNode: MatchNode,
    byeNode: ByeNode,
    groupNode: GroupNode,
    standingNode: StandingNode,
};

interface BracketCanvasProps {
    tournamentId: string;
    tournamentName: string;
    initialCanvasData: BracketCanvasData | null;
    isCompact?: boolean;
    readonly?: boolean;
    onClose?: () => void;
}

interface BracketCanvasTeam {
    id: string;
    name: string;
    logo_url?: string | null;
}

function BracketCanvasInternal({
    tournamentId,
    tournamentName,
    initialCanvasData,
    isCompact = false,
    readonly = false,
    onClose,
}: BracketCanvasProps) {
    const t = useTranslations("Bracket");
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [teams, setTeams] = useState<BracketCanvasTeam[]>([]);
    const { screenToFlowPosition } = useReactFlow();

    const getCenterPos = () => {
        return screenToFlowPosition({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
        });
    };

    useEffect(() => {
        const fetchTeams = async () => {
            const supabase = createClient();
            const { data } = await supabase
                .from("tournament_teams")
                .select("id, name, logo_url")
                .eq("tournament_id", tournamentId)
                .order("name", { ascending: true });

            if (data) {
                setTeams(data as BracketCanvasTeam[]);
            }
        };

        fetchTeams();
    }, [tournamentId]);

    const onDragStart = (event: React.DragEvent, teamName: string) => {
        event.dataTransfer.setData("application/reactflow-team", teamName);
        event.dataTransfer.effectAllowed = "move";
    };

    const {
        nodes,
        edges,
        isDirty,
        onNodesChange,
        onEdgesChange,
        onConnect,
        addMatchNode,
        addByeNode,
        addGroupNode,
        addStandingNode,
        hydrate,
        reset,
        getCanvasData,
        markClean,
    } = useBracketStore();

    useEffect(() => {
        hydrate(initialCanvasData);
    }, [hydrate, initialCanvasData]);

    const handleSave = useCallback(async () => {
        setIsSaving(true);
        try {
            const canvasData = getCanvasData();
            const result = await saveBracketCanvas(tournamentId, canvasData);
            if (result.success) {
                markClean();
                toast({
                    title: "Saved",
                    description: "Bracket canvas saved successfully.",
                });
                return;
            }

            toast({
                title: "Error",
                description: result.error || "Failed to save bracket canvas.",
                variant: "destructive",
            });
        } catch {
            toast({
                title: "Error",
                description: "An unexpected error occurred.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    }, [getCanvasData, markClean, toast, tournamentId]);

    const handleReset = useCallback(() => {
        if (window.confirm("Are you sure you want to clear the entire canvas?")) {
            reset();
        }
    }, [reset]);


    return (
        <div className={cn("flex flex-col bg-background border", isCompact ? "h-[700px]" : "h-[calc(100vh-64px)]")}>
            <div className="flex items-center justify-between px-4 py-2 border-b bg-card">
                <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black tracking-widest text-muted-foreground uppercase">
                            Bracket Builder
                        </span>
                        <span className="text-sm font-bold tracking-tight truncate max-w-[200px]">
                            {tournamentName}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {onClose && (
                        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                    {isDirty && (
                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/20">
                            Unsaved Changes
                        </Badge>
                    )}
                    {!readonly && (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleReset}
                                className="h-8 text-[10px] font-black tracking-widest uppercase"
                            >
                                <RotateCcw className="h-3 w-3" />
                                Reset
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSave}
                                disabled={isSaving || !isDirty}
                                className="h-8 text-[10px] font-black tracking-widest uppercase"
                            >
                                {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                {t("export")}
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {!readonly && (
                    <aside className="w-56 border-r bg-card p-3 flex flex-col gap-3 shrink-0">
                        <div className="space-y-1">
                            <h3 className="text-xs font-black tracking-widest text-muted-foreground uppercase">
                                Tools
                            </h3>
                        </div>

                        <div className="flex flex-col gap-2">
                            <Button
                                variant="ghost"
                                onClick={() => addMatchNode(getCenterPos())}
                                className="w-full justify-start gap-3 h-auto py-3 px-3 bg-muted/30 hover:bg-primary/10 border border-transparent hover:border-primary/30 transition-all group"
                            >
                                <div className="w-8 h-8 bg-primary/10 rounded-sm flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                                    <Plus className="h-4 w-4 text-primary" />
                                </div>
                                <div className="flex flex-col items-start gap-0.5">
                                    <span className="text-[11px] font-black tracking-tight uppercase">Add Match</span>
                                    <span className="text-[9px] text-muted-foreground tracking-tighter uppercase font-medium">
                                        Knockout Slot
                                    </span>
                                </div>
                            </Button>

                            <Button
                                variant="ghost"
                                onClick={() => addByeNode(getCenterPos())}
                                className="w-full justify-start gap-3 h-auto py-3 px-3 bg-muted/30 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/30 transition-all group"
                            >
                                <div className="w-8 h-8 bg-amber-500/10 rounded-sm flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-colors">
                                    <Zap className="h-4 w-4 text-amber-500" />
                                </div>
                                <div className="flex flex-col items-start gap-0.5">
                                    <span className="text-[11px] font-black tracking-tight uppercase">Add Bye Team</span>
                                    <span className="text-[9px] text-muted-foreground tracking-tighter uppercase font-medium">
                                        Skip Round
                                    </span>
                                </div>
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => addGroupNode(getCenterPos())}
                                className="w-full justify-start gap-3 h-auto py-3 px-3 bg-muted/30 hover:bg-violet-500/10 border border-transparent hover:border-violet-500/30 transition-all group"
                            >
                                <div className="w-8 h-8 bg-violet-500/10 rounded-sm flex items-center justify-center shrink-0 group-hover:bg-violet-500/20 transition-colors">
                                    <Users className="h-4 w-4 text-violet-500" />
                                </div>
                                <div className="flex flex-col items-start gap-0.5">
                                    <span className="text-[11px] font-black tracking-tight uppercase">Add Group</span>
                                    <span className="text-[9px] text-muted-foreground tracking-tighter uppercase font-medium">
                                        Stage / Pool
                                    </span>
                                </div>
                            </Button>

                            <Button
                                variant="ghost"
                                onClick={() => addStandingNode(getCenterPos())}
                                className="w-full justify-start gap-3 h-auto py-3 px-3 bg-muted/30 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/30 transition-all group"
                            >
                                <div className="w-8 h-8 bg-emerald-500/10 rounded-sm flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-colors">
                                    <ListOrdered className="h-4 w-4 text-emerald-500" />
                                </div>
                                <div className="flex flex-col items-start gap-0.5">
                                    <span className="text-[11px] font-black tracking-tight uppercase">Add Standing</span>
                                    <span className="text-[9px] text-muted-foreground tracking-tighter uppercase font-medium">
                                        Group Ranking
                                    </span>
                                </div>
                            </Button>
                        </div>

                        <div className="text-[10px] text-muted-foreground space-y-1.5 border-t pt-3">
                            <div className="flex justify-between">
                                <span>Elements</span>
                                <span className="text-foreground font-bold">{nodes.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Connections</span>
                                <span className="text-foreground font-bold">{edges.length}</span>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col min-h-0 text-[10px] text-muted-foreground border-t pt-3">
                            <div className="flex-1 overflow-y-auto px-1 py-2 space-y-2 custom-scrollbar">
                                <div className="flex items-center gap-2 mb-4">
                                    <List className="h-4 w-4 text-primary" />
                                    <h3 className="text-[11px] font-black uppercase tracking-widest text-foreground">
                                        Participating Teams ({teams.length})
                                    </h3>
                                </div>

                                {teams.length === 0 ? (
                                    <div className="text-center py-2 border border-dashed rounded-sm bg-muted/20">
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold">No teams registered</span>
                                    </div>
                                ) : (
                                    <div className="grid gap-2">
                                        {teams.map((team) => (
                                            <div
                                                key={team.id}
                                                draggable
                                                onDragStart={(event) => onDragStart(event, team.name)}
                                                className="flex items-center gap-3 p-3 bg-muted/40 border border-border/50 rounded-sm cursor-grab active:cursor-grabbing hover:bg-primary/5 hover:border-primary/30 transition-all group"
                                            >
                                                <div className="w-6 h-6 rounded-full border bg-background flex items-center justify-center shrink-0 overflow-hidden group-hover:border-primary/50 transition-colors">
                                                    {team.logo_url ? (
                                                        <Image
                                                            src={team.logo_url}
                                                            alt={team.name}
                                                            width={24}
                                                            height={24}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <Users className="h-3 w-3 text-muted-foreground/40" />
                                                    )}
                                                </div>
                                                <span className="text-[11px] font-black truncate flex-1 tracking-tight">
                                                    {team.name}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-8 p-4 bg-primary/5 border border-primary/10 rounded-sm">
                                    <p className="text-[10px] text-primary/70 font-bold uppercase leading-relaxed">
                                        <Zap className="h-3 w-3 inline mr-1 mb-1" />
                                        Pro Tip: Drag a team from this list and drop it onto a &quot;TBD&quot; slot to assign it!
                                    </p>
                                </div>
                            </div>
                        </div>
                    </aside>
                )}

                <div className="flex-1 relative">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={readonly ? undefined : onNodesChange}
                        onEdgesChange={readonly ? undefined : onEdgesChange}
                        onConnect={readonly ? undefined : onConnect}
                        nodeTypes={nodeTypes}
                        fitView
                        minZoom={0.1}
                        maxZoom={1.5}
                        nodesDraggable={!readonly}
                        nodesConnectable={!readonly}
                        elementsSelectable={!readonly}
                        panOnDrag={!readonly}
                        panOnScroll={!readonly}
                        zoomOnScroll={!readonly}
                        zoomOnPinch={!readonly}
                        zoomOnDoubleClick={!readonly}
                        deleteKeyCode={readonly ? null : ["Backspace", "Delete"]}
                        autoPanOnConnect={!readonly}
                        autoPanOnNodeDrag={!readonly}
                        colorMode="light"
                        connectionMode={ConnectionMode.Loose}
                        connectionRadius={50}
                        connectionLineStyle={{ stroke: "#00c692", strokeWidth: 2 }}
                        connectionLineType={ConnectionLineType.Step}
                        snapToGrid
                        snapGrid={[10, 10]}
                        defaultEdgeOptions={{
                            type: "smoothstep",
                            style: {
                                stroke: "#00c692",
                                strokeWidth: 2,
                            },
                        }}
                    >
                        <Background color="#333" variant={BackgroundVariant.Dots} gap={20} size={1} style={{ opacity: 1 }} />
                        <Controls className="!bg-card !border-border !rounded-none !shadow-none [&>button]:!bg-card [&>button]:!border-border [&>button:hover]:!bg-muted" />
                        <MiniMap
                            className="!bg-card !border-border !shadow-none"
                            nodeColor="hsl(var(--primary))"
                            maskColor="hsl(var(--card) / 0.5)"
                            style={{
                                background: "hsl(var(--card))",
                                height: 120,
                            }}
                            zoomable
                            pannable
                        />
                    </ReactFlow>
                </div>

                {!readonly && <NodeSettings />}
            </div>
        </div>
    );
}

export function BracketCanvas(props: BracketCanvasProps) {
    return (
        <ReactFlowProvider>
            <BracketCanvasInternal {...props} />
        </ReactFlowProvider>
    );
}
