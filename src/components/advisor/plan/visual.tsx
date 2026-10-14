import Image from "next/image";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { PlanLine } from "@/lib/plan/types";
import { catalogueDisplay, catalogueIllustration } from "@/lib/pricing/catalogue-display";
import { categoryIllustration } from "./derive";

export function LineVisual({ line, large = false }: { line: PlanLine; large?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const supply = catalogueDisplay(line);
  const product = line.price?.evidence.type === "OPERATOR_PRICE_LIST" ? line.price.product : supply;
  const url = product?.imageUrl;
  const safe = url && ((!url.startsWith("//") && url.startsWith("/")) || url.startsWith("https://"));
  const photo = safe && url !== failedUrl;
  const illustration = !photo || url?.startsWith("/catalogue/demo/");
  const fallback = supply ? catalogueIllustration(line.category) : categoryIllustration(line.category);
  return <figure className={`bb-hud-visual${large ? " bb-hud-visual-large" : ""}`}>
    <div className="bb-hud-visual-stage">
      {photo ? <Image unoptimized src={url} width={large ? 400 : 84} height={large ? 250 : 84}
        alt={product!.name} onError={() => setFailedUrl(url)} /> :
        <span className="bb-hud-category-art" role="img" aria-label={`${line.category} illustration`}
          style={{ maskImage: `url("${fallback}")`, WebkitMaskImage: `url("${fallback}")` }} />}
    </div>
    <figcaption>{illustration ? "Illustration" : "Product image"}</figcaption>
    {large && product && <div className="mt-3 flex flex-wrap items-center justify-center gap-2"><Badge variant="secondary">Kenac</Badge><span>{product.name}</span></div>}
  </figure>;
}
