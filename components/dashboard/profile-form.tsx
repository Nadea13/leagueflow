"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateProfile } from "@/app/[locale]/dashboard/settings/actions";
import { signOut } from "@/app/[locale]/dashboard/actions";
import { Loader2, LogOut, User } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export function ProfileForm({ user }: { user: any }) {
    const t = useTranslations("Profile");
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
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5 text-muted-foreground" />
                        {t("user_info")}
                    </CardTitle>
                    <CardDescription>{t("user_info_desc")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={handleUpdate} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">{t("email")}</Label>
                            <Input id="email" value={user?.email} disabled className="bg-muted" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="fullName">{t("full_name")}</Label>
                            <Input
                                id="fullName"
                                name="fullName"
                                defaultValue={user?.user_metadata?.full_name || ""}
                                placeholder={t("enter_full_name")}
                            />
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t("save_changes")}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
