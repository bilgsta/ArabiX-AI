import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CreateConversationRequest, type UpdateConversationRequest } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export function useConversations() {
  return useQuery({
    queryKey: [api.conversations.list.path],
    queryFn: async () => {
      const res = await fetch(api.conversations.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return res.json() as Promise<Array<{
        id: number;
        userId: string;
        title: string;
        isEncrypted: boolean;
        isPinned: boolean;
        isArchived: boolean;
        isLocked: boolean;
        createdAt: string;
        updatedAt: string;
      }>>;
    },
  });
}

export function useConversation(id: number | null, pin?: string) {
  return useQuery({
    queryKey: [api.conversations.get.path, id, pin],
    enabled: !!id,
    retry: false,
    queryFn: async () => {
      if (!id) throw new Error("No ID");
      const url = buildUrl(api.conversations.get.path, { id });
      const headers: Record<string, string> = {};
      if (pin) headers["x-chat-pin"] = pin;
      const res = await fetch(url, { credentials: "include", headers });
      if (res.status === 403) {
        const data = await res.json();
        const err = new Error(data.message || "locked") as any;
        err.locked = true;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to fetch conversation");
      return res.json() as Promise<{
        conversation: {
          id: number;
          userId: string;
          title: string;
          isEncrypted: boolean;
          isPinned: boolean;
          isArchived: boolean;
          isLocked: boolean;
          createdAt: string;
          updatedAt: string;
        };
        messages: Array<{
          id: number;
          conversationId: number;
          role: string;
          content: string;
          attachments: any;
          createdAt: string;
        }>;
      }>;
    },
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async (data: CreateConversationRequest) => {
      const res = await fetch(api.conversations.create.path, {
        method: api.conversations.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to create chat");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.conversations.list.path] });
      setLocation(`/c/${data.id}`);
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "تعذر إنشاء محادثة جديدة. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      });
    }
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.conversations.delete.path, { id });
      const res = await fetch(url, { 
        method: api.conversations.delete.method,
        credentials: "include" 
      });
      if (!res.ok) throw new Error("Failed to delete chat");
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [api.conversations.list.path] });
      queryClient.removeQueries({ queryKey: [api.conversations.get.path, id] });
      setLocation("/c/new");
      toast({
        title: "تم الحذف",
        description: "تم حذف المحادثة بنجاح.",
      });
    },
  });
}

export function useUpdateConversation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & UpdateConversationRequest) => {
      const url = buildUrl(api.conversations.update.path, { id });
      const res = await fetch(url, {
        method: api.conversations.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update chat");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.conversations.list.path] });
    }
  });
}

export function useLockConversation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, pin }: { id: number; pin: string }) => {
      const res = await fetch(`/api/conversations/${id}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "فشل القفل");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.conversations.list.path] });
      toast({ title: "تم القفل", description: "تم تأمين المحادثة بكلمة السر." });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });
}

export function useUnlockConversation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, pin }: { id: number; pin: string }) => {
      const res = await fetch(`/api/conversations/${id}/lock`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "فشل إلغاء القفل");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.conversations.list.path] });
      toast({ title: "تم إلغاء القفل", description: "تمت إزالة كلمة السر من المحادثة." });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });
}
