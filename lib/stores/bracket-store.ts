import { create } from "zustand";
import {
    Node,
    Edge,
    Connection,
    addEdge,
    applyNodeChanges,
    applyEdgeChanges,
    NodeChange,
    EdgeChange,
} from "@xyflow/react";
import { BracketCanvasData, Match, TournamentTeam } from "@/types";
import { createClient } from "@/lib/supabase/client";

export interface MatchNodeData {
    label: string;
    matches: {
        id: string;
        placeholderA: string;
        placeholderB: string;
        match_date?: string;
        match_time?: string;
        dbId?: string;
        matchId?: string;
    }[];
    [key: string]: unknown;
}

interface BracketState {
    nodes: Node[];
    edges: Edge[];
    nodeCounter: number;
    isDirty: boolean;

    // Actions
    onNodesChange: (changes: NodeChange[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    onConnect: (connection: Connection) => void;
    addMatchNode: (position?: { x: number; y: number }) => void;

    addGroupNode: (position?: { x: number; y: number }) => void;
    addStandingNode: (position?: { x: number; y: number }) => void;
    addTeamListNode: (teams: TournamentTeam[], position?: { x: number; y: number }) => void;
    addAnnouncementNode: (tournamentId: string, readonly: boolean, position?: { x: number; y: number }) => void;
    generateRoundRobinMatches: (groupId: string) => void;
    deleteNode: (id: string) => void;
    hydrate: (data: BracketCanvasData | null) => void;
    reset: () => void;
    getCanvasData: () => BracketCanvasData;
    markClean: () => void;
    syncMatches: (matches: Match[]) => void;
    updateNodeData: (id: string, newData: Record<string, unknown>) => void;
    selectNode: (id: string | null) => void;
    teams: TournamentTeam[];
    setTeams: (teams: TournamentTeam[]) => void;
    fetchTeams: (categoryId: string) => Promise<void>;
    activeNodeId: string | null;
    setActiveNodeId: (id: string | null) => void;
    activeCategoryId: string | null;
    setActiveCategoryId: (id: string | null) => void;
}

let teamFetchRequestId = 0;

export const useBracketStore = create<BracketState>((set, get) => ({
    nodes: [],
    edges: [],
    nodeCounter: 0,
    isDirty: false,
    teams: [],
    activeNodeId: null,
    setActiveNodeId: (id) => set({ activeNodeId: id }),
    activeCategoryId: null,
    setActiveCategoryId: (id) => set({ activeCategoryId: id }),

    setTeams: (teams) => set({ teams }),
    fetchTeams: async (categoryId) => {
        if (!categoryId) return;
        const requestId = ++teamFetchRequestId;
        const supabase = createClient();
        const { data, error } = await supabase
            .from("tournament_teams")
            .select("*, team:teams(id, name, logo_img)")
            .eq("tournament_category_id", categoryId)
            .is("deleted_at", null)
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Failed to fetch tournament category teams:", error);
            return;
        }

        const activeCategoryId = get().activeCategoryId;
        if (requestId !== teamFetchRequestId || (activeCategoryId && activeCategoryId !== categoryId)) {
            return;
        }

        if (data) {
            const mappedTeams = (data as {
                id: string;
                team: {
                    id: string;
                    name: string;
                    logo_img: string | null;
                } | null;
                name?: string | null;
                [key: string]: unknown;
            }[]).map((t) => ({
                ...t,
                name: t.team?.name || t.name || "Unknown Team",
                logo_url: t.team?.logo_img || null,
            })) as unknown as TournamentTeam[];
            set({ teams: mappedTeams });
        }
    },

    onNodesChange: (changes) => {
        set((state) => {
            const nextNodes = applyNodeChanges(changes, state.nodes);
            
            const hasRealChange = changes.some(c => 
                c.type === 'position' || 
                c.type === 'remove' || 
                c.type === 'add' ||
                (c.type === 'dimensions' && c.dimensions)
            );

            if (hasRealChange) {
                console.log("Real Node Change Detected:", changes.map(c => c.type));
            }

            return {
                nodes: nextNodes,
                isDirty: state.isDirty || hasRealChange,
            };
        });
    },

    onEdgesChange: (changes) => {
        set((state) => {
            const nextEdges = applyEdgeChanges(changes, state.edges);
            const hasRealChange = changes.some(c => c.type === 'remove' || c.type === 'add');
            
            if (hasRealChange) {
                console.log("Real Edge Change Detected:", changes.map(c => c.type));
            }

            return {
                edges: nextEdges,
                isDirty: state.isDirty || hasRealChange,
            };
        });
    },

    onConnect: (connection: Connection) => {
        const { nodes, updateNodeData } = get();
        const sourceNode = nodes.find(n => n.id === connection.source);
        const targetNode = nodes.find(n => n.id === connection.target);

        if (!sourceNode || !targetNode) return;
                
        // Propagate team from Bye/Group/TeamList to Match slot on connect
        if (targetNode.type === 'matchNode') {
            let teamName = null;
            if (sourceNode.type === 'teamListNode') {
                const sourceHandle = connection.sourceHandle || '';
                const teamIdMatch = sourceHandle.match(/team-(.+)/);
                if (teamIdMatch) {
                    const teamId = teamIdMatch[1];
                    const teams = (sourceNode.data.teams as TournamentTeam[])?.length ? (sourceNode.data.teams as TournamentTeam[]) : get().teams;
                    const team = teams.find(t => t.id === teamId);
                    teamName = team?.name || "TBD";
                }
            } else if (sourceNode.type === 'groupNode' || sourceNode.type === 'standingNode') {
                const sourceHandle = connection.sourceHandle || '';
                const rankMatch = sourceHandle.match(/rank-(\d+)/);
                if (rankMatch) {
                    const rankIndex = parseInt(rankMatch[1], 10);
                    const rankSuffix = rankIndex === 0 ? "1st" : rankIndex === 1 ? "2nd" : rankIndex === 2 ? "3rd" : `${rankIndex + 1}th`;
                    teamName = `${rankSuffix} Place (${sourceNode.data.label})`;
                } else {
                    teamName = "Group Winner";
                }
            }

            if (teamName && teamName !== "TBD") {
                const targetHandle = connection.targetHandle || '';
                const matchIndexMatch = targetHandle.match(/slot-(a|b)-(\d+)/);
                
                if (matchIndexMatch) {
                    const [_, slot, indexStr] = matchIndexMatch;
                    const index = parseInt(indexStr, 10);
                    const matches = Array.isArray(targetNode.data.matches) ? [...targetNode.data.matches] : [];
                    
                    if (matches[index]) {
                        matches[index] = {
                            ...matches[index],
                            [slot === 'a' ? 'placeholderA' : 'placeholderB']: teamName
                        };
                        updateNodeData(targetNode.id, { matches });
                    }
                } else if (targetHandle === 'slot-a' || targetHandle === 'slot-b') {
                    // Legacy support
                    const field = targetHandle === 'slot-a' ? 'placeholderA' : 'placeholderB';
                    updateNodeData(targetNode.id, { [field]: teamName });
                }
            }
        }

        // Propagate group data to StandingNode on connect (handle both directions)
        const groupNode = sourceNode.type === 'groupNode' ? sourceNode : targetNode.type === 'groupNode' ? targetNode : null;
        const standingNode = sourceNode.type === 'standingNode' ? sourceNode : targetNode.type === 'standingNode' ? targetNode : null;

        if (groupNode && standingNode) {
            updateNodeData(standingNode.id, { 
                sourceGroupId: groupNode.id,
                teamCount: groupNode.data.teamCount,
                teams: groupNode.data.teams,
                label: `Standings: ${groupNode.data.label}`
            });
        }

        // Special handling for Group -> MatchNode (top handle)
        if (targetNode.type === 'matchNode' && connection.targetHandle === 'group-in') {
            if (sourceNode.type === 'groupNode') {
                // Sync teams to the CURRENT node instead of creating a new one
                
                // Balanced Round Robin Algorithm (Circle Method)
                const teamCount = (sourceNode.data.teamCount as number) || 0;
                const teams = (sourceNode.data.teams as string[]) || [];
                
                const pairings = [];
                if (teamCount >= 2) {
                    let n = teamCount;
                    const isOdd = n % 2 !== 0;
                    if (isOdd) n++;

                    const indices = Array.from({ length: n }).map((_, i) => i);
                    
                    for (let r = 0; r < n - 1; r++) {
                        for (let i = 0; i < n / 2; i++) {
                            const a = indices[i];
                            const b = indices[n - 1 - i];

                            // Skip dummy team if odd
                            if (isOdd && (a === n - 1 || b === n - 1)) continue;

                            // Balance Home/Away: alternate based on round and position
                            const isHome = (i + r) % 2 === 0;
                            pairings.push({
                                id: `m-${Date.now()}-${r}-${i}`,
                                placeholderA: teams[isHome ? a : b] || `Team ${(isHome ? a : b) + 1}`,
                                placeholderB: teams[isHome ? b : a] || `Team ${(isHome ? b : a) + 1}`
                            });
                        }
                        // Rotate indices (keep first fixed)
                        indices.splice(1, 0, indices.pop()!);
                    }
                }

                updateNodeData(targetNode.id, { 
                    label: `Matches: ${sourceNode.data.label}`,
                    matches: pairings 
                });
            } else {
                return; // Only allow GroupNode to connect to group-in
            }
        }

        // Special handling for Team Source -> GroupNode (left handles)
        const teamInMatch = connection.targetHandle?.match(/team-in-(\d+)/);
        if (targetNode.type === 'groupNode' && teamInMatch) {
            const index = parseInt(teamInMatch[1], 10);
            let teamName = null;
            if (sourceNode.type === 'teamListNode') {
                const sourceHandle = connection.sourceHandle || '';
                const teamIdMatch = sourceHandle.match(/team-(.+)/);
                if (teamIdMatch) {
                    const teamId = teamIdMatch[1];
                    const teams = (sourceNode.data.teams as TournamentTeam[])?.length ? (sourceNode.data.teams as TournamentTeam[]) : get().teams;
                    const team = teams.find(t => t.id === teamId);
                    teamName = team?.name || "TBD";
                }
            } else if (sourceNode.type === 'groupNode' || sourceNode.type === 'standingNode') {
                const sourceHandle = connection.sourceHandle || '';
                const rankMatch = sourceHandle.match(/rank-(\d+)/);
                if (rankMatch) {
                    const rankIndex = parseInt(rankMatch[1], 10);
                    const rankSuffix = rankIndex === 0 ? "1st" : rankIndex === 1 ? "2nd" : rankIndex === 2 ? "3rd" : `${rankIndex + 1}th`;
                    teamName = `${rankSuffix} Place (${sourceNode.data.label})`;
                } else {
                    teamName = sourceNode.type === 'groupNode' ? "Group Winner" : "Standing Advancer";
                }
            }

            if (typeof teamName === "string" && teamName !== "TBD") {
                const nextTeams = [...((targetNode.data.teams as string[]) || [])];
                while (nextTeams.length <= index) nextTeams.push("TBD");
                nextTeams[index] = teamName;
                updateNodeData(targetNode.id, { teams: nextTeams });
            }
        }

        set((state) => ({
            edges: addEdge(
                {
                    ...connection,
                    type: "bezier",
                    animated: false,
                    style: { 
                        stroke: "var(--border)", 
                        strokeWidth: 2,
                    },
                },
                state.edges
            ),
            isDirty: true,
        }));
    },

    addMatchNode: (position) => {
        const { nodeCounter, nodes } = get();
        const nextIndex = nodeCounter + 1;

        // Auto-position in a grid if no position provided
        const col = Math.floor(nodes.length / 4);
        const row = nodes.length % 4;
        const pos = position ?? { x: col * 320, y: row * 160 };

        const newNode: Node<MatchNodeData> = {
            id: `match-${nextIndex}-${Date.now()}`,
            type: "matchNode",
            position: pos,
            data: {
                label: `Match #${nextIndex}`,
                matches: [],
            },
        };

        set({
            nodes: [...nodes, newNode],
            nodeCounter: nextIndex,
            isDirty: true,
        });
    },



    addGroupNode: (position) => {
        const { nodes } = get();
        
        const col = Math.floor(nodes.length / 4);
        const row = nodes.length % 4;
        const pos = position ?? { x: col * 320, y: row * 160 + 100 };

        const newNode: Node = {
            id: `group-${Date.now()}`,
            type: "groupNode",
            position: pos,
            data: {
                label: "Group A",
                teamCount: 0,
                advancingCount: 0,
            },
        };

        set({
            nodes: [...nodes, newNode],
            isDirty: true,
        });
    },

    addStandingNode: (position) => {
        const { nodes } = get();
        
        const col = Math.floor(nodes.length / 4);
        const row = nodes.length % 4;
        const pos = position ?? { x: col * 320, y: row * 160 + 150 };

        const newNode: Node = {
            id: `standing-${Date.now()}`,
            type: "standingNode",
            position: pos,
            data: {
                label: "Standings",
                teamCount: 0,
            },
        };

        set({
            nodes: [...nodes, newNode],
            isDirty: true,
        });
    },

    addTeamListNode: (teams, position) => {
        const { nodes } = get();
        
        const col = Math.floor(nodes.length / 4);
        const row = nodes.length % 4;
        const pos = position ?? { x: col * 320, y: row * 160 + 200 };

        const newNode: Node = {
            id: `team-list-${Date.now()}`,
            type: "teamListNode",
            position: pos,
            data: {
                label: "Team List",
            },
        };

        set({
            nodes: [...nodes, newNode],
            isDirty: true,
        });
    },
    
    addAnnouncementNode: (tournamentId, readonly, position) => {
        const { nodes } = get();
        const col = Math.floor(nodes.length / 4);
        const row = nodes.length % 4;
        const pos = position ?? { x: col * 320, y: row * 160 + 250 };

        const newNode: Node = {
            id: `announcement-${Date.now()}`,
            type: "announcementNode",
            position: pos,
            data: {
                tournamentId,
                readonly
            },
        };

        set({
            nodes: [...nodes, newNode],
            isDirty: true,
        });
    },

    generateRoundRobinMatches: (groupId: string) => {
        const { nodes, edges } = get();
        const groupNode = nodes.find(n => n.id === groupId);
        if (!groupNode || groupNode.type !== 'groupNode') return;

        const teamCount = (groupNode.data.teamCount as number) || 0;
        const teams = (groupNode.data.teams as string[]) || [];
        const label = groupNode.data.label as string;
        
        // Balanced Round Robin Algorithm (Circle Method)
        const pairings = [];
        if (teamCount >= 2) {
            let n = teamCount;
            const isOdd = n % 2 !== 0;
            if (isOdd) n++;

            const indices = Array.from({ length: n }).map((_, i) => i);
            
            for (let r = 0; r < n - 1; r++) {
                for (let i = 0; i < n / 2; i++) {
                    const a = indices[i];
                    const b = indices[n - 1 - i];

                    if (isOdd && (a === n - 1 || b === n - 1)) continue;

                    const isHome = (i + r) % 2 === 0;
                    pairings.push({
                        id: `m-${Date.now()}-${r}-${i}`,
                        placeholderA: teams[isHome ? a : b] || `Team ${(isHome ? a : b) + 1}`,
                        placeholderB: teams[isHome ? b : a] || `Team ${(isHome ? b : a) + 1}`
                    });
                }
                indices.splice(1, 0, indices.pop()!);
            }
        }

        if (pairings.length === 0) return;

        // Create new match node
        const matchNodeId = `match-rr-${Date.now()}`;
        const newMatchNode: Node = {
            id: matchNodeId,
            type: "matchNode",
            position: { x: groupNode.position.x + 350, y: groupNode.position.y },
            data: {
                label: `Matches: ${label}`,
                matches: pairings
            }
        };

        // Create edge
        const newEdge: Edge = {
            id: `edge-rr-${Date.now()}`,
            source: groupId,
            target: matchNodeId,
            sourceHandle: 'group-matches',
            type: 'bezier',
            style: { stroke: 'var(--border)', strokeWidth: 2 }
        };

        set({
            nodes: [...nodes, newMatchNode],
            edges: [...edges, newEdge],
            isDirty: true
        });
    },

    deleteNode: (id) => {
        set((state) => ({
            nodes: state.nodes.filter((n) => n.id !== id),
            edges: state.edges.filter((e) => e.source !== id && e.target !== id),
            isDirty: true,
        }));
    },

    hydrate: (data) => {
        if (!data) {
            set({ nodes: [], edges: [], nodeCounter: 0, isDirty: false });
            return;
        }
        if (!data) return;
        set({
            nodes: data.nodes || [],
            edges: (data.edges || []).map(edge => {
                const sourceNode = (data.nodes || []).find(n => n.id === edge.source);
                const targetNode = (data.nodes || []).find(n => n.id === edge.target);
                const isGroupToMatch = sourceNode?.type === 'groupNode' && targetNode?.type === 'matchNode';
                return {
                    ...edge,
                    animated: false,
                    style: {
                        ...edge.style,
                        stroke: "var(--border)",
                        strokeDasharray: isGroupToMatch ? "5,5" : (edge.style?.strokeDasharray || "none"),
                    }
                };
            }),
            nodeCounter: data.nodes?.length || 0,
            isDirty: false,
        });
    },

    reset: () => {
        set({ nodes: [], edges: [], nodeCounter: 0, isDirty: true });
    },

    getCanvasData: () => {
        const { nodes, edges } = get();
        return { nodes, edges };
    },

    markClean: () => {
        set({ isDirty: false });
    },
    syncMatches: (matches) => {
        const { nodes, nodeCounter } = get();
        const existingMatchIds = new Set(
            nodes
                .filter((node) => node.type === "matchNode")
                .map((node) => (node.data as MatchNodeData | undefined)?.matchId)
                .filter((matchId): matchId is string => typeof matchId === "string")
        );

        const newNodes: Node[] = [];
        let currentCounter = nodeCounter;

        matches.forEach((m) => {
            if (!existingMatchIds.has(m.id)) {
                currentCounter++;
                const col = Math.floor((nodes.length + newNodes.length) / 4);
                const row = (nodes.length + newNodes.length) % 4;
                
                newNodes.push({
                    id: `match-${m.id}-${Date.now()}`,
                    type: "matchNode",
                    position: { x: col * 320, y: row * 160 },
                    data: {
                        matchIndex: currentCounter,
                        label: `Match #${currentCounter}`,
                        matchId: m.id,
                        placeholderA: m.placeholder_a || "TBD",
                        placeholderB: m.placeholder_b || "TBD",
                    },
                });
            }
        });

        if (newNodes.length > 0) {
            set({
                nodes: [...nodes, ...newNodes],
                nodeCounter: currentCounter,
                isDirty: true,
            });
        }
    },

    updateNodeData: (id, newData) => {
        set((state) => {
            const node = state.nodes.find((n) => n.id === id);
            if (!node) return state;

            // Check if any value actually changed (shallow comparison + JSON for arrays/objects)
            const hasChange = Object.keys(newData).some((key) => {
                const oldVal = node.data[key];
                const newVal = newData[key];
                if (typeof newVal === 'object' && newVal !== null) {
                    return JSON.stringify(oldVal) !== JSON.stringify(newVal);
                }
                return oldVal !== newVal;
            });

            if (!hasChange) return state;

            const updatedNodes = state.nodes.map((n) =>
                n.id === id ? { ...n, data: { ...n.data, ...newData } } : n
            );

            // Handle propagation if a 'source' node changed
            const updatedNode = updatedNodes.find((n) => n.id === id);
            if (updatedNode) {
                if (updatedNode.type === 'groupNode') {
                    state.edges.forEach(edge => {
                        if (edge.source === id) {
                            const target = updatedNodes.find(n => n.id === edge.target);
                            if (target && target.type === 'standingNode') {
                                target.data = { 
                                    ...target.data, 
                                    teamCount: updatedNode.data.teamCount,
                                    teams: updatedNode.data.teams,
                                    label: `Standings: ${updatedNode.data.label}`
                                };
                            }
                        }
                    });
                }
            }

            return {
                nodes: updatedNodes,
                isDirty: true,
            };
        });
    },

    selectNode: (id) => {
        set((state) => ({
            nodes: state.nodes.map((n) => ({
                ...n,
                selected: n.id === id,
            })),
        }));
    },
}));
