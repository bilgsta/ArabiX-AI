import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, Settings, LogOut, PanelRightOpen, PanelRightClose } from "lucide-react";
import { useConversations, useCreateConversation } from "@/hooks/use-conversations";
import { useAuth } from "@/hooks/use-auth";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Sidebar() {
  const [location] = useLocation();
  const { data: conversations, isLoading } = useConversations();
  const createConversation = useCreateConversation();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Extract current chat ID
  const currentChatId = location.startsWith("/c/") 
    ? parseInt(location.split("/")[2]) 
    : null;

  const handleNewChat = () => {
    createConversation.mutate({});
    setMobileOpen(false);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-secondary/30 border-l border-border/60">
      {/* Header */}
      <div className="p-4 border-b border-border/40">
        <Button 
          onClick={handleNewChat}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2 justify-start shadow-md hover:shadow-lg transition-all"
          disabled={createConversation.isPending}
        >
          <Plus className="w-5 h-5" />
          <span>محادثة جديدة</span>
        </Button>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {isLoading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : conversations?.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8 px-4">
              لا توجد محادثات سابقة. ابدأ محادثة جديدة!
            </div>
          ) : (
            conversations?.map((chat) => (
              <Link key={chat.id} href={`/c/${chat.id}`} className="block">
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 h-auto py-3 px-3 rounded-xl transition-all duration-200",
                    currentChatId === chat.id 
                      ? "bg-primary/10 text-primary hover:bg-primary/15 font-medium border border-primary/10" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                  onClick={() => setMobileOpen(false)}
                >
                  <MessageSquare className="w-4 h-4 shrink-0 rtl-flip" />
                  <span className="truncate text-right w-full">{chat.title || "محادثة جديدة"}</span>
                </Button>
              </Link>
            ))
          )}
        </div>
      </ScrollArea>

      {/* User Footer */}
      <div className="p-4 border-t border-border/40 bg-background/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold shadow-sm">
            {user?.firstName?.[0] || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="gap-2 text-xs" asChild>
            <Link href="/settings">
              <Settings className="w-3.5 h-3.5" />
              <span>الإعدادات</span>
            </Link>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
            onClick={() => logout()}
          >
            <LogOut className="w-3.5 h-3.5 rtl-flip" />
            <span>خروج</span>
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-80 h-full fixed inset-y-0 right-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Trigger */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden fixed top-3 right-3 z-50 bg-background/80 backdrop-blur border shadow-sm">
            <PanelRightOpen className="w-5 h-5 text-primary" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="p-0 w-80">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  );
}
