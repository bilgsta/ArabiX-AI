import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Eye, EyeOff } from "lucide-react";

interface PasswordDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => void;
  isLoading?: boolean;
  error?: string;
  title?: string;
  description?: string;
}

export function PasswordDialog({ 
  open, 
  onClose, 
  onSubmit, 
  isLoading, 
  error,
  title = "محادثة محمية",
  description = "أدخل كلمة السر للوصول إلى هذه المحادثة"
}: PasswordDialogProps) {
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim()) {
      onSubmit(pin.trim());
    }
  };

  const handleClose = () => {
    setPin("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm text-right" dir="rtl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">{title}</DialogTitle>
              <DialogDescription className="text-sm">{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              type={showPin ? "text" : "password"}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="أدخل كلمة السر..."
              className="pl-10 text-right"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={!pin.trim() || isLoading}>
              {isLoading ? "جاري التحقق..." : "فتح المحادثة"}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose}>
              إلغاء
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface SetPasswordDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => void;
  isLoading?: boolean;
  mode?: "lock" | "unlock";
}

export function SetPasswordDialog({
  open,
  onClose,
  onSubmit,
  isLoading,
  mode = "lock"
}: SetPasswordDialogProps) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "lock") {
      if (pin.length < 4) {
        setError("يجب أن تكون كلمة السر 4 أحرف على الأقل");
        return;
      }
      if (pin !== confirmPin) {
        setError("كلمتا السر غير متطابقتين");
        return;
      }
    }

    onSubmit(pin.trim());
  };

  const handleClose = () => {
    setPin("");
    setConfirmPin("");
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm text-right" dir="rtl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">
                {mode === "lock" ? "تأمين المحادثة" : "إزالة كلمة السر"}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {mode === "lock" 
                  ? "أدخل كلمة سر لحماية هذه المحادثة"
                  : "أدخل كلمة السر الحالية لإزالة الحماية"
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Input
              type={showPin ? "text" : "password"}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder={mode === "lock" ? "كلمة السر الجديدة" : "كلمة السر الحالية"}
              className="pl-10 text-right"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {mode === "lock" && (
            <Input
              type={showPin ? "text" : "password"}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              placeholder="تأكيد كلمة السر"
              className="text-right"
            />
          )}

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={!pin.trim() || isLoading}>
              {isLoading ? "جاري..." : mode === "lock" ? "تأمين المحادثة" : "إزالة كلمة السر"}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose}>
              إلغاء
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
