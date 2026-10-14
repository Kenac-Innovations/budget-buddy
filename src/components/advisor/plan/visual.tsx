import Image from "next/image";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { PlanLine } from "@/lib/plan/types";
import { categoryIllustration } from "./derive";

export function LineVisual({ line, large = false }: { line: PlanLine; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  const product = line.price?.evidence.type === "OPERATOR_PRICE_LIST" ? line.price.product : undefined;
  const url = product?.imageUrl;
  const safe = url && ((!url.startsWith("//") && url.startsWith("/")) || url.startsWith("https://"));
  const photo = safe && !failed;
  const illustration = !photo || url?.startsWith("/catalogue/demo/");
  return <figure className={`bb-hud-visual${large ? " bb-hud-visual-large" : ""}`}>
    <Image unoptimized src={photo ? url : categoryIllustration(line.category)} width={large ? 400 : 84} height={large ? 250 : 84}
      alt={photo ? product!.name : `${line.category} illustration`} onError={() => setFailed(true)} />
    {illustration && <figcaption>Illustration</figcaption>}
    {large && product && <div className="mt-3 flex flex-wrap items-center justify-center gap-2"><Badge variant="secondary">Kenac</Badge><span>{product.name}</span></div>}
  </figure>;
}
