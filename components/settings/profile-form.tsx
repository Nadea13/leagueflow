"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProfile } from "@/actions/common/user";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { Profile } from "@/types";
import { LogoUploader } from "@/components/shared/logo-uploader";

export function ProfileForm({ user, profile }: { user: User; profile?: Profile }) {
    const t = useTranslations("Profile");
    const tCommon = useTranslations("Common");
    const tRoster = useTranslations("Roster"); // for tel or phone translation if needed
    const tTeam = useTranslations("Team"); // for upload_logo/photo related translations if needed
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(profile?.profile_img || user?.user_metadata?.avatar_url || null);
    const [removeAvatar, setRemoveAvatar] = useState(false);

    async function handleUpdate(formData: FormData) {
        setIsLoading(true);

        if (selectedFile) {
            formData.append("avatar", selectedFile);
        }
        formData.append("existing_avatar_url", previewUrl || "");
        formData.append("remove_avatar", removeAvatar ? "true" : "false");

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
        <div className="relative overflow-hidden group bg-card p-2 md:p-4 rounded-sm border">
            <form action={handleUpdate} className="grid gap-1 md:gap-2">
                <div className="space-y-1">
                    <Label>Profile Photo</Label>
                    <LogoUploader
                        id="profile-avatar"
                        initialUrl={previewUrl}
                        onFileChange={(file) => {
                            setSelectedFile(file);
                            setRemoveAvatar(false);
                            if (file) {
                                setPreviewUrl(URL.createObjectURL(file));
                            } else {
                                setPreviewUrl(null);
                            }
                        }}
                        onRemove={() => {
                            setSelectedFile(null);
                            setPreviewUrl(null);
                            setRemoveAvatar(true);
                        }}
                        uploadLabel={tTeam("upload_logo") || "Upload Photo"}
                        clickToUploadLabel={tTeam("click_to_upload") || "Change Photo"}
                        previewLabel={tCommon("preview") || "Preview"}
                        imageFit="cover"
                    />
                </div>
                <div className="space-y-1">
                    <Label>{t("email")}</Label>
                    <Input
                        id="email"
                        value={user?.email}
                        disabled
                    />
                </div>
                <div className="space-y-1">
                    <Label>{t("full_name")}</Label>
                    <Input
                        id="fullName"
                        name="fullName"
                        defaultValue={profile?.full_name || user?.user_metadata?.full_name || ""}
                    />
                </div>
                <div className="space-y-1">
                    <Label>{tRoster("tel")}</Label>
                    <Input
                        id="phone"
                        name="phone"
                        defaultValue={profile?.phone || ""}
                    />
                </div>
                <div className="flex justify-end">
                    <Button type="submit" disabled={isLoading} variant="default">
                        {isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <span className="flex items-center">
                                {tCommon("save")}
                            </span>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
