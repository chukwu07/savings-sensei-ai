import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Bot, Sparkles, ShoppingCart, DollarSign, Plane, Scissors, Crown, MessageCircle, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePremiumFeatures } from "@/hooks/usePremiumFeatures";
import { supabase } from "@/integrations/supabase/client";
import { chatMessageSchema } from "@/lib/validation-schemas";
import { useToast } from "@/hooks/use-toast";


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
  const { subscribed } = usePremiumFeatures();
  const { toast } = useToast();

  // Reset messages when component unmounts or user navigates away
  useEffect(() => {
    return () => {
      setMessages([]);
    };
  }, []);

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
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error("Session error:", sessionError);
        return "❌ Please sign in to use AI chat.";
      }

      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          messages: [
            ...getFormattedMessages(),
            { role: "user", content: userQuery }
          ]
        }
      });

      if (error) {
        console.error("AI chat error:", error);
        if (error.message?.includes('429')) {
          return "⚠️ Too many requests. Please wait a moment and try again.";
        }
        if (error.message?.includes('402')) {
          return "⚠️ AI service requires payment. Please contact support.";
        }
        return `❌ Error: ${error.message}`;
      }
      
      return data?.content || "❌ No response from AI.";
    } catch (err: any) {
      console.error("AI chat error:", err);
      return `❌ Error: ${err.message || "Failed to connect to AI service."}`;
    }
  };

  const handleSendMessage = async () => {
    // Validate message with Zod
    const result = chatMessageSchema.safeParse({ message: inputValue });
    
    if (!result.success) {
      toast({
        title: "Invalid Message",
        description: result.error.errors[0].message,
        variant: "destructive"
      });
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: result.data.message,
      sender: "user",
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    try {
      const response = await generateAIResponse(result.data.message);
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
    <div className="flex flex-col h-full pb-20 space-y-4">
      {/* Header with Logo, Title, Subtitle, and Premium Badge */}
      <Card className="mx-4">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Star className="h-6 w-6 text-primary" />
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

      {/* Scrollable Chat Area */}
      <Card className="mx-4 h-96 flex flex-col min-h-0">
        <CardHeader className="pb-3 flex-shrink-0">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Conversation
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-smooth p-4">
          <div className="space-y-4 py-2">
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
                <div key={message.id} className={`flex items-start gap-3 ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                  {/* AI icon on the left */}
                  {message.sender === "ai" && (
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                        <Bot className="h-5 w-5 text-primary-foreground" />
                      </div>
                    </div>
                  )}

                  {/* User icon on the right */}
                  {message.sender === "user" && (
                    <div className="flex-shrink-0 mt-1 order-last">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                        <MessageCircle className="h-5 w-5 text-primary-foreground" />
                      </div>
                    </div>
                  )}

                  {/* Message bubble */}
                  <div className="max-w-[75%]">
                    <div
                      className={`p-4 rounded-2xl ${
                        message.sender === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted text-foreground rounded-tl-md"
                      }`}
                    >
                      <div className="space-y-1">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words word-break-break-word">
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
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <Bot className="h-4 w-4 text-foreground" />
                    </div>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-gentle-pulse"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-gentle-pulse" style={{ animationDelay: "0.2s" }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-gentle-pulse" style={{ animationDelay: "0.4s" }}></div>
                    </div>
                  </div>
                </div>
              )}
          </div>
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