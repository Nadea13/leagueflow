"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProfile } from "@/actions/common/user";
import { Loader2, User as UserIcon } from "lucide-react";
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
        <div className="space-y-4 md:space-y-6">
            <div className="flex items-center gap-3 mb-4 md:mb-6">
                <UserIcon className="h-5 w-5 text-secondary" />
                <h3 className="text-xl font-black uppercase tracking-tighter text-foreground">
                    {t("user_info")}
                </h3>
            </div>
            
            <div className="bg-background border rounded-none relative overflow-hidden group hover:bg-muted/5 transition-colors p-4 md:p-6 shadow-sm">
                <form action={handleUpdate} className="grid gap-4 md:gap-6">
                    <div className="grid gap-3">
                        <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-secondary/70">
                            {t("email")}
                        </Label>
                        <Input 
                            id="email" 
                            value={user?.email} 
                            disabled 
                            className="bg-muted/10 border-border text-muted-foreground/40 cursor-not-allowed font-medium h-12 rounded-none" 
                        />
                    </div>
                    <div className="grid gap-3">
                        <Label htmlFor="fullName" className="text-[10px] font-black uppercase tracking-widest text-secondary/70">
                            {t("full_name")}
                        </Label>
                        <Input
                            id="fullName"
                            name="fullName"
                            defaultValue={user?.user_metadata?.full_name || ""}
                            placeholder={t("enter_full_name")}
                            className="bg-muted/20 border-border text-foreground h-12 rounded-none focus-visible:ring-secondary/30"
                        />
                    </div>
                    <div className="flex justify-start">
                        <Button type="submit" disabled={isLoading} variant="secondary" className="h-12 px-10 rounded-none font-black uppercase tracking-tighter shadow-[0_0_20px_rgba(0,196,154,0.1)] hover:shadow-[0_0_30px_rgba(0,196,154,0.2)] transition-all">
                            {isLoading ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <span className="flex items-center gap-2">
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
