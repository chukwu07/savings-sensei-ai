import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Bot, Sparkles, ShoppingCart, DollarSign, Plane, Scissors, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePremiumFeatures } from "@/hooks/usePremiumFeatures";


interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const predefinedQuestions = [
  {
    text: "What's my biggest spending category?",
    icon: ShoppingCart
  },
  {
    text: "Should I increase my savings contributions?",
    icon: DollarSign
  },
  {
    text: "When will I reach my vacation fund goal?",
    icon: Plane
  },
  {
    text: "Give me tips to reduce expenses",
    icon: Scissors
  }
];


export function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { subscribed } = usePremiumFeatures();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Helper to format messages for API
  const getFormattedMessages = () => {
    return messages.map((msg) => ({
      role: msg.sender === "user" ? "user" : "assistant",
      content: msg.content
    }));
  };

  // Call AI Chat API with user's financial context
  const generateAIResponse = async (userQuery: string): Promise<string> => {
    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
      
      const res = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            ...getFormattedMessages(),
            { role: "user", content: userQuery }
          ]
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        if (res.status === 429) {
          return "⚠️ Too many requests. Please wait a moment and try again.";
        }
        if (res.status === 402) {
          return "⚠️ AI service requires payment. Please contact support.";
        }
        return `❌ Error: ${errorData.error || res.statusText}`;
      }
      
      const data = await res.json();
      return data.content || "❌ No response from AI.";
    } catch (err: any) {
      console.error("AI chat error:", err);
      return `❌ Error: ${err.message || "Failed to connect to AI service."}`;
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: "user",
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    try {
      const response = await generateAIResponse(inputValue);
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        sender: "ai",
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, aiResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    setInputValue(question);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full pb-4 space-y-4">
      {/* Header with Logo, Title, Subtitle, and Premium Badge */}
      <Card className="mx-4">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">AI Assistant</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Your smart money guide</p>
              </div>
            </div>
            {subscribed && (
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 flex items-center gap-1">
                <Crown className="h-3 w-3" />
                Premium
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Quick Questions Section - Now at Top */}
      <Card className="mx-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Quick Questions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {predefinedQuestions.map((question, index) => {
            const IconComponent = question.icon;
            return (
              <Button
                key={index}
                variant="outline"
                className="w-full justify-start h-auto py-3 px-4 text-left"
                onClick={() => handleQuickQuestion(question.text)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                    <IconComponent className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium whitespace-normal">{question.text}</span>
                </div>
              </Button>
            );
          })}
        </CardContent>
      </Card>

      {/* Scrollable Chat Area - 60-70% of screen height */}
      <Card className="mx-4 flex-1 flex flex-col min-h-0" style={{ maxHeight: '65vh' }}>
        <CardHeader className="pb-3 flex-shrink-0">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Conversation
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 px-0">
          <ScrollArea className="h-full px-4">
            <div className="space-y-4">
              {/* AI Greeting - Only show if no messages */}
              {messages.length === 0 && (
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Bot className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm leading-relaxed">
                        Hi, I'm your BudgetBuddy AI. I can help you understand spending, boost savings, and reach your goals.
                      </p>
                      <p className="text-sm font-medium">
                        What would you like to know?
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Messages */}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-lg ${
                      message.sender === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {message.sender === "ai" && (
                        <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="space-y-1">
                        <p className="text-sm leading-relaxed whitespace-pre-line">
                          {message.content}
                        </p>
                        <p className={`text-xs ${message.sender === "user" ? "opacity-70" : "text-muted-foreground"}`}>
                          {message.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-gentle-pulse"></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-gentle-pulse" style={{ animationDelay: "0.2s" }}></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-gentle-pulse" style={{ animationDelay: "0.4s" }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Chat Entry Field - Bottom */}
      <Card className="mx-4">
        <CardContent className="p-3">
          <div className="flex gap-2">
            <Input
              placeholder="Ask me anything about your money…"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}