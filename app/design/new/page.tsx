import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function freshId() {
  return `d_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export default function NewDesignPage() {
  redirect(`/design/${freshId()}`);
}
