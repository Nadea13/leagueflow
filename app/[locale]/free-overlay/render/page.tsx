import { redirect } from "next/navigation";

export default function FreeOverlayRenderRedirect({ params }: { params: { locale: string } }) {
  redirect(`/${params.locale || "th"}/overlay/render`);
}
