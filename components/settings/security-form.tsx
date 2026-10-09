"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changePassword } from "@/actions/common/user";
import { Loader2, Eye, EyeOff, KeyRound, Lock, ShieldCheck, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { Header } from "../ui/header";

interface SecurityFormProps {
    className?: string;
}

export function SecurityForm({ className }: SecurityFormProps) {
    const tCommon = useTranslations("Common");
    const locale = useLocale();
    const isThai = locale === "th";
    const { toast } = useToast();

    const [isLoading, setIsLoading] = useState(false);
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Track last modified field for action buttons
    const [lastModifiedField, setLastModifiedField] = useState<'currentPassword' | 'newPassword' | 'confirmPassword' | null>(null);

    const isDirty = Boolean(currentPassword || newPassword || confirmPassword);

    const activeActionField: 'currentPassword' | 'newPassword' | 'confirmPassword' | null = !isDirty
        ? null
        : lastModifiedField || (confirmPassword ? 'confirmPassword' : newPassword ? 'newPassword' : 'currentPassword');

    const handleReset = () => {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setLastModifiedField(null);
    };

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (!currentPassword || !newPassword || !confirmPassword) {
            toast({
                title: tCommon("error"),
                description: isThai ? "กรุณากรอกข้อมูลให้ครบทุกช่อง" : "Please fill in all fields",
                variant: "destructive",
            });
            return;
        }

        if (newPassword.length < 6) {
            toast({
                title: tCommon("error"),
                description: isThai ? "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร" : "New password must be at least 6 characters",
                variant: "destructive",
            });
            return;
        }

        if (newPassword !== confirmPassword) {
            toast({
                title: tCommon("error"),
                description: isThai ? "รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน" : "New passwords do not match",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);

        const formData = new FormData();
        formData.append("currentPassword", currentPassword);
        formData.append("newPassword", newPassword);
        formData.append("confirmPassword", confirmPassword);

        const result = await changePassword(formData);
        setIsLoading(false);

        if (result?.error) {
            toast({
                title: tCommon("error"),
                description: result.error,
                variant: "destructive",
            });
        } else {
            toast({
                title: tCommon("success"),
                description: isThai ? "เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว" : "Password changed successfully",
            });
            handleReset();
        }
    }

    const renderActionButtons = () => (
        <div className="flex items-center gap-2 pt-2 animate-in fade-in-50 duration-200">
            <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isLoading}
                onClick={handleReset}
                className="text-xs"
            >
                {isThai ? "ยกเลิก" : "Cancel"}
            </Button>
            <Button
                type="submit"
                size="sm"
                disabled={isLoading}
                variant="default"
                className="text-xs font-semibold"
            >
                {isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : null}
                <span>{tCommon("save")}</span>
            </Button>
        </div>
    );

    return (
        <div className={cn("p-4 space-y-4", className)}>
            {/* Card Section Header */}
            <div>
                <Header level={4}>
                    {isThai ? "เปลี่ยนรหัสผ่าน" : "Change Password"}
                </Header>
                <p className="text-xs text-muted-foreground">
                    {isThai 
                        ? "เพื่อความปลอดภัย กรุณาตั้งรหัสผ่านที่มีความยาวอย่างน้อย 6 ตัวอักษร" 
                        : "Ensure your account is using a strong password with at least 6 characters."}
                </p>
            </div>

            <form onSubmit={handleSubmit}>
                {/* 1. Current Password */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2 gap-3">
                    <div className="flex items-start gap-4 sm:w-2/3">
                        <div className="size-9 rounded-sm bg-muted-foreground/10 flex items-center justify-center shrink-0">
                            <KeyRound className="size-4 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                            <Header level={6}>
                                {isThai ? "รหัสผ่านปัจจุบัน" : "Current Password"}
                            </Header>
                            <p className="text-xs text-muted-foreground">
                                {isThai ? "กรอกรหัสผ่านเดิมเพื่อยืนยันตัวตน" : "Enter your current password"}
                            </p>
                        </div>
                    </div>
                    <div className="sm:w-2/3 space-y-1">
                        <div className="relative">
                            <Input
                                size="sm"
                                id="currentPassword"
                                type={showCurrent ? "text" : "password"}
                                value={currentPassword}
                                onChange={(e) => {
                                    setCurrentPassword(e.target.value);
                                    setLastModifiedField('currentPassword');
                                }}
                                placeholder={isThai ? "กรอกรหัสผ่านปัจจุบันของคุณ" : "Enter your current password"}
                                className="pr-10 w-full"
                                disabled={isLoading}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrent(!showCurrent)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                tabIndex={-1}
                            >
                                {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                        </div>
                        <div className="flex justify-end pt-0.5">
                            <Link 
                                href="/auth/forgot-password" 
                                className="text-[11px] text-primary hover:underline"
                            >
                                {isThai ? "ลืมรหัสผ่าน?" : "Forgot password?"}
                            </Link>
                        </div>
                        {activeActionField === 'currentPassword' && renderActionButtons()}
                    </div>
                </div>

                {/* 2. New Password */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2 gap-3">
                    <div className="flex items-start gap-4 sm:w-2/3">
                        <div className="size-9 rounded-sm bg-muted-foreground/10 flex items-center justify-center shrink-0">
                            <Lock className="size-4 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                            <Header level={6}>
                                {isThai ? "รหัสผ่านใหม่" : "New Password"}
                            </Header>
                            <p className="text-xs text-muted-foreground">
                                {isThai ? "ความยาวอย่างน้อย 6 ตัวอักษร" : "At least 6 characters"}
                            </p>
                        </div>
                    </div>
                    <div className="sm:w-2/3 space-y-1">
                        <div className="relative">
                            <Input
                                size="sm"
                                id="newPassword"
                                type={showNew ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => {
                                    setNewPassword(e.target.value);
                                    setLastModifiedField('newPassword');
                                }}
                                placeholder={isThai ? "อย่างน้อย 6 ตัวอักษร" : "At least 6 characters"}
                                className="pr-10 w-full"
                                disabled={isLoading}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowNew(!showNew)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                tabIndex={-1}
                            >
                                {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                        </div>
                        {activeActionField === 'newPassword' && renderActionButtons()}
                    </div>
                </div>

                {/* 3. Confirm New Password */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2 gap-3">
                    <div className="flex items-start gap-4 sm:w-2/3">
                        <div className="size-9 rounded-sm bg-muted-foreground/10 flex items-center justify-center shrink-0">
                            <ShieldCheck className="size-4 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                            <Header level={6}>
                                {isThai ? "ยืนยันรหัสผ่านใหม่" : "Confirm New Password"}
                            </Header>
                            <p className="text-xs text-muted-foreground">
                                {isThai ? "กรอกรหัสผ่านใหม่อีกครั้งให้ตรงกัน" : "Re-enter new password"}
                            </p>
                        </div>
                    </div>
                    <div className="sm:w-2/3 space-y-1">
                        <div className="relative">
                            <Input
                                size="sm"
                                id="confirmPassword"
                                type={showConfirm ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => {
                                    setConfirmPassword(e.target.value);
                                    setLastModifiedField('confirmPassword');
                                }}
                                placeholder={isThai ? "กรอกรหัสผ่านใหม่อีกครั้ง" : "Re-enter new password"}
                                className="pr-10 w-full"
                                disabled={isLoading}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirm(!showConfirm)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                tabIndex={-1}
                            >
                                {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                        </div>
                        {activeActionField === 'confirmPassword' && renderActionButtons()}
                    </div>
                </div>

                {/* 4. Security Tips */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-2 gap-3">
                    <div className="flex items-start gap-4 sm:w-2/3">
                        <div className="size-9 rounded-sm bg-muted-foreground/10 flex items-center justify-center shrink-0">
                            <Info className="size-4 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                            <Header level={6}>
                                {isThai ? "คำแนะนำความปลอดภัย" : "Security Tips"}
                            </Header>
                            <p className="text-xs text-muted-foreground">
                                {isThai ? "แนวทางปฏิบัติเพื่อความปลอดภัยของบัญชี" : "Guidelines to keep your account safe"}
                            </p>
                        </div>
                    </div>
                    <div className="sm:w-2/3">
                        <ul className="list-disc list-inside space-y-0.5 text-xs text-muted-foreground">
                            <li>{isThai ? "ความยาวอย่างน้อย 6 ตัวอักษร" : "At least 6 characters in length"}</li>
                            <li>{isThai ? "ควรผสมตัวอักษรพิมพ์เล็ก พิมพ์ใหญ่ และตัวเลข" : "Mix uppercase, lowercase, and numbers"}</li>
                        </ul>
                    </div>
                </div>
            </form>
        </div>
    );
}
