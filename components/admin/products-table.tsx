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
import { Edit2, Trash2 } from "lucide-react"
import { deleteProduct } from "@/actions/products"
import { ProductDialog } from "./product-dialog"
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
    const { toast } = useToast()

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
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t("product_name")}</TableHead>
                        <TableHead>{t("price")}</TableHead>
                        <TableHead>{t("discounted_price")}</TableHead>
                        <TableHead>{t("duration")}</TableHead>
                        <TableHead>{t("user_limit")}</TableHead>
                        <TableHead className="text-right">{t("actions")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {products.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                {t("no_results")}
                            </TableCell>
                        </TableRow>
                    ) : (
                        products.map((product) => (
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
    )
}
