// JL Solutions - Live Chat / AI Assistant Widget
// Floating chat widget for all pages

(function() {
  'use strict';

  // Chat widget configuration
  const chatConfig = {
    position: 'bottom-right',
    primaryColor: '#0078d4',
    welcomeMessage: 'Hi! I\'m here to help. How can I assist you today?',
    businessHours: {
      enabled: true,
      timezone: 'America/New_York',
      hours: {
        monday: { start: '09:00', end: '17:00' },
        tuesday: { start: '09:00', end: '17:00' },
        wednesday: { start: '09:00', end: '17:00' },
        thursday: { start: '09:00', end: '17:00' },
        friday: { start: '09:00', end: '17:00' },
        saturday: { start: '10:00', end: '14:00' },
        sunday: { start: null, end: null }
      }
    }
  };

  // Chat state
  let chatOpen = false;
  let chatHistory = [];

  /**
   * Initialize chat widget
   */
  function initChatWidget() {
    // Create chat container
    createChatContainer();
    
    // Load chat history
    loadChatHistory();
    
    // Add event listeners
    document.addEventListener('click', handleDocumentClick);
  }

  /**
   * Create chat container HTML
   */
  function createChatContainer() {
    const chatHTML = `
      <div id="jl-chat-widget" class="jl-chat-widget" role="dialog" aria-label="Live Chat" aria-live="polite">
        <!-- Chat Toggle Button -->
        <button id="jl-chat-toggle" 
                class="jl-chat-toggle" 
                aria-label="Open chat"
                aria-expanded="false"
                onclick="toggleChat()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span class="jl-chat-badge" id="jl-chat-badge" style="display: none;">1</span>
        </button>
        
        <!-- Chat Window -->
        <div id="jl-chat-window" class="jl-chat-window" style="display: none;">
          <!-- Chat Header -->
          <div class="jl-chat-header">
            <div class="jl-chat-header-info">
              <strong>JL Solutions Support</strong>
              <span class="jl-chat-status" id="jl-chat-status">Online</span>
            </div>
            <button class="jl-chat-close" onclick="toggleChat()" aria-label="Close chat">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>
          
          <!-- Chat Messages -->
          <div class="jl-chat-messages" id="jl-chat-messages" role="log" aria-live="polite">
            <div class="jl-chat-message jl-chat-bot">
              <div class="jl-chat-avatar">🤖</div>
              <div class="jl-chat-bubble">
                ${chatConfig.welcomeMessage}
              </div>
            </div>
          </div>
          
          <!-- Quick Actions -->
          <div class="jl-chat-quick-actions" id="jl-chat-quick-actions">
            <button class="jl-chat-quick-btn" onclick="sendQuickMessage('Schedule Consultation')">Schedule Consultation</button>
            <button class="jl-chat-quick-btn" onclick="sendQuickMessage('Get Pricing Info')">Pricing Info</button>
            <button class="jl-chat-quick-btn" onclick="sendQuickMessage('Technical Support')">Technical Support</button>
          </div>
          
          <!-- Chat Input -->
          <div class="jl-chat-input-container">
            <input type="text" 
                   id="jl-chat-input" 
                   class="jl-chat-input" 
                   placeholder="Type your message..."
                   aria-label="Type your message"
                   onkeypress="handleChatKeyPress(event)">
            <button class="jl-chat-send" onclick="sendChatMessage()" aria-label="Send message">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"/>
              </svg>
            </button>
          </div>
          
          <!-- Business Hours Notice -->
          <div class="jl-chat-hours" id="jl-chat-hours" style="display: none;">
            <small>Our business hours are Mon-Fri 9am-5pm EST. We'll respond during business hours.</small>
          </div>
        </div>
      </div>
    `;

    // Inject CSS
    injectChatCSS();

    // Add HTML to body
    document.body.insertAdjacentHTML('beforeend', chatHTML);

    // Update business hours status
    updateBusinessHoursStatus();
  }

  /**
   * Inject chat widget CSS
   */
  function injectChatCSS() {
    const css = `
      <style>
        .jl-chat-widget {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        }
        
        .jl-chat-toggle {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: ${chatConfig.primaryColor};
          border: none;
          color: white;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          transition: transform 0.2s;
        }
        
        .jl-chat-toggle:hover {
          transform: scale(1.1);
        }
        
        .jl-chat-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          background: #ff4444;
          color: white;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
        }
        
        .jl-chat-window {
          position: absolute;
          bottom: 80px;
          right: 0;
          width: 380px;
          max-width: calc(100vw - 40px);
          height: 600px;
          max-height: calc(100vh - 120px);
          background: white;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .jl-chat-header {
          background: ${chatConfig.primaryColor};
          color: white;
          padding: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .jl-chat-status {
          display: block;
          font-size: 0.75rem;
          opacity: 0.9;
        }
        
        .jl-chat-close {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 0.25rem;
        }
        
        .jl-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
          background: #f5f5f5;
        }
        
        .jl-chat-message {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        
        .jl-chat-message.jl-chat-user {
          flex-direction: row-reverse;
        }
        
        .jl-chat-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        
        .jl-chat-bubble {
          background: white;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          max-width: 75%;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .jl-chat-user .jl-chat-bubble {
          background: ${chatConfig.primaryColor};
          color: white;
        }
        
        .jl-chat-quick-actions {
          padding: 0.75rem;
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          border-top: 1px solid #e0e0e0;
        }
        
        .jl-chat-quick-btn {
          padding: 0.5rem 1rem;
          border: 1px solid #e0e0e0;
          border-radius: 20px;
          background: white;
          cursor: pointer;
          font-size: 0.85rem;
          transition: all 0.2s;
        }
        
        .jl-chat-quick-btn:hover {
          background: #f5f5f5;
          border-color: ${chatConfig.primaryColor};
        }
        
        .jl-chat-input-container {
          display: flex;
          padding: 1rem;
          border-top: 1px solid #e0e0e0;
          gap: 0.5rem;
        }
        
        .jl-chat-input {
          flex: 1;
          border: 1px solid #e0e0e0;
          border-radius: 20px;
          padding: 0.75rem 1rem;
          font-size: 0.9rem;
        }
        
        .jl-chat-send {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: ${chatConfig.primaryColor};
          border: none;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .jl-chat-hours {
          padding: 0.5rem 1rem;
          background: #fff3cd;
          border-top: 1px solid #e0e0e0;
          font-size: 0.75rem;
          color: #856404;
        }
        
        @media (max-width: 768px) {
          .jl-chat-widget {
            bottom: 10px;
            right: 10px;
          }
          
          .jl-chat-window {
            width: calc(100vw - 20px);
            height: calc(100vh - 100px);
            bottom: 80px;
            right: 0;
          }
        }
      </style>
    `;
    document.head.insertAdjacentHTML('beforeend', css);
  }

  /**
   * Toggle chat window
   */
  window.toggleChat = function() {
    chatOpen = !chatOpen;
    const window = document.getElementById('jl-chat-window');
    const toggle = document.getElementById('jl-chat-toggle');
    
    if (chatOpen) {
      window.style.display = 'flex';
      toggle.setAttribute('aria-expanded', 'true');
      document.getElementById('jl-chat-input').focus();
    } else {
      window.style.display = 'none';
      toggle.setAttribute('aria-expanded', 'false');
    }
  };

  /**
   * Send chat message
   */
  window.sendChatMessage = function() {
    const input = document.getElementById('jl-chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message
    addChatMessage(message, 'user');
    input.value = '';
    
    // Save to history
    chatHistory.push({ role: 'user', message, timestamp: new Date() });
    saveChatHistory();
    
    // Simulate bot response (in real implementation, call API)
    setTimeout(() => {
      const response = generateBotResponse(message);
      addChatMessage(response, 'bot');
      chatHistory.push({ role: 'bot', message: response, timestamp: new Date() });
      saveChatHistory();
    }, 1000);
  };

  /**
   * Send quick message
   */
  window.sendQuickMessage = function(message) {
    document.getElementById('jl-chat-input').value = message;
    sendChatMessage();
  };

  /**
   * Handle chat key press
   */
  window.handleChatKeyPress = function(event) {
    if (event.key === 'Enter') {
      sendChatMessage();
    }
  };

  /**
   * Add chat message to UI
   */
  function addChatMessage(message, role) {
    const messagesContainer = document.getElementById('jl-chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `jl-chat-message jl-chat-${role}`;
    
    const avatar = role === 'user' ? '👤' : '🤖';
    
    messageDiv.innerHTML = `
      <div class="jl-chat-avatar">${avatar}</div>
      <div class="jl-chat-bubble">${escapeHtml(message)}</div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  /**
   * Generate bot response (simplified - in real implementation, call AI service)
   */
  function generateBotResponse(userMessage) {
    const message = userMessage.toLowerCase();
    
    if (message.includes('consultation') || message.includes('schedule')) {
      return 'I\'d be happy to help you schedule a consultation! You can book directly at https://www.jlsolutions.io/book-consultation.html or I can help answer questions first.';
    }
    
    if (message.includes('pricing') || message.includes('price') || message.includes('cost')) {
      return 'Our pricing is customized based on your specific needs. Would you like to schedule a consultation to discuss pricing, or would you like to try our ROI calculator to see potential savings?';
    }
    
    if (message.includes('support') || message.includes('help')) {
      return 'I\'m here to help! You can ask me about our services, schedule a consultation, or get technical support. What would you like to know?';
    }
    
    // Default response
    return 'Thank you for your message! For detailed questions, I recommend scheduling a consultation or checking our FAQ section. How else can I help you?';
  }

  /**
   * Update business hours status
   */
  function updateBusinessHoursStatus() {
    if (!chatConfig.businessHours.enabled) return;
    
    const now = new Date();
    const day = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
    const hours = chatConfig.businessHours.hours[day];
    
    const hoursNotice = document.getElementById('jl-chat-hours');
    if (!hours || !hours.start) {
      if (hoursNotice) hoursNotice.style.display = 'block';
      return;
    }
    
    // Simple check - in production, use proper timezone handling
    if (hoursNotice) hoursNotice.style.display = 'block';
  }

  /**
   * Handle document clicks (close chat when clicking outside)
   */
  function handleDocumentClick(event) {
    const widget = document.getElementById('jl-chat-widget');
    if (chatOpen && widget && !widget.contains(event.target)) {
      // Keep chat open - user might want to reference it while browsing
    }
  }

  /**
   * Load chat history
   */
  function loadChatHistory() {
    const stored = localStorage.getItem('jl-chat-history');
    if (stored) {
      try {
        chatHistory = JSON.parse(stored);
      } catch (e) {
        chatHistory = [];
      }
    }
  }

  /**
   * Save chat history
   */
  function saveChatHistory() {
    // Keep only last 50 messages
    if (chatHistory.length > 50) {
      chatHistory = chatHistory.slice(-50);
    }
    localStorage.setItem('jl-chat-history', JSON.stringify(chatHistory));
  }

  /**
   * Escape HTML
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatWidget);
  } else {
    initChatWidget();
  }

})();

