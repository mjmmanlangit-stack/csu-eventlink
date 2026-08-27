import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function QrCodeView({ token, size = 220 }: { token: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(token, { width: size * 2, margin: 1, errorCorrectionLevel: "M" })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => setDataUrl(null));
    return () => {
      cancelled = true;
    };
  }, [token, size]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="flex items-center justify-center rounded-lg border border-border bg-card p-3"
        style={{ width: size + 24, height: size + 24 }}
      >
        {dataUrl ? (
          <img src={dataUrl} alt="Attendance QR code" width={size} height={size} />
        ) : (
          <span className="text-xs text-muted-foreground">Generating…</span>
        )}
      </div>
      <p className="font-mono text-xs text-muted-foreground">{token}</p>
      <Button asChild size="sm" variant="outline" disabled={!dataUrl}>
        <a href={dataUrl ?? undefined} download={`event-attendance-${token}.png`}>
          <Download className="mr-2 h-4 w-4" />
          Download QR code
        </a>
      </Button>
    </div>
  );
}
