import "server-only";
import QRCode from "qrcode";
import { qrPayloadFor } from "@/lib/qr";
import { getOrigin } from "./origin";

/** The signed-in user's contact QR code as an inline SVG string. */
export async function myQrCode(userName: string): Promise<{ svg: string; link: string }> {
  const link = qrPayloadFor(userName, await getOrigin());
  const svg = await QRCode.toString(link, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#1e1b4bff", light: "#ffffff00" },
  });
  return { svg, link };
}
