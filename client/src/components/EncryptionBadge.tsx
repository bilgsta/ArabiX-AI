import { Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function EncryptionBadge() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium cursor-help transition-colors hover:bg-primary/15 border border-primary/20">
          <Lock className="w-3 h-3" />
          <span>مشفر كلياً</span>
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-center" side="bottom">
        <p>هذه المحادثة محمية بتقنية التشفير التام بين الطرفين. لا أحد يستطيع قراءة رسائلك سواك أنت وأبو اليزيد.</p>
      </TooltipContent>
    </Tooltip>
  );
}
