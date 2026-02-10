import { useQueryClient, useMutation } from "@tanstack/react-query";
import { api, buildUrl, type CreateMessageRequest, type Message } from "@shared/routes";
import { useState, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

export function useSendMessage(conversationId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useMutation({
    mutationFn: async (data: CreateMessageRequest) => {
      // 1. Send the User Message Immediately (Optimistic UI handled by component usually, or here)
      // Note: The backend route sends SSE. We need to handle this manually with fetch to read the stream.
      
      setIsStreaming(true);
      setStreamedContent("");
      abortControllerRef.current = new AbortController();

      const url = buildUrl(api.messages.create.path, { id: conversationId });
      
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
          const lines = buffer.split("\n\n"); // SSE messages usually delimited by double newline
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const jsonStr = line.replace("data: ", "");
              try {
                const event = JSON.parse(jsonStr);
                
                if (event.content) {
                  setStreamedContent(prev => prev + event.content);
                }
                
                if (event.done) {
                  // Stream finished
                }
                
                if (event.error) {
                  throw new Error(event.error);
                }
              } catch (e) {
                console.error("Failed to parse SSE JSON", e);
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
      // Invalidate query to fetch the full persisted message history including the assistant's final response
      queryClient.invalidateQueries({ queryKey: [api.conversations.get.path, conversationId] });
      setStreamedContent("");
    },
    onError: (error) => {
      toast({
        title: "فشل الإرسال",
        description: error.message || "حدث خطأ أثناء إرسال الرسالة",
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
