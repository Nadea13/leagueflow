import { redirect } from "next/navigation";

export default function FreeOverlayRedirect({ params }: { params: { locale: string } }) {
  redirect(`/${params.locale || "th"}/overlay`);
}
