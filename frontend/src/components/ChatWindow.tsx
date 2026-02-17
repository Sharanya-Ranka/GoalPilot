import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, AlertCircle } from 'lucide-react';
import type { ChatMessage } from '../types';


interface ChatWindowProps {
  threadId: string;
  serverUrl?: string; // Optional: defaults to localhost if not provided
  initialMessages?: ChatMessage[];
}

// --- Helper: Message Bubble Component ---

const MessageBubble = ({ message }: { message: ChatMessage }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[80%] md:max-w-[70%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
        
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {isUser ? <User size={16} /> : <Bot size={16} />}
        </div>

        {/* Bubble */}
        <div className={`p-3 rounded-2xl shadow-sm text-sm ${
          isUser 
            ? 'bg-indigo-600 text-white rounded-br-none' 
            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
        }`}>
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          <span className={`text-[10px] mt-1 block opacity-70 ${isUser ? 'text-indigo-200' : 'text-gray-400'}`}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};

// --- Main Component ---

export const ChatWindow: React.FC<ChatWindowProps> = ({ 
  threadId, 
  serverUrl = "http://localhost:8000",
  initialMessages = []
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Auto-scroll ref
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const currentInput = inputValue;
    setInputValue(""); // Clear input immediately
    setError(null);

    // 1. Optimistic Update: Add user message to UI
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: currentInput,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // 2. Network Request
      const response = await fetch(`${serverUrl}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentInput,
          thread_id: threadId
        })
      });

      if (!response.ok) throw new Error("Failed to send message");

      const data = await response.json();

      // 3. Add Agent Response (Assuming API returns { response: "text" })
      const agentMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: data.response || "I received your message but have no content to display.", 
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, agentMsg]);

    } catch (err) {
      console.error("Chat Error:", err);
      setError("Failed to reach the agent. Please try again.");
      // Optional: Restore input if failed? 
      // setInputValue(currentInput); 
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full w-full mx-auto bg-gray-50 border border-gray-200 rounded-xl shadow-lg overflow-hidden">
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
            <Bot size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Goal Assistant</h3>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Online
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 10 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
            <Bot size={48} className="mb-2 opacity-20" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex w-full justify-start mb-4">
            <div className="flex items-end gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                <Bot size={16} />
              </div>
              <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-bl-none shadow-sm">
                <div className="flex space-x-1 h-5 items-center">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex justify-center my-2">
            <div className="bg-red-50 text-red-600 text-xs px-3 py-1 rounded-full flex items-center gap-1 border border-red-100">
              <AlertCircle size={12} />
              {error}
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 bg-gray-100 text-gray-800 border-0 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none"
            placeholder="Type your message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            className={`px-4 rounded-lg flex items-center justify-center transition-all ${
              isLoading || !inputValue.trim()
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg'
            }`}
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </div>
        <div className="text-center mt-2">
           <span className="text-[10px] text-gray-400">Press Enter to send</span>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;