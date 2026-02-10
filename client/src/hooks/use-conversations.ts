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
      return api.conversations.list.responses[200].parse(await res.json());
    },
  });
}

export function useConversation(id: number | null) {
  return useQuery({
    queryKey: [api.conversations.get.path, id],
    enabled: !!id,
    queryFn: async () => {
      if (!id) throw new Error("No ID");
      const url = buildUrl(api.conversations.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch conversation");
      return api.conversations.get.responses[200].parse(await res.json());
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
      return api.conversations.create.responses[201].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.conversations.list.path] });
      // Navigate to the new conversation
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
      setLocation("/");
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
      return api.conversations.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.conversations.list.path] });
    }
  });
}
