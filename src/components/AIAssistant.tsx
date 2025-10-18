import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Bot, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm your fashion AI assistant. I can help you:\n\n• Create outfit combinations based on your requirements\n• Give you image consulting advice\n• Search for specific products\n• Compare different products\n\nWhat would you like to do today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const { data: garments } = await supabase
        .from("garments")
        .select("id, type, brand, color, material");

      const context = `User has ${garments?.length || 0} items in their closet. Available items: ${
        garments?.map((g) => `${g.type} by ${g.brand} (${g.color})`).join(", ") || "none"
      }`;

      const response = await fetch("https://api-inference.huggingface.co/models/meta-llama/Llama-3.1-70B-Instruct", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_HUGGING_FACE_ACCESS_TOKEN || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: `You are a professional fashion stylist and shopping assistant. Help users with outfit suggestions, fashion advice, product searches, and comparisons.\n\nContext: ${context}\n\nUser: ${userMessage}\n\nAssistant:`,
          parameters: {
            max_new_tokens: 500,
            temperature: 0.8,
            return_full_text: false,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("AI service unavailable");
      }

      const data = await response.json();
      const reply = Array.isArray(data) ? data[0]?.generated_text : data?.generated_text;

      if (reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: reply.trim() }]);
      } else {
        throw new Error("No response from AI");
      }
    } catch (error: any) {
      console.error("AI assistant error:", error);
      toast.error("AI assistant is temporarily unavailable");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I'm sorry, I'm having trouble responding right now. Please try again later.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-soft border-border/50 overflow-hidden rounded-none">
      <CardContent className="flex flex-col p-0">
        <ScrollArea ref={scrollRef} className="h-[400px] sm:h-[500px] p-4 sm:p-6">
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 bg-primary flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={1.5} />
                  </div>
                )}
                <div
                  className={`max-w-[75%] px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-foreground border border-border/30"
                  }`}
                >
                  <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed font-light">{msg.content}</p>
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 bg-muted border border-border/50 flex items-center justify-center flex-shrink-0">
                    <UserIcon className="w-3.5 h-3.5 text-foreground" strokeWidth={1.5} />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-7 h-7 bg-primary flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={1.5} />
                </div>
                <div className="bg-muted/50 border border-border/30 px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.5} />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="border-t border-border/30 p-3 sm:p-4 bg-background">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question..."
              disabled={isLoading}
              className="flex-1 h-10 sm:h-11 rounded-none border-border/50 bg-background text-sm font-light tracking-wide focus-visible:ring-1 focus-visible:ring-primary/30"
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={!input.trim() || isLoading}
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-none bg-primary hover:bg-primary-hover"
            >
              <Send className="w-4 h-4" strokeWidth={1.5} />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
