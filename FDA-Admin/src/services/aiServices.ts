// src/services/aiService.ts
import { httpsCallable } from 'firebase/functions';
import { functions } from '../Firebase/Firebase';

interface HistoryMessage { 
  role: 'user' | 'model'; 
  parts: string; 
}

class AIService {
  private conversationHistory: HistoryMessage[];
  private MAX_HISTORY_LENGTH = 15;

  constructor() {
    this.conversationHistory = [{
      role: 'user',
      parts: `You're FoodAI, the admin assistant for a food redistribution platform. Be conversational and helpful - like a smart colleague. You can analyze all platform data, identify issues, generate reports, and provide insights. Speak naturally but professionally. Start by introducing yourself casually.`
    }];
  }

  async generateResponse(userMessage: string, history: HistoryMessage[]): Promise<{ 
    response: string; 
    suggestions?: string[];
    data?: any;
    report?: any;
  }> {
    try {
      // Use the history passed from the function call context
      this.conversationHistory = history; 

      const payload = {
        userMessage,
        history: this.conversationHistory // Pass current history state
      };
      
      const chatFunction = httpsCallable(functions, 'adminAiChat');
      const result = await chatFunction(payload);
      const responseData = result.data as any;
      
      // Update history and return responseData
      return responseData;
    } catch (error: any) {
      console.error('AI Service Error:', error);
      return this.handleError(error);
    }
  }

  addMessageToHistory(userContent: string, botContent: string): void {
    // We add user and model parts after the API call succeeds.
    // The history sent to the function contains the user's latest question.
    this.conversationHistory.push(
      { role: 'user', parts: userContent },
      { role: 'model', parts: botContent }
    );
    
    // Trim history to maintain context window size
    if (this.conversationHistory.length > this.MAX_HISTORY_LENGTH) {
      this.conversationHistory = [
        this.conversationHistory[0], // Keep system instruction
        ...this.conversationHistory.slice(-this.MAX_HISTORY_LENGTH + 1) // Keep recent messages
      ];
    }
  }

  getHistory(): HistoryMessage[] {
    return this.conversationHistory;
  }

  private handleError(error: any): { response: string; suggestions: string[] } {
    const errorMessage = error.message || String(error);
    
    if (errorMessage.includes('unauthenticated')) {
      return {
        response: "🔒 Authentication Required\n\nPlease sign in to use the AI assistant features.",
        suggestions: ['Sign in', 'Check authentication', 'Contact support']
      };
    }

    if (errorMessage.includes('quota') || errorMessage.includes('API')) {
      return {
        response: "Hey, I'm having some connection issues with my analysis tools right now. You can still check the dashboard for real-time stats. Want me to guide you through the manual reports?",
        suggestions: ['Check dashboard', 'View manual reports', 'Contact support']
      };
    }

    return {
      response: "Hmm, I'm having a bit of trouble processing that right now. Could you try rephrasing or check the direct dashboard for the info you need?",
      suggestions: ['Try again', 'Check dashboard', 'Contact support']
    };
  }

  clearHistory(): void {
    this.conversationHistory = this.conversationHistory.slice(0, 1);
  }
}

export const aiService = new AIService();