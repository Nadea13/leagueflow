"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProfile } from "@/actions/common/user";
import { Loader2, User as UserIcon, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";

export function ProfileForm({ user }: { user: User }) {
    const t = useTranslations("Profile");
    const tCommon = useTranslations("Common");
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    async function handleUpdate(formData: FormData) {
        setIsLoading(true);
        const result = await updateProfile(formData);
        setIsLoading(false);

        if (result?.error) {
            toast({
                title: t("error"),
                description: result.error,
                variant: "destructive",
            });
        } else {
            toast({
                title: t("success"),
                description: t("updated_successfully"),
            });
        }
    }

    return (
        <div className="bg-card border p-4 md:p-6 space-y-4 md:space-y-6">
            <div className="flex items-center gap-2 md:gap-3">
                <UserIcon className="h-6 w-6 text-primary" />
                <h3 className="text-2xl font-black tracking-tighter text-foreground">
                    {t("user_info")}
                </h3>
            </div>

            <div className="relative overflow-hidden group">
                <form action={handleUpdate} className="grid gap-4 md:gap-6">
                    <div className="space-y-1">
                        <Label htmlFor="email" className="text-xs font-black tracking-widest text-primary">
                            {t("email")}
                        </Label>
                        <Input
                            id="email"
                            value={user?.email}
                            disabled
                            className="bg-transparent text-foreground focus-visible:ring-0  text-sm font-bold"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="fullName" className="text-xs font-black tracking-widest text-primary">
                            {t("full_name")}
                        </Label>
                        <Input
                            id="fullName"
                            name="fullName"
                            defaultValue={user?.user_metadata?.full_name || ""}
                            placeholder={t("enter_full_name")}
                            className="bg-transparent text-foreground focus-visible:ring-0  text-sm font-bold"
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit" disabled={isLoading} variant="default" className="font-black transition-all disabled:opacity-50">
                            {isLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Check className="h-4 w-4" />
                                    {tCommon("save")}
                                </span>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
