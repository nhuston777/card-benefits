import { ImageResponse } from "next/og";
import { BrandMark } from "@/lib/brand-mark";

// Browser tab / bookmark icon, matching the "H" monogram in SiteHeader.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<BrandMark rounded />, size);
}
