import { useQueryClient, useMutation } from "@tanstack/react-query";
import { api, buildUrl, type CreateMessageRequest } from "@shared/routes";
import { useState, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

export function useSendMessage(conversationId: number, pin?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useMutation({
    mutationFn: async (data: CreateMessageRequest) => {
      setIsStreaming(true);
      setStreamedContent("");
      abortControllerRef.current = new AbortController();

      const url = buildUrl(api.messages.create.path, { id: conversationId });
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (pin) headers["x-chat-pin"] = pin;
      
      try {
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(data),
          credentials: "include",
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to send message");
        }

        if (!response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const jsonStr = line.replace("data: ", "");
              try {
                const event = JSON.parse(jsonStr);
                
                if (event.content) {
                  setStreamedContent(prev => prev + event.content);
                }
                
                if (event.error) {
                  throw new Error(event.error);
                }
              } catch (e) {
                // ignore parse errors on individual chunks
              }
            }
          }
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          throw error;
        }
      } finally {
        setIsStreaming(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.conversations.get.path, conversationId] });
      queryClient.invalidateQueries({ queryKey: [api.conversations.list.path] });
      setStreamedContent("");
    },
    onError: (error) => {
      toast({
        title: "فشل الإرسال",
        description: (error as Error).message || "حدث خطأ أثناء إرسال الرسالة",
        variant: "destructive",
      });
    },
  });

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  }, []);

  return {
    sendMessage,
    isStreaming,
    streamedContent,
    stopGeneration
  };
}
