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
import { BracketCanvasData, Match } from "@/types";

export interface MatchNodeData {
    label: string;
    matches: {
        id: string;
        placeholderA: string;
        placeholderB: string;
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
    addByeNode: (position?: { x: number; y: number }) => void;
    addGroupNode: (position?: { x: number; y: number }) => void;
    addStandingNode: (position?: { x: number; y: number }) => void;
    generateRoundRobinMatches: (groupId: string) => void;
    deleteNode: (id: string) => void;
    hydrate: (data: BracketCanvasData | null) => void;
    reset: () => void;
    getCanvasData: () => BracketCanvasData;
    markClean: () => void;
    syncMatches: (matches: Match[]) => void;
    updateNodeData: (id: string, newData: Record<string, unknown>) => void;
}

export const useBracketStore = create<BracketState>((set, get) => ({
    nodes: [],
    edges: [],
    nodeCounter: 0,
    isDirty: false,

    onNodesChange: (changes) => {
        set((state) => ({
            nodes: applyNodeChanges(changes, state.nodes),
            isDirty: true,
        }));
    },

    onEdgesChange: (changes) => {
        set((state) => ({
            edges: applyEdgeChanges(changes, state.edges),
            isDirty: true,
        }));
    },

    onConnect: (connection: Connection) => {
        const { nodes, updateNodeData } = get();
        const sourceNode = nodes.find(n => n.id === connection.source);
        const targetNode = nodes.find(n => n.id === connection.target);

        if (!sourceNode || !targetNode) return;

        const isFromGroup = sourceNode.type === 'groupNode';
        const isFromBye = sourceNode.type === 'byeNode';
        const isStandingConn = sourceNode.type === 'standingNode' || targetNode.type === 'standingNode';
        
        // Propagate team from Bye/Group to Match slot on connect
        if (targetNode.type === 'matchNode') {
            let teamName = null;
            if (sourceNode.type === 'byeNode') {
                teamName = (sourceNode.data.placeholder as string) || "TBD";
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
            if (sourceNode.type === 'byeNode') {
                teamName = (sourceNode.data.placeholder as string) || "TBD";
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

        // Special handling for Team Source -> ByeNode (left handle)
        if (targetNode.type === 'byeNode' && connection.targetHandle === 'team-in') {
            let teamName = null;
            if (sourceNode.type === 'byeNode') {
                teamName = (sourceNode.data.placeholder as string) || "TBD";
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

            if (typeof teamName === "string" && teamName !== "TBD") {
                updateNodeData(targetNode.id, { placeholder: teamName });
            }
        }

        set((state) => ({
            edges: addEdge(
                {
                    ...connection,
                    type: "smoothstep",
                    animated: false,
                    style: { 
                        stroke: isStandingConn
                            ? "#10b981" // Emerald for standings
                            : isFromGroup 
                                ? "#8b5cf6" 
                                : isFromBye 
                                    ? "#fd9a00" 
                                    : "#00c692", 
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

    addByeNode: (position) => {
        const { nodes } = get();
        
        // Auto-position in a grid if no position provided
        const col = Math.floor(nodes.length / 4);
        const row = nodes.length % 4;
        const pos = position ?? { x: col * 320, y: row * 160 + 50 };

        const newNode: Node = {
            id: `bye-${Date.now()}`,
            type: "byeNode",
            position: pos,
            data: {
                label: "BYE",
                placeholder: "TBD",
            },
        };

        set({
            nodes: [...nodes, newNode],
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
            type: 'smoothstep',
            style: { stroke: '#8b5cf6', strokeWidth: 2 }
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
            edges: (data.edges || []).map(edge => ({
                ...edge,
                animated: false,
                style: {
                    ...edge.style,
                    strokeDasharray: "none",
                }
            })),
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
            const updatedNodes = state.nodes.map((node) =>
                node.id === id
                    ? { ...node, data: { ...node.data, ...newData } }
                    : node
            );

            // Handle propagation if a 'source' node changed (e.g. ByeNode team changed)
            const updatedNode = updatedNodes.find(n => n.id === id);
            if (updatedNode && (updatedNode.type === 'byeNode' || updatedNode.type === 'groupNode')) {
                const teamName = updatedNode.type === 'byeNode' ? updatedNode.data.placeholder : null;
                
                if (teamName) {
                    state.edges.forEach(edge => {
                        if (edge.source === id) {
                            const target = updatedNodes.find(n => n.id === edge.target);
                            if (target && target.type === 'matchNode') {
                                if (edge.targetHandle === 'slot-a') {
                                    target.data = { ...target.data, placeholderA: teamName };
                                } else if (edge.targetHandle === 'slot-b') {
                                    target.data = { ...target.data, placeholderB: teamName };
                                }
                            }
                        }
                    });
                }

                // If a group node changed, find all standing nodes connected to it and update them
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
}));
