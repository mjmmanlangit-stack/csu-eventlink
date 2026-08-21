import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff } from "lucide-react";

type Html5QrcodeInstance = {
  start: (
    camera: { facingMode: string },
    config: { fps: number; qrbox: number },
    onSuccess: (text: string) => void,
    onError: (message: string) => void,
  ) => Promise<void>;
  stop: () => Promise<void>;
  clear: () => void;
};

export function QrScanner({ onScan }: { onScan: (token: string) => void }) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeInstance | null>(null);
  const lastRef = useRef<string>("");

  useEffect(() => {
    if (!active) return;
    let stopped = false;

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const instance = new Html5Qrcode("qr-scanner-region") as unknown as Html5QrcodeInstance;
        scannerRef.current = instance;
        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 240 },
          (text) => {
            if (text === lastRef.current) return;
            lastRef.current = text;
            onScan(text);
            setTimeout(() => {
              lastRef.current = "";
            }, 2500);
          },
          () => {},
        );
      } catch {
        if (!stopped) {
          setError("Unable to access the camera. Use manual code entry instead.");
          setActive(false);
        }
      }
    })();

    return () => {
      stopped = true;
      const instance = scannerRef.current;
      scannerRef.current = null;
      if (instance) {
        instance
          .stop()
          .then(() => instance.clear())
          .catch(() => {});
      }
    };
  }, [active, onScan]);

  return (
    <div className="space-y-3">
      <div
        id="qr-scanner-region"
        className="mx-auto w-full max-w-sm overflow-hidden rounded-lg border border-border bg-muted/40"
        style={{ minHeight: active ? 260 : 0 }}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="button" variant={active ? "outline" : "default"} onClick={() => setActive((v) => !v)}>
        {active ? <CameraOff className="mr-2 h-4 w-4" /> : <Camera className="mr-2 h-4 w-4" />}
        {active ? "Stop camera" : "Start camera scanner"}
      </Button>
    </div>
  );
}
