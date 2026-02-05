"use client";

import { useState } from "react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
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
                    placeholder="Search users..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Joined Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                    No users found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredUsers.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{user.email}</span>
                                            <span className="text-xs text-muted-foreground">{user.full_name || 'No name'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {user.created_at
                                            ? format(new Date(user.created_at), "d MMM yyyy", { locale: th })
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
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.id)}>
                                                    Copy User ID
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuLabel>Change Role</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'user')}>
                                                    <User className="mr-2 h-4 w-4" />
                                                    Set as User
                                                    {user.role === 'user' && <Check className="ml-auto h-4 w-4" />}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleRoleChange(user.id, 'admin')}>
                                                    <Shield className="mr-2 h-4 w-4" />
                                                    Set as Admin
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
                Total {filteredUsers.length} users
            </div>
        </div>
    );
}
