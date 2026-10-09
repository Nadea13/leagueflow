import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tab } from "@/components/ui/tab";
import { Player } from "@/types";
import { cn } from "@/lib/utils";
import { useTranslations, useLocale } from "next-intl";
import { Users, Check, RotateCcw, Search } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

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
    readOnly?: boolean;
    t: (key: string) => string;
    tCommon: (key: string) => string;
    tRoster: (key: string) => string;
    placeholderText?: string;
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
    readOnly = false,
    t,
    tCommon,
    placeholderText
}: TeamRosterColumnProps) {
    return (
        <div className="flex flex-col h-full min-h-0 overflow-hidden bg-transparent">
            {/* Team Header */}
            <div className="p-3 border-b border-border flex items-center justify-between bg-transparent shrink-0">
                <div>
                    <h4 className="text-sm font-black tracking-tight text-foreground truncate max-w-[200px]">{teamName}</h4>
                    <p className="text-[11px] font-bold text-primary tracking-wide">
                        {t("player") || "Players"}: {selectedIds.length}
                    </p>
                </div>
                {!readOnly && (
                    <div className="flex items-center gap-1.5">
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive h-7 w-7 rounded-sm hover:bg-destructive/10"
                            onClick={() => clearAll(team)}
                            title={tCommon("clear")}
                        >
                            <RotateCcw className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Search Bar */}
            <div className="p-3 border-b border-border flex items-center gap-2 bg-transparent shrink-0">
                <div className="relative w-full group">
                    <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-all duration-300" />
                    <Input
                        type="search"
                        size="sm"
                        placeholder={placeholderText || "ค้นหาผู้เล่น..."}
                        value={searchVal}
                        onChange={(e) => setSearchVal(e.target.value)}
                        className="bg-transparent"
                    />
                </div>
            </div>

            {/* Player List - Unified Single Card Pattern */}
            <div className="flex-1 overflow-y-auto min-h-0">
                {filteredPlayers.length === 0 ? (
                    <div className="p-4">
                        <EmptyState
                            icon={Users}
                            description={tCommon("no_results")}
                            className="min-h-[160px] bg-transparent"
                        />
                    </div>
                ) : (
                    <div className="divide-y divide-border border-b border-border bg-transparent">
                        {filteredPlayers.map(player => {
                            const isSelected = selectedIds.includes(player.id);
                            return (
                                <div
                                    key={player.id}
                                    onClick={() => !readOnly && togglePlayer(team, player.id)}
                                    className={cn(
                                        "flex items-center justify-between p-4 transition-all select-none bg-transparent",
                                        !readOnly && "cursor-pointer",
                                        isSelected
                                            ? "bg-primary/10 text-foreground"
                                            : (!readOnly ? "hover:bg-muted/30 text-foreground" : "text-foreground opacity-60")
                                    )}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={cn(
                                            "h-7 w-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 border",
                                            isSelected
                                                ? "border-primary bg-primary text-primary-foreground"
                                                : "border-border bg-transparent text-muted-foreground"
                                        )}>
                                            {player.number ?? "-"}
                                        </div>
                                        <div className="min-w-0 space-y-0.5">
                                            <p className={cn(
                                                "text-sm font-bold truncate leading-tight",
                                                isSelected ? "text-primary" : "text-foreground"
                                            )}>
                                                {player.name}
                                            </p>
                                            <div className="flex items-center gap-1.5">
                                                <Badge
                                                    variant="outline"
                                                    className="text-[10px] font-bold px-1.5 py-0 h-4.5 border-none bg-muted text-muted-foreground rounded-sm"
                                                >
                                                    {player.position || "N/A"}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition-all",
                                        isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-transparent"
                                    )}>
                                        {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
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
    onSave?: (homeActiveIds: string[], awayActiveIds: string[]) => void;
    readOnly?: boolean;
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
    onSave,
    readOnly = false,
}: RosterSelectionDialogProps) {
    const locale = useLocale();
    const isThai = locale === "th";
    const t = useTranslations("Console");
    const tCommon = useTranslations("Common");
    const tRoster = useTranslations("Roster");

    const searchPlaceholder = isThai ? "ค้นหาชื่อ หรือ เบอร์เสื้อ..." : "Search name or number...";

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
        onSave?.(selectedHome, selectedAway);
        onOpenChange(false);
    };

    const isStaffMember = (player: Player) => {
        if (!player.position) return false;
        const pos = player.position.toLowerCase().trim();
        return (
            pos.includes("ผู้จัดการ") ||
            pos.includes("manager") ||
            pos.includes("ผู้ฝึกสอน") ||
            pos.includes("โค้ช") ||
            pos.includes("coach") ||
            pos.includes("staff") ||
            pos.includes("ทีมงาน")
        );
    };

    const eligibleHomePlayers = homePlayers.filter(p => !isStaffMember(p));
    const eligibleAwayPlayers = awayPlayers.filter(p => !isStaffMember(p));

    const filteredHomePlayers = eligibleHomePlayers.filter(p =>
        p.name.toLowerCase().includes(homeSearch.toLowerCase()) ||
        (p.number?.toString() || "").includes(homeSearch)
    );

    const filteredAwayPlayers = eligibleAwayPlayers.filter(p =>
        p.name.toLowerCase().includes(awaySearch.toLowerCase()) ||
        (p.number?.toString() || "").includes(awaySearch)
    );
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent showCloseButton={true} className="w-full h-full sm:h-[85vh] sm:max-h-[90vh] sm:max-w-[700px] flex flex-col bg-card p-0 rounded-none sm:rounded-sm border-none sm:border border-border shadow-2xl overflow-hidden">
                <DialogHeader className="p-4 border-b border-border shrink-0">
                    <DialogTitle className="text-lg md:text-xl font-black tracking-tighter text-foreground leading-none">
                        {t("lineup_selection_title") || "Squad Lineups Selection"}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground mt-1">
                        {t("lineup_selection_desc") || "Select starting players on the field for both teams before starting the match."}
                    </DialogDescription>
                </DialogHeader>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden p-4 min-h-0">
                    {/* Desktop Layout - Single card with divider */}
                    <div className="hidden md:grid grid-cols-2 divide-x divide-border border border-border rounded-sm overflow-hidden h-full bg-transparent">
                        <TeamRosterColumn
                            team="home"
                            teamName={homeTeamName}
                            players={eligibleHomePlayers}
                            filteredPlayers={filteredHomePlayers}
                            selectedIds={selectedHome}
                            searchVal={homeSearch}
                            setSearchVal={setHomeSearch}
                            togglePlayer={togglePlayer}
                            selectAll={selectAll}
                            clearAll={clearAll}
                            readOnly={readOnly}
                            t={t}
                            tCommon={tCommon}
                            tRoster={tRoster}
                            placeholderText={searchPlaceholder}
                        />
                        <TeamRosterColumn
                            team="away"
                            teamName={awayTeamName}
                            players={eligibleAwayPlayers}
                            filteredPlayers={filteredAwayPlayers}
                            selectedIds={selectedAway}
                            searchVal={awaySearch}
                            setSearchVal={setAwaySearch}
                            togglePlayer={togglePlayer}
                            selectAll={selectAll}
                            clearAll={clearAll}
                            readOnly={readOnly}
                            t={t}
                            tCommon={tCommon}
                            tRoster={tRoster}
                            placeholderText={searchPlaceholder}
                        />
                    </div>

                    {/* Mobile Tabs Layout - Single card */}
                    <div className="md:hidden flex flex-col h-full gap-4">
                        <Tab
                            options={[
                                { value: 'home' as const, label: `${homeTeamName} (${selectedHome.length})` },
                                { value: 'away' as const, label: `${awayTeamName} (${selectedAway.length})` }
                            ]}
                            value={activeTab}
                            onChange={setActiveTab}
                            fullWidth
                            className="border border-border"
                        />
                        <div className="flex-1 border border-border rounded-sm overflow-hidden min-h-0 bg-transparent">
                            {activeTab === 'home' ? (
                                <TeamRosterColumn
                                    team="home"
                                    teamName={homeTeamName}
                                    players={eligibleHomePlayers}
                                    filteredPlayers={filteredHomePlayers}
                                    selectedIds={selectedHome}
                                    searchVal={homeSearch}
                                    setSearchVal={setHomeSearch}
                                    togglePlayer={togglePlayer}
                                    selectAll={selectAll}
                                    clearAll={clearAll}
                                    readOnly={readOnly}
                                    t={t}
                                    tCommon={tCommon}
                                    tRoster={tRoster}
                                    placeholderText={searchPlaceholder}
                                />
                            ) : (
                                <TeamRosterColumn
                                    team="away"
                                    teamName={awayTeamName}
                                    players={eligibleAwayPlayers}
                                    filteredPlayers={filteredAwayPlayers}
                                    selectedIds={selectedAway}
                                    searchVal={awaySearch}
                                    setSearchVal={setAwaySearch}
                                    togglePlayer={togglePlayer}
                                    selectAll={selectAll}
                                    clearAll={clearAll}
                                    readOnly={readOnly}
                                    t={t}
                                    tCommon={tCommon}
                                    tRoster={tRoster}
                                    placeholderText={searchPlaceholder}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Controls */}
                <DialogFooter className="p-4 border-t border-border bg-card shrink-0 flex flex-row gap-2 items-center justify-end">
                    {readOnly ? (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            className="w-full sm:w-auto"
                        >
                            {tCommon("close") || "Close"}
                        </Button>
                    ) : (
                        <>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => onOpenChange(false)}
                                className="w-full sm:w-auto"
                            >
                                {tCommon("cancel") || "Cancel"}
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleSave}
                                className="w-full sm:w-auto"
                            >
                                {tCommon("save")}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
