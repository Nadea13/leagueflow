"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { formatDate } from "@/lib/date";
import { useLocale } from "next-intl";
import { Search, Shield, User, MoreHorizontal, Check } from "lucide-react";
import { updateUserRole } from "@/app/[locale]/admin/actions";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AdminUsersTableProps {
    initialUsers: any[];
}

export function AdminUsersTable({ initialUsers }: AdminUsersTableProps) {
    const t = useTranslations("Admin");
    const tCommon = useTranslations("Common");
    const locale = useLocale();
    const [searchTerm, setSearchTerm] = useState("");
    const [users, setUsers] = useState(initialUsers);

    const filteredUsers = users.filter(user =>
        (user.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (user.full_name?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    );

    const handleRoleChange = async (userId: string, newRole: string) => {
        const result = await updateUserRole(userId, newRole);
        if (result.success) {
            toast.success(`Role updated to ${newRole}`);
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } else {
            toast.error(`Failed to update role: ${result.error}`);
        }
    };

    return (
        <div className="space-y-4">
            <div className="relative w-full md:w-[300px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder={t("search_users")}
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("user")}</TableHead>
                            <TableHead>{t("role")}</TableHead>
                            <TableHead>{t("created_at")}</TableHead>
                            <TableHead className="text-right">{t("actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                    {t("no_results")}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredUsers.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{user.email}</span>
                                            <span className="text-xs text-muted-foreground">{user.full_name || t("no_name")}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {user.created_at
                                            ? formatDate(user.created_at, "d MMM yyyy", locale)
                                            : "-"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>{t("actions")}</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.id)}>
                                                    {t("copy_user_id")}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuLabel>{t("change_role")}</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'user')}>
                                                    <User className="mr-2 h-4 w-4" />
                                                    {t("set_as_user")}
                                                    {user.role === 'user' && <Check className="ml-auto h-4 w-4" />}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'admin')}>
                                                    <Shield className="mr-2 h-4 w-4" />
                                                    {t("set_as_admin")}
                                                    {user.role === 'admin' && <Check className="ml-auto h-4 w-4" />}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="text-xs text-muted-foreground text-center">
                {t.rich("showing_users", {
                    count: filteredUsers.length,
                    total: filteredUsers.length
                })}
            </div>
        </div>
    );
}
