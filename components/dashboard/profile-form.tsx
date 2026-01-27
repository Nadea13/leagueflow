"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateProfile, signOut } from "@/app/[locale]/dashboard/profile/actions";
import { Loader2, LogOut } from "lucide-react";
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
                    <CardTitle>{t("user_info")}</CardTitle>
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
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t("save_changes")}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t("preferences")}</CardTitle>
                    <CardDescription>{t("preferences_desc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>{t("language")}</Label>
                        <Input value="English" disabled />
                        <p className="text-xs text-muted-foreground">{t("more_lang_soon")}</p>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-destructive/20">
                <CardHeader>
                    <CardTitle className="text-destructive">{t("danger_zone")}</CardTitle>
                    <CardDescription>{t("danger_zone_desc")}</CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={signOut}>
                        <Button variant="destructive" className="w-full sm:w-auto">
                            <LogOut className="mr-2 h-4 w-4" />
                            {t("sign_out")}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
