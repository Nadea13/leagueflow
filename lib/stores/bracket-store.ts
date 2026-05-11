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
    matchIndex: number;
    label: string;
    placeholderA: string;
    placeholderB: string;
    matchId?: string;
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
        const isFromGroup = connection.source?.startsWith("group-");
        const isFromBye = connection.source?.startsWith("bye-");
        
        const { nodes, updateNodeData } = get();
        const sourceNode = nodes.find(n => n.id === connection.source);
        const targetNode = nodes.find(n => n.id === connection.target);

        // Propagate team from Bye/Group to Match slot on connect
        if (sourceNode && targetNode && targetNode.type === 'matchNode') {
            const teamName = sourceNode.type === 'byeNode' 
                ? sourceNode.data.placeholder 
                : sourceNode.type === 'groupNode'
                    ? "Group Winner" // Placeholder for group, can be refined
                    : null;

            if (teamName && teamName !== "TBD") {
                if (connection.targetHandle === 'slot-a') {
                    updateNodeData(targetNode.id, { placeholderA: teamName });
                } else if (connection.targetHandle === 'slot-b') {
                    updateNodeData(targetNode.id, { placeholderB: teamName });
                }
            }
        }

        set((state) => ({
            edges: addEdge(
                {
                    ...connection,
                    type: "smoothstep",
                    animated: false,
                    style: { 
                        stroke: isFromGroup 
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
                matchIndex: nextIndex,
                label: `Match #${nextIndex}`,
                placeholderA: "TBD",
                placeholderB: "TBD",
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
                teamCount: 4,
                advancingCount: 2,
            },
        };

        set({
            nodes: [...nodes, newNode],
            isDirty: true,
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
            }

            return {
                nodes: updatedNodes,
                isDirty: true,
            };
        });
    },
}));
