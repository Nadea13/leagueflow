import { getProducts } from "@/actions/products";
import { getTranslations } from "next-intl/server";
import { ProductDialog } from "@/components/admin/product-dialog";
import { ProductsTable } from "@/components/admin/products-table";

export default async function AdminPricingPage() {
    const { data: products } = await getProducts();
    const t = await getTranslations("Admin");

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold md:text-2xl">{t("product_management")}</h1>
                <ProductDialog />
            </div>

            <ProductsTable products={products || []} />
        </div>
    );
}
