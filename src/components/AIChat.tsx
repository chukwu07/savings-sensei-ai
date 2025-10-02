import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, Sparkles, ShoppingCart, DollarSign, Plane, Scissors } from "lucide-react";
import { Badge } from "@/components/ui/badge";


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


// Groq API constants
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = "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";

export function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Helper to format messages for Groq API
  const getGroqMessages = () => {
    // Map local messages to OpenAI format
    return messages.map((msg) => ({
      role: msg.sender === "user" ? "user" : "assistant",
      content: msg.content
    }));
  };

  // Call Groq API
  const generateAIResponse = async (userQuery: string): Promise<string> => {
    try {
      const payload = {
        model: "llama-3.1-8b-instant", // Updated to supported Groq model
        messages: [
          ...getGroqMessages(),
          { role: "user", content: userQuery }
        ],
        stream: false
      };

      const res = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        return `❌ Groq API error: ${errorData.error?.message || res.statusText}`;
      }
      const data = await res.json();
      const aiMsg = data.choices?.[0]?.message?.content;
      return aiMsg || "❌ No response from Groq API.";
    } catch (err: any) {
      return `❌ Error: ${err.message || "Failed to connect to Groq API."}`;
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
    <div className="h-[100vh] flex flex-col bg-gray-50 px-4 pb-4">
      {/* Header (Top Section) */}
      <div className="pt-6 pb-6">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-blue-500" />
          <h1 className="text-xl font-bold text-gray-900">AI Assistant</h1>
        </div>
        <p className="text-sm text-gray-600">Your smart money guide powered by AI</p>
      </div>

      {/* AI Chat Greeting (Card/Bubble Style) */}
      <div className="mb-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              💬
            </div>
            <div>
              <p className="text-base text-gray-900 leading-relaxed">
                Hi, I'm your BudgetBuddy AI. I can help you understand spending, boost savings, and reach your goals.
              </p>
              <p className="text-base text-gray-900 leading-relaxed mt-1 font-medium">
                What would you like to know?
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area - Scrollable */}
      <div className="flex-1 mb-6 min-h-0">
        <ScrollArea className="h-full">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl ${
                    message.sender === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-white shadow-sm"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {message.sender === "ai" && (
                      <Bot className="h-4 w-4 mt-0.5 text-blue-500" />
                    )}
                    <div className="space-y-1">
                      <p className="text-sm leading-relaxed whitespace-pre-line">
                        {message.content}
                      </p>
                      <p className={`text-xs ${message.sender === "user" ? "text-blue-100" : "text-gray-500"}`}>
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
                <div className="bg-white p-3 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-blue-500" />
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-gentle-pulse"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-gentle-pulse" style={{ animationDelay: "0.2s" }}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-gentle-pulse" style={{ animationDelay: "0.4s" }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Quick Questions Section */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-base font-medium text-gray-900">⚡ Quick Questions</span>
        </div>
        <ScrollArea className="w-full">
          <div className="flex gap-3 pb-2">
            {predefinedQuestions.map((question, index) => {
              const IconComponent = question.icon;
              return (
                <div
                  key={index}
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors min-w-[280px] flex-shrink-0"
                  onClick={() => handleQuickQuestion(question.text)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <IconComponent className="h-4 w-4 text-blue-500" />
                    </div>
                    <p className="text-sm font-medium text-gray-900 leading-tight">
                      {question.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Input Section (Anchored at Bottom) */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Input
              placeholder="Ask me anything about your money…"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pr-12 h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500 text-sm"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
              className="absolute right-2 top-2 h-8 w-8 rounded-full bg-blue-500 hover:bg-blue-600 p-0"
            >
              <Send className="h-4 w-4 text-white" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}