import { getProducts } from "@/actions/products";
import { ProductDialog } from "@/components/admin/product-dialog";
import { ProductsTable } from "@/components/admin/products-table";

export default async function AdminPricingPage() {
    const { data: products } = await getProducts();

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold md:text-2xl">Pricing & Products</h1>
                <ProductDialog />
            </div>

            <ProductsTable products={products || []} />
        </div>
    );
}
