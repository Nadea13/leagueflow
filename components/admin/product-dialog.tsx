"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Product } from "@/types"
import { upsertProduct } from "@/actions/products"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Trash2 } from "lucide-react"

const productSchema = z.object({
    name: z.string().min(1, "name_required"),
    description: z.array(z.object({ value: z.string().min(1, "feature_required") })).optional(),
    price: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
        message: "price_invalid",
    }),
    discounted_price: z.string().optional().refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), {
        message: "discount_invalid",
    }),
    duration: z.string().optional(),
    user_limit: z.string().optional().refine((val) => !val || (!isNaN(Number(val)) && Number(val) > 0), {
        message: "user_limit_invalid",
    }),
})

type ProductFormValues = z.infer<typeof productSchema>

interface ProductDialogProps {
    product?: Product
    open?: boolean
    onOpenChange?: (open: boolean) => void
    children?: React.ReactNode
}

export function ProductDialog({ product, open: controlledOpen, onOpenChange: setControlledOpen, children }: ProductDialogProps) {
    const t = useTranslations("Admin");
    const tCommon = useTranslations("Common");
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const { toast } = useToast()

    const isControlled = controlledOpen !== undefined
    const isOpen = isControlled ? controlledOpen : open
    const onOpenChange = isControlled ? setControlledOpen : setOpen

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            name: "",
            description: [],
            price: "",
            discounted_price: "",
            duration: "",
            user_limit: "",
        },
    })

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "description",
    })

    useEffect(() => {
        if (isOpen) {
            if (product) {
                form.reset({
                    name: product.name,
                    description: product.description?.map(d => ({ value: d })) || [],
                    price: product.price.toString(),
                    discounted_price: product.discounted_price?.toString() || "",
                    duration: product.duration || "",
                    user_limit: product.user_limit?.toString() || "",
                })
            } else {
                form.reset({
                    name: "",
                    description: [],
                    price: "",
                    discounted_price: "",
                    duration: "",
                    user_limit: "",
                })
            }
        }
    }, [product, form, isOpen])

    const onSubmit = async (data: ProductFormValues) => {
        setIsLoading(true)
        try {
            const result = await upsertProduct({
                id: product?.id,
                name: data.name,
                description: data.description?.map(d => d.value) || [],
                price: Number(data.price),
                discounted_price: data.discounted_price ? Number(data.discounted_price) : null,
                duration: data.duration || null,
                user_limit: data.user_limit ? Number(data.user_limit) : null,
            })

            if (result.success) {
                toast({ title: tCommon("success"), description: t("save_success") })
                onOpenChange?.(false)
                form.reset()
            } else {
                toast({ title: tCommon("error"), description: result.error, variant: "destructive" })
            }
        } catch (error) {
            console.error(error)
            toast({ title: tCommon("error"), description: tCommon("error_desc"), variant: "destructive" })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                {children || <Button><Plus className="mr-2 h-4 w-4" /> {t("add_product")}</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{product ? t("edit_product") : t("add_product")}</DialogTitle>
                    <DialogDescription>
                        {product ? tCommon("edit_desc") : tCommon("create_desc")}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">{t("product_name")}</Label>
                            <div className="col-span-3">
                                <Input id="name" {...form.register("name")} />
                                {form.formState.errors.name && <p className="text-sm text-red-500 mt-1">{t("name_required")}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label className="text-right pt-2">{t("description")}</Label>
                            <div className="col-span-3 space-y-2">
                                {fields.map((field, index) => (
                                    <div key={field.id} className="flex gap-2">
                                        <Input
                                            {...form.register(`description.${index}.value` as const)}
                                            placeholder={t("feature_description")}
                                        />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="shrink-0 text-red-500">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => append({ value: "" })}
                                    className="w-full"
                                >
                                    <Plus className="mr-2 h-4 w-4" /> {t("add_feature")}
                                </Button>
                                {form.formState.errors.description && <p className="text-sm text-red-500 mt-1">{tCommon("required")}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="price" className="text-right">{t("price")}</Label>
                            <div className="col-span-3">
                                <Input id="price" type="number" step="0.01" {...form.register("price")} />
                                {form.formState.errors.price && <p className="text-sm text-red-500 mt-1">{t(form.formState.errors.price.message || "")}</p>}
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="discounted_price" className="text-right">{t("discounted_price")}</Label>
                            <div className="col-span-3">
                                <Input id="discounted_price" type="number" step="0.01" {...form.register("discounted_price")} />
                                {form.formState.errors.discounted_price && <p className="text-sm text-red-500 mt-1">{t(form.formState.errors.discounted_price.message || "")}</p>}
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="duration" className="text-right">{t("duration")}</Label>
                            <div className="col-span-3">
                                <Input id="duration" placeholder={t("duration_placeholder")} {...form.register("duration")} />
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="user_limit" className="text-right">{t("user_limit")}</Label>
                            <div className="col-span-3">
                                <Input id="user_limit" type="number" {...form.register("user_limit")} />
                                {form.formState.errors.user_limit && <p className="text-sm text-red-500 mt-1">{t(form.formState.errors.user_limit.message || "")}</p>}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {tCommon("save")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
