// src/components/ChatbotTab.tsx
import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { 
  Bot, 
  Send, 
  User, 
  BarChart3, 
  TrendingUp, 
  Users, 
  Package,
  RefreshCw
} from "lucide-react";
import { aiService } from "../../services/aiServices";

interface Message {
  id: string;
  type: "user" | "bot";
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

export function ChatbotTab() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "bot",
      content: "🤖 **Hello! I'm FoodAI - Your Food Redistribution Platform Assistant**\n\nI'm here to help you analyze platform data, generate insights, and optimize your food redistribution operations. I can assist with:\n\n• **Donation Analytics** - Trends, patterns, and optimization\n• **NGO Performance** - Partner efficiency and engagement  \n• **User Metrics** - Growth, activity, and retention\n• **Report Generation** - Custom insights and recommendations\n• **Platform Optimization** - Efficiency improvements\n\nWhat would you like to explore today?",
      timestamp: new Date(),
      suggestions: [
        "Show donation analytics",
        "NGO performance overview",
        "User engagement trends",
        "Generate weekly insights"
      ]
    }
  ]);
  
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const aiResponse = await aiService.generateResponse(inputValue);
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content: aiResponse.response,
        timestamp: new Date(),
        suggestions: aiResponse.suggestions
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content: "❌ **I encountered an error processing your request**\n\nPlease try again in a moment, or check the dashboard for real-time metrics and reports.",
        timestamp: new Date(),
        suggestions: ["Try again", "Check dashboard", "Contact support"]
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearConversation = () => {
    aiService.clearHistory();
    setMessages([
      {
        id: "1",
        type: "bot",
        content: "🔄 **Conversation Reset**\n\nI've cleared our conversation history. How can I help you with your food redistribution platform analytics today?",
        timestamp: new Date(),
        suggestions: [
          "Show donation analytics",
          "NGO performance overview", 
          "User engagement trends",
          "Platform optimization tips"
        ]
      }
    ]);
  };

  return (
    <div className="h-full flex flex-col">
      <Card className="flex-1 shadow-sm border-0 bg-white flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <CardTitle>FoodAI Assistant</CardTitle>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearConversation}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              New Chat
            </Button>
          </div>
          <CardDescription>
            AI-powered analytics and insights for your food redistribution platform
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col p-0">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.type === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex gap-3 max-w-[80%] ${message.type === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className={message.type === "user" ? "bg-primary text-white" : "bg-orange-100 text-orange-700"}>
                      {message.type === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className={`flex flex-col gap-2 ${message.type === "user" ? "items-end" : "items-start"}`}>
                    <div
                      className={`px-4 py-3 rounded-lg ${
                        message.type === "user"
                          ? "bg-primary text-white"
                          : "bg-muted"
                      }`}
                    >
                      <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                    </div>
                    
                    {message.suggestions && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {message.suggestions.map((suggestion, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => handleSuggestionClick(suggestion)}
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    )}
                    
                    <span className="text-xs text-muted-foreground">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-orange-100 text-orange-700">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted px-4 py-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                    </div>
                    <span className="text-sm text-muted-foreground">FoodAI is analyzing...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about donations, NGOs, analytics, reports..."
                className="flex-1 bg-input-background"
                disabled={isLoading}
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={!inputValue.trim() || isLoading}
                className="px-3"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80" onClick={() => handleSuggestionClick("Show donation analytics and trends")}>
                <BarChart3 className="h-3 w-3 mr-1" />
                Donation Analytics
              </Badge>
              <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80" onClick={() => handleSuggestionClick("Analyze NGO performance and engagement")}>
                <Users className="h-3 w-3 mr-1" />
                NGO Performance
              </Badge>
              <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80" onClick={() => handleSuggestionClick("Show user growth and engagement metrics")}>
                <TrendingUp className="h-3 w-3 mr-1" />
                User Metrics
              </Badge>
              <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80" onClick={() => handleSuggestionClick("Generate platform optimization recommendations")}>
                <Package className="h-3 w-3 mr-1" />
                Optimization Tips
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}