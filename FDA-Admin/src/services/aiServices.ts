// src/services/aiService.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

class AIService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private conversationHistory: Array<{ role: string; parts: string }> = [];

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not found in environment variables');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    // Initialize with system prompt
    this.conversationHistory.push({
      role: 'user',
      parts: `You are an AI assistant for a food redistribution platform admin dashboard. Your name is "FoodAI". Your role is to help administrators analyze data, generate insights, and answer questions about:

PLATFORM CONTEXT:
- Food donations management
- NGO (Non-Governmental Organization) partnerships
- Volunteer coordination
- Food waste reduction analytics
- User engagement metrics
- Donation trends and patterns

CAPABILITIES:
- Provide data-driven insights and analysis
- Suggest optimization strategies
- Help with report generation
- Answer questions about platform metrics
- Offer recommendations for improving efficiency

RESPONSE STYLE:
- Be professional but friendly
- Use clear, structured responses with appropriate formatting
- Be concise but thorough
- If you don't have specific data, suggest what to look for
- Use bullet points and sections for complex information
- Always maintain a helpful, solution-oriented approach

LIMITATIONS:
- You don't have real-time data access (remind users if needed)
- Focus on general strategies and common patterns
- Suggest checking specific metrics in the dashboard when precise data is needed

Now, please introduce yourself and offer help with platform analytics.`
    });
  }

  async generateResponse(userMessage: string): Promise<{ response: string; suggestions?: string[] }> {
    try {
      // Add user message to history
      this.conversationHistory.push({
        role: 'user',
        parts: userMessage
      });

      // Build conversation context
      const conversationContext = this.conversationHistory
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.parts}`)
        .join('\n\n');

      const prompt = `Continue this conversation as the Food Redistribution Platform AI Assistant:\n\n${conversationContext}\n\nAssistant:`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();

      // Add AI response to history
      this.conversationHistory.push({
        role: 'model',
        parts: responseText
      });

      // Keep conversation history manageable (last 10 exchanges)
      if (this.conversationHistory.length > 20) {
        this.conversationHistory = this.conversationHistory.slice(-20);
      }

      // Generate context-aware suggestions
      const suggestions = this.generateSuggestions(userMessage, responseText);

      return {
        response: responseText,
        suggestions
      };

    } catch (error: unknown) {
        console.error('AI Service Error:', error);
        
        // Fallback responses based on error type
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (errorMessage.includes('API_KEY')) {
            return {
            response: "⚠️ **API Configuration Required**\n\nPlease ensure the Gemini API key is properly configured in the environment variables.\n\nFor now, I can help you with general food redistribution platform best practices and common analytics patterns.",
            suggestions: ['Check API configuration', 'Contact support', 'Try again later']
            };
        }
        
        if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
            return {
            response: "📊 **Temporary Service Limit**\n\nI'm experiencing high demand at the moment. While I work on your detailed analysis, here are some quick insights:\n\n• Check the dashboard for real-time metrics\n• Review recent donation trends in the analytics section\n• Monitor NGO performance in the partners tab\n\nPlease try again in a few moments for AI-powered insights.",
            suggestions: ['Check dashboard metrics', 'Review recent reports', 'Try again in 5 minutes']
            };
        }

        return {
            response: "🤖 **Temporary Assistant Unavailable**\n\nI'm having trouble processing your request right now. Here are some actions you can take:\n\n• Check the **Dashboard Stats** for real-time platform metrics\n• Review **Recent Reports** for donation analytics\n• Visit the **NGO Management** section for partner performance\n\nPlease try again shortly or contact support if the issue persists.",
            suggestions: ['Check dashboard', 'Review reports', 'Contact support']
        };
    }
  }

  private generateSuggestions(userMessage: string, aiResponse: string): string[] {
    const lowerMessage = userMessage.toLowerCase();
    const lowerResponse = aiResponse.toLowerCase();

    // Default suggestions
    const defaultSuggestions = [
      "Show donation analytics",
      "NGO performance metrics",
      "User engagement trends",
      "Generate weekly report"
    ];

    // Context-aware suggestions
    if (lowerMessage.includes('donation') || lowerResponse.includes('donation')) {
      return [
        "Donation trends this month",
        "Top donation categories",
        "Donation efficiency metrics",
        "Compare donation patterns"
      ];
    }

    if (lowerMessage.includes('ngo') || lowerResponse.includes('ngo') || lowerResponse.includes('partner')) {
      return [
        "Active NGO count",
        "NGO performance ranking",
        "New NGO registrations",
        "NGO engagement rates"
      ];
    }

    if (lowerMessage.includes('report') || lowerResponse.includes('report')) {
      return [
        "Generate monthly report",
        "Export analytics data",
        "Performance summary",
        "Trend analysis report"
      ];
    }

    if (lowerMessage.includes('user') || lowerResponse.includes('user')) {
      return [
        "User growth metrics",
        "User activity trends",
        "User retention rates",
        "New user registrations"
      ];
    }

    return defaultSuggestions;
  }

  // Clear conversation history
  clearHistory(): void {
    this.conversationHistory = this.conversationHistory.slice(0, 1); // Keep only system prompt
  }
}

// Create and export singleton instance
export const aiService = new AIService();