import { BlockLoader } from "@/components/Spinner";

export default function Loading() {
  return (
    <div className="container page">
      <BlockLoader label="Chargement…" />
    </div>
  );
}
