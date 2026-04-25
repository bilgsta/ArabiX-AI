import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, MessageSquare, Settings, LogOut, Lock, Trash2, Search, X, PanelRightOpen, MoreVertical, Unlock, Mic, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useConversations, useCreateConversation, useDeleteConversation, useLockConversation, useUnlockConversation } from "@/hooks/use-conversations";
import { useAuth } from "@/hooks/use-auth";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { SetPasswordDialog } from "@/components/PasswordDialog";
import { useState } from "react";

function SidebarInner({ onClose }: { onClose?: () => void }) {
  const [location] = useLocation();
  const { data: conversations, isLoading } = useConversations();
  const createConversation = useCreateConversation();
  const deleteConversation = useDeleteConversation();
  const lockConversation = useLockConversation();
  const unlockConversation = useUnlockConversation();
  const { user, logout } = useAuth();
  const { data: adminCheck } = useQuery<{ isAdmin: boolean }>({ queryKey: ["/api/admin/me"] });
  const [search, setSearch] = useState("");
  const [lockDialogId, setLockDialogId] = useState<number | null>(null);
  const [lockMode, setLockMode] = useState<"lock" | "unlock">("lock");

  const currentChatId = location.startsWith("/c/") && location.split("/")[2] !== "new"
    ? parseInt(location.split("/")[2])
    : null;

  const filteredConversations = conversations?.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleNewChat = () => {
    createConversation.mutate({});
    onClose?.();
  };

  const openLockDialog = (id: number, isLocked: boolean) => {
    setLockDialogId(id);
    setLockMode(isLocked ? "unlock" : "lock");
  };

  const handleLockSubmit = (pin: string) => {
    if (!lockDialogId) return;
    if (lockMode === "lock") {
      lockConversation.mutate({ id: lockDialogId, pin }, {
        onSuccess: () => setLockDialogId(null),
      });
    } else {
      unlockConversation.mutate({ id: lockDialogId, pin }, {
        onSuccess: () => setLockDialogId(null),
      });
    }
  };

  return (
    <>
      <SetPasswordDialog
        open={lockDialogId !== null}
        onClose={() => setLockDialogId(null)}
        onSubmit={handleLockSubmit}
        isLoading={lockConversation.isPending || unlockConversation.isPending}
        mode={lockMode}
      />

      <div className="flex flex-col h-full bg-secondary/30 border-l border-border/60">
        {/* Header */}
        <div className="p-4 border-b border-border/40 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-bold text-primary tracking-wide flex-1">أبو اليزيد</span>
          </div>
          <Button 
            onClick={handleNewChat}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2 justify-start shadow-md hover:shadow-lg transition-all"
            disabled={createConversation.isPending}
          >
            <Plus className="w-5 h-5" />
            <span>محادثة جديدة</span>
          </Button>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث في المحادثات..."
              className="pr-9 pl-8 text-sm h-9 bg-background/60"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute left-2 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Chat List */}
        <ScrollArea className="flex-1 px-2 py-3">
          <div className="space-y-0.5">
            {isLoading ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-10 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredConversations?.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8 px-4">
                {search ? "لا توجد نتائج للبحث" : "لا توجد محادثات. ابدأ محادثة جديدة!"}
              </div>
            ) : (
              filteredConversations?.map((chat) => (
                <div key={chat.id} className="group flex items-center gap-1 relative">
                  <Link href={`/c/${chat.id}`} className="flex-1 min-w-0">
                    <div
                      className={cn(
                        "flex items-center gap-2 w-full py-2.5 px-3 rounded-xl transition-all duration-200 cursor-pointer",
                        currentChatId === chat.id 
                          ? "bg-primary/10 text-primary font-medium border border-primary/10" 
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                      onClick={() => onClose?.()}
                    >
                      {chat.isLocked ? (
                        <Lock className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                      ) : (
                        <MessageSquare className="w-3.5 h-3.5 shrink-0 rtl-flip" />
                      )}
                      <span className="truncate text-sm">{chat.title || "محادثة جديدة"}</span>
                    </div>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-muted transition-all shrink-0">
                        <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44" dir="rtl">
                      <DropdownMenuItem
                        className="gap-2 cursor-pointer"
                        onClick={() => openLockDialog(chat.id, chat.isLocked)}
                      >
                        {chat.isLocked ? (
                          <><Unlock className="w-4 h-4" /><span>إزالة كلمة السر</span></>
                        ) : (
                          <><Lock className="w-4 h-4" /><span>تأمين بكلمة سر</span></>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="gap-2 text-destructive cursor-pointer focus:text-destructive"
                        onClick={() => deleteConversation.mutate(chat.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>حذف المحادثة</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* User Footer */}
        <div className="p-4 border-t border-border/40 bg-background/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-3 px-1">
            {user?.profileImageUrl ? (
              <img src={user.profileImageUrl} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-primary/20" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-sm shadow-sm">
                {user?.firstName?.[0] || "U"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" className="gap-1 text-xs" asChild>
              <Link href="/settings">
                <Settings className="w-3.5 h-3.5" />
                <span>الإعدادات</span>
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="gap-1 text-xs text-primary hover:text-primary hover:bg-primary/10 border-primary/20" asChild>
              <Link href="/voice">
                <Mic className="w-3.5 h-3.5" />
                <span>صوتي</span>
              </Link>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-1 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
              onClick={() => logout()}
            >
              <LogOut className="w-3.5 h-3.5 rtl-flip" />
              <span>خروج</span>
            </Button>
          </div>
          {adminCheck?.isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1 text-xs mt-2 text-amber-600 hover:text-amber-600 hover:bg-amber-500/10 border-amber-500/30"
              asChild
              data-testid="link-admin"
            >
              <Link href="/admin">
                <Shield className="w-3.5 h-3.5" />
                <span>لوحة الأدمن - رسائل المستخدمين</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-80 h-full fixed inset-y-0 right-0 z-30">
        <SidebarInner />
      </aside>

      {/* Mobile Trigger + Drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden fixed top-3 right-3 z-50 bg-background/80 backdrop-blur border shadow-sm">
            <PanelRightOpen className="w-5 h-5 text-primary" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="p-0 w-80">
          <SheetTitle className="sr-only">القائمة الجانبية</SheetTitle>
          <SidebarInner onClose={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
