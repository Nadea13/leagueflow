"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateProfile } from "@/app/[locale]/dashboard/settings/actions";
import { Loader2, User } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export function ProfileForm({ user }: { user: any }) {
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
        <div className="space-y-8">
            <Card className="border border-border rounded-none p-0 overflow-hidden bg-card shadow-2xl backdrop-blur-xl relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-secondary/20" />
                <div className="bg-muted/30 px-10 py-6 border-b border-border">
                    <CardHeader className="p-0">
                        <CardTitle className="flex items-center gap-3 text-xl font-black italic uppercase tracking-tighter text-foreground">
                            <div className="p-1.5 bg-muted border border-border">
                                <User className="h-5 w-5 text-secondary" />
                            </div>
                            {t("user_info")}
                        </CardTitle>
                        <CardDescription className="text-muted-foreground/60 font-medium">{t("user_info_desc")}</CardDescription>
                    </CardHeader>
                </div>
                <CardContent className="p-10">
                    <form action={handleUpdate} className="grid gap-8">
                        <div className="grid gap-3">
                            <Label htmlFor="email" className="text-[10px] font-black uppercase italic tracking-widest text-secondary">
                                {t("email")}
                            </Label>
                            <Input 
                                id="email" 
                                value={user?.email} 
                                disabled 
                                className="bg-muted/10 border-border text-muted-foreground/40 cursor-not-allowed italic font-medium h-12" 
                            />
                        </div>
                        <div className="grid gap-3">
                            <Label htmlFor="fullName" className="text-[10px] font-black uppercase italic tracking-widest text-secondary">
                                {t("full_name")}
                            </Label>
                            <Input
                                id="fullName"
                                name="fullName"
                                defaultValue={user?.user_metadata?.full_name || ""}
                                placeholder={t("enter_full_name")}
                                className="bg-muted/20 border-border text-foreground h-12"
                            />
                        </div>
                        <div className="flex justify-start pt-4">
                            <Button type="submit" disabled={isLoading} variant="secondary" className="h-12 px-10 shadow-[0_0_20px_rgba(0,196,154,0.2)] hover:shadow-[0_0_30px_rgba(0,196,154,0.4)] transition-all">
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
                </CardContent>
            </Card>
        </div>
    );
}
