"use client";

import React, { useState } from "react";
import { Plus, X, Loader2, ArrowRight, Camera } from "lucide-react";
import { useTranslations } from "next-intl";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Image from "next/image";
import { addPlayersBatchForm } from "@/actions/manager/team";
import { searchMasterPlayers } from "@/actions/common/user";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AddPlayersDialogProps {
    teamId: string;
    onSuccess: () => Promise<void>;
    effectivelyLocked: boolean;
}

interface BulkPlayerInput {
    name: string;
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

export function AddPlayersDialog({ teamId, onSuccess, effectivelyLocked }: AddPlayersDialogProps) {
    const t = useTranslations("Roster");
    const tCommon = useTranslations("Common");
    const { toast } = useToast();

    const [isBulkOpen, setIsBulkOpen] = useState(false);
    const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);

    const initialBulkPlayers = Array.from({ length: 12 }, () => ({
        name: "",
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
                title: "กรุณากรอกข้อมูล",
                description: "อย่างน้อยต้องกรอกชื่อนักกีฬา 1 คน",
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
                formData.append(`name_${idx}`, p.name);
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
                    title: "บันทึกข้อมูลเรียบร้อยแล้ว",
                    description: `เพิ่มนักกีฬา ${activePlayers.length} คนสำเร็จ`,
                });
                setBulkPlayers(initialBulkPlayers);
                setIsBulkOpen(false);
                await onSuccess();
            } else {
                toast({
                    title: tCommon("error"),
                    description: res.error || "บันทึกข้อมูลไม่สำเร็จ",
                    variant: "destructive"
                });
            }
        } catch (_err) {
            toast({
                title: tCommon("error"),
                description: "เกิดข้อผิดพลาดในการบันทึกข้อมูล",
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
                    className="flex items-center gap-1.5 h-10 text-xs font-bold border border-primary text-primary hover:bg-primary/5 transition-all cursor-pointer"
                >
                    <Plus className="h-4 w-4" />
                    <span>เพิ่มหลายคน</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl md:max-w-6xl bg-card border rounded-xl max-h-[95vh] md:max-h-[90vh] flex flex-col">
                <DialogHeader className="relative">
                    <DialogTitle className="">
                        เพิ่มรายชื่อนักกีฬาหลายคน
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        กรอกข้อมูลนักกีฬาลงในช่องด้านล่าง (อย่างน้อยต้องกรอกช่องชื่อที่มีเครื่องหมาย *) จากนั้นกดปุ่มบันทึกด้านล่างเพื่อเพิ่มนักกีฬาทั้งหมดเข้าสู่ทีมพร้อมกัน
                    </DialogDescription>
                    <button
                        type="button"
                        onClick={() => setIsBulkOpen(false)}
                        className="absolute right-2 top-2 md:right-4 md:top-4 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </button>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto space-y-2 md:space-y-4 p-2 md:p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
                        {bulkPlayers.map((player, idx) => (
                            <div key={idx} className="border rounded-sm p-1 md:p-2 relative flex flex-col items-center gap-1 md:gap-2">
                                
                                {/* Photo Selector */}
                                <div className="relative">
                                    <input
                                        type="file"
                                        id={`photo-input-${idx}`}
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => handlePhotoChange(idx, e.target.files?.[0] || null)}
                                    />
                                    <label
                                        htmlFor={`photo-input-${idx}`}
                                        className="h-16 w-16 rounded-full border transition-all flex items-center justify-center overflow-hidden relative group cursor-pointer"
                                    >
                                        {player.photoPreview ? (
                                            <Image 
                                                src={player.photoPreview} 
                                                alt="Preview" 
                                                width={40} 
                                                height={40} 
                                                className="h-full w-full object-cover" 
                                            />
                                        ) : (
                                            <Camera className="h-4 w-4 text-primary" />
                                        )}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Camera className="h-4 w-4 text-foreground" />
                                        </div>
                                    </label>
                                    {player.photoPreview && (
                                        <button
                                            type="button"
                                            onClick={() => handlePhotoChange(idx, null)}
                                            className="absolute -top-0 -right-0 bg-destructive text-destructive-foreground rounded-full p-0.5 hover:bg-destructive/90 shadow-md transition-transform z-10"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>

                                {/* Fields */}
                                <div className="w-full space-y-1 md:space-y-2">
                                    <div className="relative">
                                        <Input
                                            type="text"
                                            value={player.name}
                                            onChange={(e) => handleBulkNameChange(idx, e.target.value)}
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
                                                        <span className="text-[8px] font-black tracking-widest text-muted-foreground/40">Searching...</span>
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
                                    <div className="grid grid-cols-2 gap-1.5">
                                        <Input
                                            type="text"
                                            value={player.number}
                                            onChange={(e) => updateBulkPlayer(idx, "number", e.target.value)}
                                            placeholder="เบอร์เสื้อ"
                                        />
                                        <Select
                                            value={player.position}
                                            onValueChange={(val) => updateBulkPlayer(idx, "position", val)}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="ตำแหน่ง" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="GK">{t("goalkeeper")}</SelectItem>
                                                <SelectItem value="DF">{t("defender")}</SelectItem>
                                                <SelectItem value="MF">{t("midfielder")}</SelectItem>
                                                <SelectItem value="FW">{t("forward")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Input
                                        type="tel"
                                        value={player.tel}
                                        onChange={(e) => updateBulkPlayer(idx, "tel", e.target.value)}
                                        placeholder="เบอร์โทรศัพท์"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <div className="flex justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={addBulkRow}
                        >
                            เพิ่มช่องแถวใหม่
                        </Button>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        onClick={handleBulkFormSubmit}
                        disabled={isSubmittingBulk || bulkPlayers.filter(p => p.name.trim().length > 0).length === 0}
                    >
                        {isSubmittingBulk ? (
                            <>
                                <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                                กำลังบันทึก...
                            </>
                        ) : (
                            "บันทึกรายชื่อทั้งหมด"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
