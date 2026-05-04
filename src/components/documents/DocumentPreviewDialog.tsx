import { useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { resolveFileUrl } from '@/lib/api';

interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewUrl: string | null;
  title: string;
}

export default function DocumentPreviewDialog({
  open,
  onOpenChange,
  previewUrl,
  title,
}: DocumentPreviewDialogProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blobType, setBlobType] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !previewUrl) {
      setBlobUrl(null);
      setBlobType('');
      setError(null);
      return;
    }

    let revoke: string | null = null;
    setLoading(true);
    setError(null);

    const token = localStorage.getItem('snecea_token');
    const scheme = import.meta.env.VITE_AUTH_SCHEME ?? 'Token';
    const hdrs: Record<string, string> = {};
    if (token) hdrs['Authorization'] = `${scheme} ${token}`;

    fetch(resolveFileUrl(previewUrl), { headers: hdrs })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        revoke = URL.createObjectURL(blob);
        setBlobUrl(revoke);
        setBlobType(blob.type);
      })
      .catch((err) => {
        setBlobUrl(null);
        setError(err instanceof Error ? err.message : 'Impossible de charger le document.');
      })
      .finally(() => setLoading(false));

    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [open, previewUrl]);

  const isPdf = blobType === 'application/pdf';
  const isImage = blobType.startsWith('image/');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <AlertCircle className="w-10 h-10" />
              <p className="text-sm">Impossible de charger l'aperçu.</p>
            </div>
          ) : blobUrl ? (
            isPdf ? (
              <object
                data={`${blobUrl}#toolbar=1&navpanes=0`}
                type="application/pdf"
                className="w-full h-full rounded-md border"
              >
                <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                  <AlertCircle className="w-10 h-10" />
                  <p className="text-sm">Impossible d'afficher le PDF dans le navigateur.</p>
                  <a
                    href={blobUrl}
                    download={`${title || 'document'}.pdf`}
                    className="text-sm text-primary underline hover:no-underline"
                  >
                    Télécharger le PDF
                  </a>
                </div>
              </object>
            ) : isImage ? (
              <div className="flex items-center justify-center h-full overflow-auto">
                <img
                  src={blobUrl}
                  alt={title}
                  className="max-w-full max-h-full object-contain rounded-md"
                />
              </div>
            ) : (
              <iframe
                src={blobUrl}
                className="w-full h-full rounded-md border"
                title={title}
              />
            )
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Aucun document à afficher.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
