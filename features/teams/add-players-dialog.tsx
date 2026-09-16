"use client";

import React, { useState } from "react";
import { Plus, X, Loader2, ArrowRight, Camera } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Image from "next/image";
import { addPlayersBatchForm } from "@/actions/manager/team";
import { searchMasterPlayers } from "@/actions/common/user";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPositionOptions } from "@/lib/positions";

interface AddPlayersDialogProps {
    teamId: string;
    onSuccess: () => Promise<void>;
    effectivelyLocked: boolean;
    sport?: string;
}

interface BulkPlayerInput {
    name: string;
    nickname: string;
    number: string;
    position: string;
    tel: string;
    photoFile: File | null;
    photoPreview: string | null;
}

interface MasterPlayerSearchResult {
    id: string;
    name: string;
    date_of_birth: string | null;
    tel: string | null;
}

interface MasterPlayerRow {
    id: string;
    first_name: string;
    middle_name?: string | null;
    last_name: string;
    first_name_th?: string | null;
    middle_name_th?: string | null;
    last_name_th?: string | null;
    first_name_en?: string | null;
    middle_name_en?: string | null;
    last_name_en?: string | null;
    birthday: string | null;
    tel: string | null;
}

export function AddPlayersDialog({ teamId, onSuccess, effectivelyLocked, sport }: AddPlayersDialogProps) {
    const tCommon = useTranslations("Common");
    const locale = useLocale();
    const isThai = locale === "th";
    const { toast } = useToast();
    const positionOptions = getPositionOptions(sport);

    const [isBulkOpen, setIsBulkOpen] = useState(false);
    const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);

    const initialBulkPlayers = Array.from({ length: 12 }, () => ({
        name: "",
        nickname: "",
        number: "",
        position: "",
        tel: "",
        photoFile: null,
        photoPreview: null
    }));
    const [bulkPlayers, setBulkPlayers] = useState<BulkPlayerInput[]>(initialBulkPlayers);

    const [focusedBulkIndex, setFocusedBulkIndex] = useState<number | null>(null);
    const [bulkSearchResults, setBulkSearchResults] = useState<MasterPlayerSearchResult[]>([]);
    const [isBulkSearching, setIsBulkSearching] = useState(false);

    const updateBulkPlayer = <K extends keyof BulkPlayerInput>(
        index: number,
        field: K,
        value: BulkPlayerInput[K]
    ) => {
        setBulkPlayers(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const handlePhotoChange = (index: number, file: File | null) => {
        if (!file) {
            updateBulkPlayer(index, "photoFile", null);
            updateBulkPlayer(index, "photoPreview", null);
            return;
        }
        updateBulkPlayer(index, "photoFile", file);
        const reader = new FileReader();
        reader.onloadend = () => {
            updateBulkPlayer(index, "photoPreview", reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const addBulkRow = () => {
        setBulkPlayers(prev => [
            ...prev,
            ...Array.from({ length: 3 }, () => ({
                name: "",
                nickname: "",
                number: "",
                position: "",
                tel: "",
                photoFile: null,
                photoPreview: null
            }))
        ]);
    };

    const handleBulkSearch = async (val: string) => {
        setIsBulkSearching(true);
        try {
            const res = await searchMasterPlayers(val);
            if (res.success && res.data) {
                const mapped = (res.data as MasterPlayerRow[]).map((mp) => ({
                    id: mp.id,
                    name: (mp.first_name_th ? `${mp.first_name_th} ${mp.last_name_th || ''}` : `${mp.first_name_en || ''} ${mp.last_name_en || ''}`).trim(),
                    date_of_birth: mp.birthday,
                    tel: mp.tel
                }));
                const uniqueMapped = mapped.filter((item, index, self) =>
                    index === self.findIndex((t) => t.name === item.name)
                );
                setBulkSearchResults(uniqueMapped);
            } else {
                setBulkSearchResults([]);
            }
        } catch (err) {
            console.error("Error searching global players:", err);
            setBulkSearchResults([]);
        } finally {
            setIsBulkSearching(false);
        }
    };

    const handleBulkNameChange = (index: number, val: string) => {
        updateBulkPlayer(index, "name", val);
        if (val.trim().length > 0) {
            setFocusedBulkIndex(index);
            handleBulkSearch(val);
        } else {
            setFocusedBulkIndex(null);
            setBulkSearchResults([]);
        }
    };

    const handleSelectBulkMasterPlayer = (index: number, gp: MasterPlayerSearchResult) => {
        updateBulkPlayer(index, "name", gp.name);
        updateBulkPlayer(index, "tel", gp.tel || "");
        setFocusedBulkIndex(null);
        setBulkSearchResults([]);
    };

    const handleBulkFormSubmit = async () => {
        const activePlayers = bulkPlayers.filter(p => p.name.trim().length > 0);
        if (activePlayers.length === 0) {
            toast({
                title: isThai ? "กรุณากรอกข้อมูล" : "Input Required",
                description: isThai ? "อย่างน้อยต้องกรอกชื่อนักกีฬา 1 คน" : "At least 1 player name is required.",
                variant: "destructive"
            });
            return;
        }

        setIsSubmittingBulk(true);
        try {
            const formData = new FormData();
            formData.append("teamId", teamId);
            formData.append("count", activePlayers.length.toString());

            activePlayers.forEach((p, idx) => {
                const fullNameWithNickname = p.nickname?.trim()
                    ? `${p.name.trim()} (${p.nickname.trim()})`
                    : p.name.trim();
                formData.append(`name_${idx}`, fullNameWithNickname);
                formData.append(`number_${idx}`, p.number);
                formData.append(`position_${idx}`, p.position);
                formData.append(`tel_${idx}`, p.tel);
                if (p.photoFile) {
                    formData.append(`photo_${idx}`, p.photoFile);
                }
            });

            const res = await addPlayersBatchForm(formData);
            if (res.success) {
                toast({
                    title: isThai ? "บันทึกข้อมูลเรียบร้อยแล้ว" : "Saved Successfully",
                    description: isThai ? `เพิ่มนักกีฬา ${activePlayers.length} คนสำเร็จ` : `Successfully added ${activePlayers.length} players`,
                });
                setBulkPlayers(initialBulkPlayers);
                setIsBulkOpen(false);
                await onSuccess();
            } else {
                toast({
                    title: tCommon("error"),
                    description: res.error || (isThai ? "บันทึกข้อมูลไม่สำเร็จ" : "Failed to save players"),
                    variant: "destructive"
                });
            }
        } catch (_err) {
            toast({
                title: tCommon("error"),
                description: isThai ? "เกิดข้อผิดพลาดในการบันทึกข้อมูล" : "An error occurred while saving",
                variant: "destructive"
            });
        } finally {
            setIsSubmittingBulk(false);
        }
    };

    if (effectivelyLocked) return null;

    return (
        <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
            <DialogTrigger asChild>
                <Button 
                    variant="outline"
                    size="sm" 
                >
                    <Plus className="h-4 w-4" />
                    <span className="hidden lg:block">{isThai ? "เพิ่มหลายคน" : "Add Multiple"}</span>
                </Button>
            </DialogTrigger>
            <DialogContent showCloseButton={false} className="max-w-5xl md:max-w-6xl bg-card border rounded-xl max-h-[95vh] md:max-h-[90vh] flex flex-col">
                <DialogHeader className="relative">
                    <DialogTitle>
                        {isThai ? "เพิ่มรายชื่อนักกีฬาหลายคน" : "Add Multiple Players"}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        {isThai 
                            ? "กรอกข้อมูลนักกีฬาลงในช่องด้านล่าง (อย่างน้อยต้องกรอกช่องชื่อที่มีเครื่องหมาย *) จากนั้นกดปุ่มบันทึกด้านล่างเพื่อเพิ่มนักกีฬาทั้งหมดเข้าสู่ทีมพร้อมกัน" 
                            : "Fill in player details below (at least player name marked with *). Then click Save to add all players to the team at once."}
                    </DialogDescription>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="absolute right-2 top-2"
                        onClick={() => setIsBulkOpen(false)}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto space-y-2 md:space-y-4 p-2 md:p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
                        {bulkPlayers.map((player, idx) => (
                            <div
                                key={idx}
                                className="flex flex-col gap-3 p-3 rounded-lg border border-border bg-card/50 relative group hover:border-primary/50 transition-colors"
                            >
                                {/* Photo Upload Circle */}
                                <div className="flex justify-center">
                                    <label
                                        htmlFor={`bulk-photo-${idx}`}
                                        className="relative h-14 w-14 rounded-full border-2 border-dashed border-border hover:border-primary/70 flex items-center justify-center cursor-pointer overflow-hidden group/photo bg-muted/20 transition-colors"
                                    >
                                        {player.photoPreview ? (
                                            <>
                                                <Image
                                                    src={player.photoPreview}
                                                    alt="Preview"
                                                    fill
                                                    className="object-cover"
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Camera className="h-4 w-4 text-white" />
                                                </div>
                                            </>
                                        ) : (
                                            <Camera className="h-5 w-5 text-muted-foreground/40 group-hover/photo:text-primary transition-colors" />
                                        )}
                                    </label>
                                    <input
                                        id={`bulk-photo-${idx}`}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => handlePhotoChange(idx, e.target.files?.[0] || null)}
                                    />
                                    {player.photoFile && (
                                        <button
                                            type="button"
                                            onClick={() => handlePhotoChange(idx, null)}
                                            className="absolute top-2 right-2 text-muted-foreground/40 hover:text-destructive transition-colors"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>

                                {/* Fields */}
                                <div className="w-full space-y-1 md:space-y-2">
                                    <div className="relative">
                                        <Input
                                            type="text"
                                            size="sm"
                                            value={player.name}
                                            onChange={(e) => handleBulkNameChange(idx, e.target.value)}
                                            placeholder={isThai ? "ชื่อนักกีฬา *" : "Player Name *"}
                                            onFocus={() => {
                                                if (player.name.trim().length > 0) {
                                                    setFocusedBulkIndex(idx);
                                                    handleBulkSearch(player.name);
                                                }
                                            }}
                                            onBlur={() => {
                                                setTimeout(() => {
                                                    setFocusedBulkIndex(null);
                                                }, 200);
                                            }}
                                        />
                                        {focusedBulkIndex === idx && (isBulkSearching || bulkSearchResults.length > 0) && (
                                            <div className="absolute left-0 right-0 top-full mt-1 z-[100] rounded-md border border-border bg-card text-foreground shadow-2xl max-h-[150px] overflow-y-auto custom-scrollbar">
                                                {isBulkSearching ? (
                                                    <div className="flex flex-col items-center justify-center py-4 gap-1">
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                                        <span className="text-[8px] font-black tracking-widest text-muted-foreground/40">{isThai ? "กำลังค้นหา..." : "Searching..."}</span>
                                                    </div>
                                                ) : (
                                                    <div className="py-0.5">
                                                        {bulkSearchResults.map((gp) => (
                                                            <button
                                                                key={gp.id}
                                                                type="button"
                                                                className="w-full text-left px-2 py-1.5 hover:bg-primary/10 group flex items-center justify-between transition-colors border-b border-foreground/5 last:border-0"
                                                                onMouseDown={() => handleSelectBulkMasterPlayer(idx, gp)}
                                                            >
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-[10px] tracking-tight group-hover:text-primary">{gp.name}</span>
                                                                    {gp.date_of_birth && (
                                                                        <span className="text-[8px] font-mono text-muted-foreground/45 mt-0.5">
                                                                            {gp.date_of_birth}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <ArrowRight className="h-3 w-3 text-muted-foreground/20 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <Input
                                        type="text"
                                        size="sm"
                                        value={player.nickname}
                                        onChange={(e) => updateBulkPlayer(idx, "nickname", e.target.value)}
                                        placeholder={isThai ? "ชื่อเล่น" : "Nickname"}
                                    />
                                    <div className="grid grid-cols-2 gap-1.5">
                                        <Input
                                            type="text"
                                            size="sm"
                                            value={player.number}
                                            onChange={(e) => updateBulkPlayer(idx, "number", e.target.value)}
                                            placeholder={isThai ? "เบอร์เสื้อ" : "Shirt No."}
                                        />
                                        <Select
                                            value={player.position}
                                            onValueChange={(val) => updateBulkPlayer(idx, "position", val)}
                                        >
                                            <SelectTrigger size="sm" className="w-full">
                                                <SelectValue placeholder={isThai ? "ตำแหน่ง" : "Position"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {positionOptions.map((pos) => (
                                                    <SelectItem key={pos.value} value={pos.value}>
                                                        {isThai ? pos.labelTh : pos.labelEn}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Input
                                        type="tel"
                                        size="sm"
                                        value={player.tel}
                                        onChange={(e) => updateBulkPlayer(idx, "tel", e.target.value)}
                                        placeholder={isThai ? "เบอร์โทรศัพท์" : "Phone Number"}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="flex justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addBulkRow}
                        >
                            {isThai ? "เพิ่มช่องแถวใหม่" : "Add More Rows"}
                        </Button>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        size="sm"
                        onClick={handleBulkFormSubmit}
                        disabled={isSubmittingBulk || bulkPlayers.filter(p => p.name.trim().length > 0).length === 0}
                    >
                        {isSubmittingBulk ? (
                            <>
                                <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                                {isThai ? "กำลังบันทึก..." : "Saving..."}
                            </>
                        ) : (
                            isThai ? "บันทึกรายชื่อทั้งหมด" : "Save All Players"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
