import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tab } from "@/components/ui/tab";
import { Player } from "@/types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Users, Check } from "lucide-react";

interface TeamRosterColumnProps {
    team: 'home' | 'away';
    teamName: string;
    players: Player[];
    filteredPlayers: Player[];
    selectedIds: string[];
    searchVal: string;
    setSearchVal: (val: string) => void;
    togglePlayer: (team: 'home' | 'away', playerId: string) => void;
    selectAll: (team: 'home' | 'away', players: Player[]) => void;
    clearAll: (team: 'home' | 'away') => void;
    t: (key: string) => string;
    tCommon: (key: string) => string;
    tRoster: (key: string) => string;
}

function TeamRosterColumn({
    team,
    teamName,
    filteredPlayers,
    selectedIds,
    searchVal,
    setSearchVal,
    togglePlayer,
    clearAll,
    t,
    tCommon
}: TeamRosterColumnProps) {
    return (
        <div className="flex flex-col border rounded-lg overflow-hidden">
            {/* Team Header */}
            <div className="p-1 md:p-2 border-b flex items-center justify-between">
                <div>
                    <h4 className="font-black tracking-tight text-foreground truncate max-w-[200px]">{teamName}</h4>
                    <p className="text-[10px] font-bold text-primary tracking-widest">
                        {t("player") || "Players"}: {selectedIds.length}
                    </p>
                </div>
                <div className="flex items-center gap-1.5">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => clearAll(team)}
                    >
                        {tCommon("clear")}
                    </Button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="p-1 md:p-2 border-b flex items-center gap-1 md:gap-2">
                <Input
                    placeholder={tCommon("search") || "Search player..."}
                    value={searchVal}
                    onChange={(e) => setSearchVal(e.target.value)}
                />
            </div>

            {/* Player List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {filteredPlayers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-center p-4">
                        <Users className="h-8 w-8 text-muted-foreground/30 mb-2" />
                        <p className="text-xs font-bold text-muted-foreground">{tCommon("no_results") || "No players found"}</p>
                    </div>
                ) : (
                    filteredPlayers.map(player => {
                        const isSelected = selectedIds.includes(player.id);
                        return (
                            <div
                                key={player.id}
                                onClick={() => togglePlayer(team, player.id)}
                                className={cn(
                                    "flex items-center justify-between p-1 md:p-2 rounded-lg border transition-all cursor-pointer select-none",
                                    isSelected
                                        ? "border-primary bg-primary/5 text-primary-foreground"
                                        : "hover:border-border hover:bg-muted/10 text-foreground"
                                )}
                            >
                                <div className="flex items-center gap-1 md:gap-2 min-w-0">
                                    <div className={cn(
                                        "h-7 w-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 border",
                                        isSelected
                                            ? "border-primary bg-primary text-black"
                                            : "text-muted-foreground"
                                    )}>
                                        {player.number ?? "-"}
                                    </div>
                                    <div className="min-w-0">
                                        <p className={cn(
                                            "text-xs font-black truncate",
                                            isSelected ? "text-primary" : "text-foreground"
                                        )}>
                                            {player.name}
                                        </p>
                                        <div className="flex items-center gap-1">
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-[8px] font-extrabold px-1 py-0 h-4 border-none bg-muted/20 text-muted-foreground"
                                                )}
                                            >
                                                {player.position || "N/A"}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                <div className={cn(
                                    "h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition-all",
                                    isSelected ? "border-primary bg-primary text-black" : ""
                                )}>
                                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

interface RosterSelectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    homeTeamName: string;
    awayTeamName: string;
    homePlayers: Player[];
    awayPlayers: Player[];
    homeActiveIds: string[];
    awayActiveIds: string[];
    onSave: (homeActiveIds: string[], awayActiveIds: string[]) => void;
}

export function RosterSelectionDialog({
    open,
    onOpenChange,
    homeTeamName,
    awayTeamName,
    homePlayers,
    awayPlayers,
    homeActiveIds,
    awayActiveIds,
    onSave
}: RosterSelectionDialogProps) {
    const t = useTranslations("Console");
    const tCommon = useTranslations("Common");
    const tRoster = useTranslations("Roster");

    const [selectedHome, setSelectedHome] = useState<string[]>([]);
    const [selectedAway, setSelectedAway] = useState<string[]>([]);
    const [homeSearch, setHomeSearch] = useState("");
    const [awaySearch, setAwaySearch] = useState("");
    const [activeTab, setActiveTab] = useState<'home' | 'away'>('home');

    // Initialize selections when dialog opens or active IDs change
    useEffect(() => {
        if (open) {
            const timer = setTimeout(() => {
                setSelectedHome(homeActiveIds);
                setSelectedAway(awayActiveIds);
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [open, homeActiveIds, awayActiveIds]);

    const togglePlayer = (team: 'home' | 'away', playerId: string) => {
        if (team === 'home') {
            setSelectedHome(prev =>
                prev.includes(playerId)
                    ? prev.filter(id => id !== playerId)
                    : [...prev, playerId]
            );
        } else {
            setSelectedAway(prev =>
                prev.includes(playerId)
                    ? prev.filter(id => id !== playerId)
                    : [...prev, playerId]
            );
        }
    };

    const selectAll = (team: 'home' | 'away', players: Player[]) => {
        const ids = players.map(p => p.id);
        if (team === 'home') {
            setSelectedHome(ids);
        } else {
            setSelectedAway(ids);
        }
    };

    const clearAll = (team: 'home' | 'away') => {
        if (team === 'home') {
            setSelectedHome([]);
        } else {
            setSelectedAway([]);
        }
    };

    const handleSave = () => {
        onSave(selectedHome, selectedAway);
        onOpenChange(false);
    };

    const filteredHomePlayers = homePlayers.filter(p =>
        p.name.toLowerCase().includes(homeSearch.toLowerCase()) ||
        (p.number?.toString() || "").includes(homeSearch)
    );

    const filteredAwayPlayers = awayPlayers.filter(p =>
        p.name.toLowerCase().includes(awaySearch.toLowerCase()) ||
        (p.number?.toString() || "").includes(awaySearch)
    );



    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-card p-0 overflow-hidden max-w-4xl w-[95vw] rounded-xl flex flex-col h-[90vh] md:h-[650px] shadow-2xl">
                <DialogHeader className="p-2 md:p-4 border-b shrink-0">
                    <DialogTitle className="flex items-center text-2xl font-black tracking-tighter text-foreground">
                        {t("lineup_selection_title") || "Squad Lineups Selection"}
                    </DialogTitle>
                    <DialogDescription className="text-xs font-bold text-muted-foreground">
                        {t("lineup_selection_desc") || "Select starting players on the field for both teams before starting the match."}
                    </DialogDescription>
                </DialogHeader>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden p-2 md:p-4">
                    {/* Desktop Layout */}
                    <div className="hidden md:grid grid-cols-2 gap-1 md:gap-2 h-full">
                        <TeamRosterColumn
                            team="home"
                            teamName={homeTeamName}
                            players={homePlayers}
                            filteredPlayers={filteredHomePlayers}
                            selectedIds={selectedHome}
                            searchVal={homeSearch}
                            setSearchVal={setHomeSearch}
                            togglePlayer={togglePlayer}
                            selectAll={selectAll}
                            clearAll={clearAll}
                            t={t}
                            tCommon={tCommon}
                            tRoster={tRoster}
                        />
                        <TeamRosterColumn
                            team="away"
                            teamName={awayTeamName}
                            players={awayPlayers}
                            filteredPlayers={filteredAwayPlayers}
                            selectedIds={selectedAway}
                            searchVal={awaySearch}
                            setSearchVal={setAwaySearch}
                            togglePlayer={togglePlayer}
                            selectAll={selectAll}
                            clearAll={clearAll}
                            t={t}
                            tCommon={tCommon}
                            tRoster={tRoster}
                        />
                    </div>

                    {/* Mobile Tabs Layout */}
                    <div className="md:hidden flex flex-col h-full gap-2">
                        <Tab
                            options={[
                                { value: 'home' as const, label: `${homeTeamName} (${selectedHome.length})` },
                                { value: 'away' as const, label: `${awayTeamName} (${selectedAway.length})` }
                            ]}
                            value={activeTab}
                            onChange={setActiveTab}
                            fullWidth
                            className="border"
                        />
                        <div className="flex-1 overflow-hidden">
                            {activeTab === 'home' ? (
                                <TeamRosterColumn
                                    team="home"
                                    teamName={homeTeamName}
                                    players={homePlayers}
                                    filteredPlayers={filteredHomePlayers}
                                    selectedIds={selectedHome}
                                    searchVal={homeSearch}
                                    setSearchVal={setHomeSearch}
                                    togglePlayer={togglePlayer}
                                    selectAll={selectAll}
                                    clearAll={clearAll}
                                    t={t}
                                    tCommon={tCommon}
                                    tRoster={tRoster}
                                />
                            ) : (
                                <TeamRosterColumn
                                    team="away"
                                    teamName={awayTeamName}
                                    players={awayPlayers}
                                    filteredPlayers={filteredAwayPlayers}
                                    selectedIds={selectedAway}
                                    searchVal={awaySearch}
                                    setSearchVal={setAwaySearch}
                                    togglePlayer={togglePlayer}
                                    selectAll={selectAll}
                                    clearAll={clearAll}
                                    t={t}
                                    tCommon={tCommon}
                                    tRoster={tRoster}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <DialogFooter className="p-2 md:p-4 border-t shrink-0 flex flex-row gap-1 md:gap-2 items-center">
                    <Button
                        type="button"
                        onClick={handleSave}
                        className="w-full"
                    >
                        {tCommon("save")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
