"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Product } from "@/types"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Edit2, Trash2, Search } from "lucide-react"
import { deleteProduct } from "@/actions/products"
import { ProductDialog } from "./product-dialog"
import { Input } from "@/components/ui/input"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"

interface ProductsTableProps {
    products: Product[]
}

export function ProductsTable({ products }: ProductsTableProps) {
    const t = useTranslations("Admin");
    const tCommon = useTranslations("Common");
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [page, setPage] = useState(1);
    const itemsPerPage = 100;
    const { toast } = useToast()

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description?.some(d => d.toLowerCase().includes(searchTerm.toLowerCase())) ?? false)
    );

    const paginatedProducts = filteredProducts.slice((page - 1) * itemsPerPage, page * itemsPerPage);
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;

    const handleDelete = async (id: string) => {
        setDeletingId(id)
        try {
            await deleteProduct(id)
            toast({ title: tCommon("success"), description: t("delete_success") })
        } catch (error) {
            console.error("Failed to delete", error)
            toast({ title: tCommon("error"), description: tCommon("error_desc"), variant: "destructive" })
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <div className="space-y-4">
            <div className="relative w-full md:w-[300px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder={t("search_products")}
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setPage(1);
                    }}
                />
            </div>

            <div className="rounded-none border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("product_name")}</TableHead>
                            <TableHead>{t("price")}</TableHead>
                            <TableHead>{t("discounted_price")}</TableHead>
                            <TableHead>{t("duration")}</TableHead>
                            <TableHead>{t("user_limit")}</TableHead>
                            <TableHead>{t("teams_limit")}</TableHead>
                            <TableHead>{t("target_role")}</TableHead>
                            <TableHead>{t("recommended")}</TableHead>
                            <TableHead className="text-right">{t("actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                                    {t("no_results")}
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedProducts.map((product) => (
                                <TableRow key={product.id}>
                                    <TableCell className="font-medium">
                                        {product.name}
                                        {product.description && product.description.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {product.description.slice(0, 3).map((feature, i) => (
                                                    <span key={i} className="inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-normal text-muted-foreground bg-secondary/50">
                                                        {feature}
                                                    </span>
                                                ))}
                                                {product.description.length > 3 && (
                                                    <span className="text-xs text-muted-foreground self-center">
                                                        +{product.description.length - 3} {tCommon("more")}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>{product.price.toFixed(2)}</TableCell>
                                    <TableCell>{product.discounted_price ? product.discounted_price.toFixed(2) : "-"}</TableCell>
                                    <TableCell>{product.duration || t("lifetime")}</TableCell>
                                    <TableCell>{product.user_limit || t("unlimited")}</TableCell>
                                    <TableCell>{product.teams_limit === 0 ? t("unlimited") : product.teams_limit}</TableCell>
                                    <TableCell>
                                        <span className={`inline-flex items-center rounded-none px-2 py-0.5 text-xs font-medium ${
                                            product.target_role === 'manager' 
                                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" 
                                                : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
                                        }`}>
                                            {product.target_role === 'manager' ? t("manager") : t("organizer")}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {product.recommended && (
                                            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                                                {t("recommended")}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <ProductDialog product={product}>
                                                <Button variant="ghost" size="icon">
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                            </ProductDialog>

                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>{tCommon("are_you_sure")}</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            {t("delete_product_confirm")}
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() => handleDelete(product.id)}
                                                            className="bg-red-500 hover:bg-red-600"
                                                        >
                                                            {deletingId === product.id ? t("deleting") : tCommon("delete")}
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {filteredProducts.length > 0 && (
                <div className="flex items-center justify-between py-2 px-4 border-t">
                    <div className="text-sm text-muted-foreground hidden sm:block">
                        Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, filteredProducts.length)} of {filteredProducts.length} entries
                    </div>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            Previous
                        </Button>
                        <span className="text-sm text-muted-foreground px-2">Page {page} of {totalPages}</span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
