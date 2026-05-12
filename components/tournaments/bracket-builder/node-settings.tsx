"use client";

import React from "react";
import { useBracketStore } from "@/lib/stores/bracket-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Users, Trophy, Zap, Trash2, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export function NodeSettings() {
    const { nodes, updateNodeData, deleteNode } = useBracketStore();
    const selectedNode = nodes.find((node) => node.selected);

    if (!selectedNode) {
        return null;
    }

    const { id, type, data } = selectedNode;

    return (
        <aside className="w-64 border-l bg-card flex flex-col overflow-y-auto shrink-0 animate-in slide-in-from-right">
            <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-primary" />
                    <h3 className="text-xs font-black tracking-widest text-foreground">
                        Node Settings
                    </h3>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteNode(id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            <div className="p-4 space-y-6">
                {/* ── Header based on type ── */}
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-sm border">
                    <div className={`w-8 h-8 rounded flex items-center justify-center ${
                        type === 'groupNode' ? 'bg-violet-500' :
                        type === 'matchNode' ? 'bg-primary' : 
                        type === 'standingNode' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}>
                        {type === 'groupNode' ? <Users className="h-4 w-4 text-white" /> :
                         type === 'matchNode' ? <Trophy className="h-4 w-4 text-white" /> :
                         type === 'standingNode' ? <ListOrdered className="h-4 w-4 text-white" /> :
                         <Zap className="h-4 w-4 text-white" />}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black tracking-widest text-muted-foreground leading-none mb-1">
                            {type?.replace('Node', '')}
                        </span>
                        <span className="text-xs font-bold truncate max-w-[140px]">
                            {data.label as string}
                        </span>
                    </div>
                </div>

                {/* ── Common Settings ── */}
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-black text-muted-foreground tracking-wider">
                            Label
                        </Label>
                        <Input
                            value={data.label as string}
                            onChange={(e) => updateNodeData(id, { label: e.target.value })}
                            className="h-8 text-xs font-bold bg-muted/30 focus-visible:ring-primary"
                        />
                    </div>

                    {/* ── Type Specific Settings ── */}
                    {type === "groupNode" && (
                        <>
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black text-muted-foreground tracking-wider">
                                    Team Count
                                </Label>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={data.teamCount as number}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, "");
                                        updateNodeData(id, { teamCount: parseInt(val, 10) || 0 });
                                    }}
                                    className="h-8 text-xs font-bold bg-muted/30 focus-visible:ring-violet-500"
                                />
                            </div>
                        </>
                    )}

                    {type === "standingNode" && (
                        <div className="space-y-4 pt-2 border-t">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black text-muted-foreground tracking-wider uppercase">
                                    Advancing Teams
                                </Label>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={data.advancingCount as number || 0}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, "");
                                        const num = parseInt(val, 10) || 0;
                                        updateNodeData(id, { advancingCount: Math.min(16, num) });
                                    }}
                                    className="h-8 text-xs font-bold bg-muted/30 focus-visible:ring-emerald-500"
                                />
                                <p className="text-[9px] text-muted-foreground font-medium">Number of teams that move to the next stage.</p>
                            </div>

                            <h4 className="text-[10px] font-black tracking-widest text-muted-foreground uppercase">Column Visibility</h4>
                            <div className="grid gap-4">
                                {[
                                    { label: "Matches Played", key: "showPlayed" },
                                    { label: "Win / Draw / Loss", key: "showWDL", composite: ["showWin", "showDraw", "showLoss"] },
                                    { label: "GF / GA", key: "showG", composite: ["showGF", "showGA"] },
                                    { label: "Goal Difference", key: "showGD" },
                                    { label: "Points", key: "showPts" },
                                    { label: "Form (Last 5)", key: "showForm" },
                                    { label: "Next Match", key: "showNextMatch" },
                                ].map((item) => (
                                    <div key={item.key} className="flex items-center justify-between">
                                        <Label className="text-[11px] font-bold text-foreground leading-none cursor-pointer" htmlFor={item.key}>
                                            {item.label}
                                        </Label>
                                        <Switch
                                            id={item.key}
                                            checked={item.composite 
                                                ? item.composite.every(k => data[k] !== false && (data[k] === true || k === "showWin" || k === "showDraw" || k === "showLoss")) // Some defaults are true
                                                : data[item.key] !== false
                                            }
                                            onCheckedChange={(checked) => {
                                                if (item.composite) {
                                                    const updates: Record<string, boolean> = {};
                                                    item.composite.forEach(k => updates[k] = checked);
                                                    updateNodeData(id, updates);
                                                } else {
                                                    updateNodeData(id, { [item.key]: checked });
                                                }
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {type === "matchNode" && (
                        <div className="space-y-4 pt-2 border-t">
                            <h4 className="text-[10px] font-black tracking-widest text-muted-foreground uppercase">Matches in Node</h4>
                            <div className="space-y-3">
                                {((data.matches as any[]) || []).map((match, idx) => (
                                    <div key={match.id || idx} className="p-2 bg-muted/30 border rounded-sm space-y-2 relative group">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-muted-foreground uppercase">Match #{idx + 1}</span>
                                            {((data.matches as any[]).length > 1) && (
                                                <button
                                                    onClick={() => {
                                                        const next = [...(data.matches as any[])];
                                                        next.splice(idx, 1);
                                                        updateNodeData(id, { matches: next });
                                                    }}
                                                    className="p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid gap-2">
                                            <Input
                                                value={match.placeholderA}
                                                onChange={(e) => {
                                                    const next = [...(data.matches as any[])];
                                                    next[idx] = { ...next[idx], placeholderA: e.target.value };
                                                    updateNodeData(id, { matches: next });
                                                }}
                                                placeholder="Team A"
                                                className="h-7 text-[10px] bg-background"
                                            />
                                            <Input
                                                value={match.placeholderB}
                                                onChange={(e) => {
                                                    const next = [...(data.matches as any[])];
                                                    next[idx] = { ...next[idx], placeholderB: e.target.value };
                                                    updateNodeData(id, { matches: next });
                                                }}
                                                placeholder="Team B"
                                                className="h-7 text-[10px] bg-background"
                                            />
                                        </div>
                                    </div>
                                ))}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full h-8 text-[10px] font-black uppercase tracking-wider gap-2 border-dashed"
                                    onClick={() => {
                                        const next = [...((data.matches as any[]) || [])];
                                        next.push({ id: `m-${Date.now()}-${next.length + 1}`, placeholderA: "TBD", placeholderB: "TBD" });
                                        updateNodeData(id, { matches: next });
                                    }}
                                >
                                    + Add Match to Node
                                </Button>
                            </div>
                        </div>
                    )}

                    {type === "byeNode" && (
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black text-muted-foreground tracking-wider">
                                Team Placeholder
                            </Label>
                            <Input
                                value={data.placeholder as string}
                                onChange={(e) => updateNodeData(id, { placeholder: e.target.value })}
                                className="h-8 text-xs font-bold bg-muted/30 focus-visible:ring-amber-500"
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-auto p-4 border-t bg-muted/10">
                <p className="text-[9px] text-muted-foreground font-bold leading-relaxed">
                    ID: {id}
                </p>
            </div>
        </aside>
    );
}
