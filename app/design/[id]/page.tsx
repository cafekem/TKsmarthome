import { EditorShell } from "@/components/editor/EditorShell";

export default async function DesignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditorShell designId={id} />;
}
