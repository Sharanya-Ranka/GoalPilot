import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, AlertCircle } from 'lucide-react';
import type { ChatMessage } from '../types';

interface ChatWindowProps {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  onSendMessage: (message: string) => void; // The communication channel to the parent
}

// --- Helper: Message Bubble (Unchanged) ---
const MessageBubble = ({ message }: { message: ChatMessage }) => {
  const isUser = message.role === 'user';
  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[80%] md:max-w-[70%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'
        }`}>
          {isUser ? <User size={16} /> : <Bot size={16} />}
        </div>
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
  messages, 
  isLoading, 
  error, 
  onSendMessage 
}) => {
  // We keep inputValue local because the Parent doesn't need to know 
  // every single character the user types, only the final submitted message.
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll whenever the "messages" prop changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = () => {
    if (!inputValue.trim() || isLoading) return;
    
    // Pass the data up to the parent
    onSendMessage(inputValue);
    
    // Clear local input
    setInputValue(""); 
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-gray-50 border-l border-gray-200 shadow-xl overflow-hidden">
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between shrink-0">
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
        {messages.length === 0 && (
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
      <div className="bg-white border-t border-gray-200 p-4 shrink-0">
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
            onClick={handleSubmit}
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