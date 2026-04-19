"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { formatDate } from "@/lib/date";
import { useLocale } from "next-intl";
import { Profile } from "@/types";
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
    initialUsers: Profile[];
}

export function AdminUsersTable({ initialUsers }: AdminUsersTableProps) {
    const t = useTranslations("Admin");

    const locale = useLocale();
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const itemsPerPage = 100;
    const [users, setUsers] = useState(initialUsers);

    const filteredUsers = users.filter(user =>
        (user.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
        (user.full_name?.toLowerCase() || "").includes(searchTerm.toLowerCase())
    );

    const paginatedUsers = filteredUsers.slice((page - 1) * itemsPerPage, page * itemsPerPage);
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;

    const handleRoleChange = async (userId: string, newRole: string) => {
        const result = await updateUserRole(userId, newRole);
        if (result.success) {
            toast.success(t("role_updated"));
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
        } else {
            toast.error(t("role_update_failed"));
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
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setPage(1);
                    }}
                />
            </div>

            <div className="rounded-none border border-border bg-card overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="border-b border-border bg-muted/30 hover:bg-muted/30">
                            <TableHead className="text-[10px] font-black uppercase italic tracking-[0.15em] text-muted-foreground">{t("user")}</TableHead>
                            <TableHead className="text-[10px] font-black uppercase italic tracking-[0.15em] text-muted-foreground">{t("role")}</TableHead>
                            <TableHead className="text-[10px] font-black uppercase italic tracking-[0.15em] text-muted-foreground">{t("created_at")}</TableHead>
                            <TableHead className="text-right text-[10px] font-black uppercase italic tracking-[0.15em] text-muted-foreground">{t("actions")}</TableHead>
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
                            paginatedUsers.map((user) => (
                                <TableRow key={user.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 bg-secondary/10 flex items-center justify-center border border-secondary/20 shrink-0">
                                                <User className="h-4 w-4 text-secondary" />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-bold text-sm truncate">{user.email}</span>
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{user.full_name || t("no_name")}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={user.role === 'admin' ? 'default' : 'outline'}
                                            className="rounded-none text-[10px] font-black uppercase"
                                        >
                                            {user.role === 'admin' && <Shield className="mr-1 h-3 w-3" />}
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {user.created_at
                                            ? formatDate(user.created_at, "d MMM yyyy", locale)
                                            : "-"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted/30">
                                                    <span className="sr-only">{t("actions")}</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="rounded-none border-border">
                                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-wider">{t("actions")}</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.id)}>
                                                    {t("copy_user_id")}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-wider">{t("change_role")}</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'user')}>
                                                    <User className="mr-2 h-4 w-4" />
                                                    {t("set_as_user")}
                                                    {user.role === 'user' && <Check className="ml-auto h-4 w-4 text-secondary" />}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'admin')}>
                                                    <Shield className="mr-2 h-4 w-4" />
                                                    {t("set_as_admin")}
                                                    {user.role === 'admin' && <Check className="ml-auto h-4 w-4 text-secondary" />}
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
            {filteredUsers.length > 0 && (
                <div className="flex items-center justify-between py-2">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground hidden sm:block">
                        Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} entries
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            id="pagination-prev"
                            variant="outline"
                            size="sm"
                            className="rounded-none text-[10px] font-black uppercase"
                            onClick={() => {
                                setPage(p => Math.max(1, p - 1));
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            disabled={page === 1}
                        >
                            Previous
                        </Button>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground px-2" id="pagination-info">
                            Page {page} of {totalPages}
                        </span>
                        <Button
                            id="pagination-next"
                            variant="outline"
                            size="sm"
                            className="rounded-none text-[10px] font-black uppercase"
                            onClick={() => {
                                setPage(p => Math.min(totalPages, p + 1));
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            disabled={page === totalPages}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
