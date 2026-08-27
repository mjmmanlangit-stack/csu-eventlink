import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff } from "lucide-react";

type Html5QrcodeInstance = {
  start: (
    camera: { facingMode: string } | { deviceId: { exact: string } },
    config: { fps: number; qrbox: number },
    onSuccess: (text: string) => void,
    onError: (message: string) => void,
  ) => Promise<void>;
  stop: () => Promise<void>;
  clear: () => void;
};

export function QrScanner({ onScan }: { onScan: (token: string) => void }) {
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeInstance | null>(null);
  const onScanRef = useRef(onScan);
  const lastRef = useRef("");
  const regionId = `qr-scanner-${useId().replace(/:/g, "")}`;

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!active) return;
    let stopped = false;
    let started = false;
    setStarting(true);
    setError(null);

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera unavailable");
        const permissionStream = await navigator.mediaDevices.getUserMedia({ video: true });
        permissionStream.getTracks().forEach((track) => track.stop());
        const cameras = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = cameras.filter((device) => device.kind === "videoinput");
        const preferredCamera = videoDevices.find((device) => /back|rear|environment/i.test(device.label));
        const { Html5Qrcode } = await import("html5-qrcode");
        if (stopped) return;
        const instance = new Html5Qrcode(regionId) as unknown as Html5QrcodeInstance;
        scannerRef.current = instance;
        await instance.start(
          preferredCamera ? { deviceId: { exact: preferredCamera.deviceId } } : { facingMode: "environment" },
          { fps: 10, qrbox: 240 },
          (text) => {
            if (text === lastRef.current) return;
            lastRef.current = text;
            onScanRef.current(text);
            setTimeout(() => { lastRef.current = ""; }, 2500);
          },
          () => {},
        );
        started = true;
        if (!stopped) setStarting(false);
      } catch (cameraError) {
        if (!stopped) {
          const message = cameraError instanceof DOMException && cameraError.name === "NotAllowedError"
            ? "Camera access is blocked. Click the camera icon in the address bar, allow camera access for localhost, then try again."
            : "Unable to access the camera. Allow camera access or use manual code entry instead.";
          setError(message);
          setActive(false);
          setStarting(false);
        }
      }
    })();

    return () => {
      stopped = true;
      const instance = scannerRef.current;
      scannerRef.current = null;
      if (instance && started) {
        try {
          void instance.stop().then(() => instance.clear()).catch(() => undefined);
        } catch {
          instance.clear();
        }
      }
    };
  }, [active, regionId]);

  return (
    <div className="space-y-3">
      <div
        id={regionId}
        className="mx-auto w-full max-w-sm overflow-hidden rounded-lg border border-border bg-muted/40"
        style={{ minHeight: active ? 260 : 0 }}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button
        type="button"
        variant={active ? "outline" : "default"}
        onClick={() => setActive((value) => !value)}
        disabled={starting}
      >
        {active ? <CameraOff className="mr-2 h-4 w-4" /> : <Camera className="mr-2 h-4 w-4" />}
        {starting ? "Starting camera..." : active ? "Stop camera" : "Start camera scanner"}
      </Button>
    </div>
  );
}
