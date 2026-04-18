import { useState, useRef, useEffect } from 'react';
import useTestStore from '../store/useTestStore';
import { handleSendChatMessage } from '../chatService';

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
}

interface ChatComponentProps {
  apiUrl?: string; // URL to send messages to
}

export default function ChatComponent({ apiUrl = 'https://api.example.com/chat' }: ChatComponentProps) {
//   const [isOpen, setIsOpen] = useState(false);
  const isOpen = useTestStore((state) => state.chatIsActive);
  const setIsOpen = useTestStore((state) => state.setChatActiveState);
  const chatContext = useTestStore((state) => state.chatContext);
  const setEditableGoal = useTestStore((state) => state.setEditableGoal); 
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  console.log(apiUrl)
  // Resizing State
  const [size, setSize] = useState({ width: 350, height: 450 });
  const isResizing = useRef(false);
  
  // Setting inital agent message based on chat context (create vs update)
  const contextLower = chatContext.toLowerCase();
  let newContent = '';

  if (contextLower === 'create new goal') {
    newContent = "Please describe the goal you want to create";
  } else if (contextLower === 'update goal') {
    newContent = "Please describe the updates you want to make to the goal";
  }
  
  const initialMessage = { id: crypto.randomUUID(), role: 'agent', content: newContent }

  // Handle Drag Resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      // Calculate new size based on mouse position (growing from top-left)
      setSize(prev => ({
        width: Math.max(300, prev.width - e.movementX),
        height: Math.max(300, prev.height - e.movementY)
      }));
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = 'default';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // // Listen for changes in chatContext to trigger contextual agent messages
  // useEffect(() => {
  //   if (!chatContext) return;

  //   const contextLower = chatContext.toLowerCase();
  //   let newContent = '';

  //   if (contextLower === 'create new goal') {
  //     newContent = "Please describe the goal you want to create";
  //   } else if (contextLower === 'update goal') {
  //     newContent = "Please describe the updates you want to make to the goal";
  //   }

  //   // if (newContent) {
  //   //   setMessages(prev => [
  //   //     ...prev, 
  //   //     { id: crypto.randomUUID(), role: 'agent', content: newContent }
  //   //   ]);
  //   // }

  //   if (newContent) {
  //     setMessages([
  //       { id: crypto.randomUUID(), role: 'agent', content: newContent }
  //     ]);
  //   }
  // }, [chatContext]);

  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    const newUserMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: inputValue };
    setMessages(prev => [...prev, newUserMsg]);
    setInputValue('');
    setIsLoading(true);


    // Call your extracted network script (which handles its own try/catch)
    // We expect it to return: { reply: string, editableGoal: GoalData | null }
    const responseData = await handleSendChatMessage(newUserMsg.content, chatContext); 
    
    // 1. Update the chat window with the agent's message
    setMessages(prev => [...prev, { 
      id: crypto.randomUUID(), 
      role: 'agent', 
      content: responseData.reply 
    }]);

    // 2. If the AI returned a goal object, update the global state
    if (responseData.editableGoal) {
      setEditableGoal(responseData.editableGoal);
    }

    setIsLoading(false);
  };

  // If closed, just show the chat bubble button
  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-indigo-700 transition-colors z-[100]"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>
    );
  }

  // If open, show the chat window
  return (
    <div 
      style={{ width: size.width, height: size.height }}
      className="fixed bottom-6 right-6 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden z-[100] transition-shadow"
    >
      {/* Resizing Handle (Top Left Corner) */}
      <div 
        className="absolute top-0 left-0 w-6 h-6 cursor-nwse-resize z-10"
        onMouseDown={(e) => {
          e.preventDefault();
          isResizing.current = true;
          document.body.style.cursor = 'nwse-resize';
        }}
      >
        {/* Visual indicator for drag corner */}
        <div className="absolute top-1.5 left-1.5 w-2 h-2 border-t-2 border-l-2 border-gray-400" />
      </div>

      {/* Header */}
      <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center select-none pl-8">
        <h3 className="font-semibold text-sm">Assistant - {chatContext}</h3>
        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-3">
        {[initialMessage, ...messages].map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
              msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm rounded-bl-none text-gray-400 italic">
              Typing...
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-gray-200">
        <form 
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
          className="flex gap-2"
        >
          <input 
            type="text" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..." 
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <button 
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}