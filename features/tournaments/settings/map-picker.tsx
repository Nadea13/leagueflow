"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface MapPickerProps {
    value: string;
    onChange: (url: string) => void;
}

function parseLatLng(input: string): [number, number] | null {
    if (!input) return null;
    
    // Support iframe parsing
    if (input.includes("<iframe")) {
        const match = input.match(/src="([^"]+)"/);
        if (match && match[1]) {
            return parseLatLng(match[1]);
        }
    }

    const atCoordsMatch = input.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atCoordsMatch) {
        return [parseFloat(atCoordsMatch[1]), parseFloat(atCoordsMatch[2])];
    }
    const queryCoordsMatch = input.match(/[?&](q|query)=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (queryCoordsMatch) {
        return [parseFloat(queryCoordsMatch[2]), parseFloat(queryCoordsMatch[3])];
    }
    const plainCoordsMatch = input.match(/^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/);
    if (plainCoordsMatch) {
        return [parseFloat(plainCoordsMatch[1]), parseFloat(plainCoordsMatch[2])];
    }
    return null;
}

export default function MapPicker({ value, onChange }: MapPickerProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);

    // Initial Coordinates
    const defaultCoords: [number, number] = [13.7563, 100.5018]; // Bangkok
    const initialCoords = parseLatLng(value) || defaultCoords;
    const initialCoordsRef = useRef(initialCoords);

    // Keep onChange in a ref to avoid effect dependency re-runs
    const onChangeRef = useRef(onChange);
    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        if (!mapContainerRef.current) return;

        // Initialize Map
        const map = L.map(mapContainerRef.current, {
            center: initialCoordsRef.current,
            zoom: 15,
            zoomControl: true,
        });

        // Set up OpenStreetMap layer
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

        // Custom pin design matching branding colors
        const customMarkerIcon = L.divIcon({
            html: `<div class="flex items-center justify-center text-primary filter drop-shadow-[0_2px_5px_rgba(0,0,0,0.3)]">
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width: 32px; height: 32px;">
                       <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
                     </svg>
                   </div>`,
            className: "custom-marker-icon",
            iconSize: [32, 32],
            iconAnchor: [16, 32],
        });

        // Initialize Marker
        const marker = L.marker(initialCoordsRef.current, {
            icon: customMarkerIcon,
            draggable: true,
        }).addTo(map);

        mapRef.current = map;
        markerRef.current = marker;

        // Callback helper
        const updateCoords = (lat: number, lng: number) => {
            const formattedUrl = `https://maps.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
            onChangeRef.current(formattedUrl);
        };

        // Event: Marker Drag
        marker.on("dragend", () => {
            const position = marker.getLatLng();
            updateCoords(position.lat, position.lng);
        });

        // Event: Click map to pin
        map.on("click", (e) => {
            marker.setLatLng(e.latlng);
            updateCoords(e.latlng.lat, e.latlng.lng);
        });

        return () => {
            map.remove();
        };
    }, []); // Safe to run once on mount because values are in refs

    // Update marker and center if value prop changes from outside (e.g. paste URL)
    useEffect(() => {
        const coords = parseLatLng(value);
        if (coords && mapRef.current && markerRef.current) {
            const currentLatLng = markerRef.current.getLatLng();
            if (currentLatLng.lat !== coords[0] || currentLatLng.lng !== coords[1]) {
                markerRef.current.setLatLng(coords);
                mapRef.current.setView(coords, mapRef.current.getZoom());
            }
        }
    }, [value]);

    // Simple search using Nominatim (free OpenStreetMap search)
    const executeSearch = async () => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
            );
            const data = await response.json();
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                const coords: [number, number] = [lat, lng];

                if (mapRef.current && markerRef.current) {
                    markerRef.current.setLatLng(coords);
                    mapRef.current.setView(coords, 16);
                    const formattedUrl = `https://maps.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
                    onChangeRef.current(formattedUrl);
                }
            }
        } catch (error) {
            console.error("Geocoding failed:", error);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="space-y-1 md:space-y-2">
            <div className="flex flex-col md:flex-row gap-1 md:gap-2 items-center justify-between">
                <div className="relative flex-1 w-full md:w-auto">
                    <Input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                e.stopPropagation();
                                executeSearch();
                            }
                        }}
                        className="pl-8 bg-transparent text-foreground focus-visible:ring-0 rounded-sm"
                    />
                </div>
                <Button
                    type="button"
                    onClick={executeSearch}
                    disabled={isSearching}
                    variant="outline"
                    className="w-8 md:w-10"
                >
                    <Search />
                </Button>
            </div>
            <div className="relative w-full h-120 rounded-lg overflow-hidden border border-foreground/10 z-10">
                <div ref={mapContainerRef} className="w-full h-full" />
            </div>
        </div>
    );
}
