import { headers } from "next/headers";
import BreadcrumbNav, { type Crumb } from "./BreadcrumbNav";

export type { Crumb };

/** Server wrapper so the breadcrumb JSON-LD receives this request's CSP nonce. */
export default async function Breadcrumb(
  props: Omit<React.ComponentProps<typeof BreadcrumbNav>, "nonce">,
) {
  const nonce = props.jsonLd === false ? "" : ((await headers()).get("x-nonce") ?? "");
  return <BreadcrumbNav {...props} nonce={nonce} />;
}
