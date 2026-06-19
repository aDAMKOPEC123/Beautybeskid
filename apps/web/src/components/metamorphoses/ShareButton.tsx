// filepath: apps/web/src/components/metamorphoses/ShareButton.tsx
import { useState } from 'react';
import { Share2, Check, Loader2 } from 'lucide-react';
import { generateShareImage } from '@/utils/generateShareImage';
import { toast } from 'sonner';

interface ShareButtonProps {
  beforeImage: string;
  afterImage: string;
  title: string;
}

export const ShareButton = ({ beforeImage, afterImage, title }: ShareButtonProps) => {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    setLoading(true);
    try {
      const blob = await generateShareImage(beforeImage, afterImage, title);
      const file = new File([blob], 'cosmo-metamorfoza.png', { type: 'image/png' });

      // Try native Web Share API (mobile)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${title} — BeautyBeskid Salon Kosmetyczny`,
          text: 'Zobacz moją metamorfozę w BeautyBeskid!',
          files: [file],
        });
        toast.success('Udostępniono!');
      } else {
        // Fallback: copy link
        const url = window.location.href;
        await navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success('Link skopiowany do schowka!');
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        // Fallback to just copy link
        try {
          await navigator.clipboard.writeText(window.location.href);
          setCopied(true);
          toast.success('Link skopiowany do schowka!');
          setTimeout(() => setCopied(false), 2000);
        } catch {
          toast.error('Nie udało się udostępnić');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleShare}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
      style={{ background: 'rgba(196,150,90,0.12)', color: '#C4965A' }}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : copied ? (
        <Check size={16} />
      ) : (
        <Share2 size={16} />
      )}
      {copied ? 'Skopiowano!' : 'Udostępnij'}
    </button>
  );
};
