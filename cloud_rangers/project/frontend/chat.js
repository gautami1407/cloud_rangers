// AI Chat JavaScript
// Handles chat interface, message sending, and simulated AI responses

document.addEventListener('DOMContentLoaded', function() {
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');
    const typingIndicator = document.getElementById('typingIndicator');
    const sendBtn = document.getElementById('sendBtn');
    
    // Auto-resize textarea
    if (chatInput) {
        chatInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
            
            // Enable/disable send button
            sendBtn.disabled = this.value.trim() === '';
        });
        
        // Initial state
        sendBtn.disabled = true;
    }
    
    // Handle form submission
    if (chatForm) {
        chatForm.addEventListener('submit', function(e) {
            e.preventDefault();
            sendMessage();
        });
    }
    
    // Handle Enter key (Shift+Enter for new line)
    if (chatInput) {
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (this.value.trim() !== '') {
                    sendMessage();
                }
            }
        });
    }
});

// Send message function
function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    addMessage(message, 'user');
    
    // Clear input
    chatInput.value = '';
    chatInput.style.height = 'auto';
    document.getElementById('sendBtn').disabled = true;
    
    // Show typing indicator
    showTypingIndicator();
    
    // Simulate AI response after delay
    setTimeout(() => {
        hideTypingIndicator();
        const response = generateAIResponse(message);
        addMessage(response, 'ai');
    }, 1500 + Math.random() * 1000);
}

// Add message to chat
function addMessage(text, type) {
    const chatMessages = document.getElementById('chatMessages');
    const messageWrapper = document.createElement('div');
    messageWrapper.className = `message-wrapper ${type}-message`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = type === 'ai' ? '<i class="bi bi-robot"></i>' : '<i class="bi bi-person-fill"></i>';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    
    // Convert line breaks to <br> and format text
    const formattedText = formatMessageText(text);
    bubble.innerHTML = formattedText;
    
    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = 'Just now';
    
    content.appendChild(bubble);
    content.appendChild(time);
    
    messageWrapper.appendChild(avatar);
    messageWrapper.appendChild(content);
    
    chatMessages.appendChild(messageWrapper);
    
    // Scroll to bottom
    scrollToBottom();
}

// Format message text
function formatMessageText(text) {
    // Convert URLs to links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    text = text.replace(urlRegex, '<a href="$1" target="_blank">$1</a>');
    
    // Convert line breaks
    text = text.replace(/\n/g, '<br>');
    
    return text;
}

// Show typing indicator
function showTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.style.display = 'block';
        scrollToBottom();
    }
}

// Hide typing indicator
function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.style.display = 'none';
    }
}

// Scroll chat to bottom
function scrollToBottom() {
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) {
        setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 100);
    }
}

// Quick message function
function sendQuickMessage(message) {
    const chatInput = document.getElementById('chatInput');
    chatInput.value = message;
    chatInput.dispatchEvent(new Event('input'));
    sendMessage();
}

// Generate simulated AI response
function generateAIResponse(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    // Response templates based on keywords
    if (lowerMessage.includes('msg') || lowerMessage.includes('monosodium glutamate')) {
        return "Monosodium Glutamate (MSG) is a flavor enhancer commonly used in processed foods. It's the sodium salt of glutamic acid, an amino acid naturally found in many foods like tomatoes and cheese.\n\nKey points:\n• FSSAI classifies it as Generally Recognized as Safe (GRAS)\n• Scientific consensus finds it safe for most people\n• Some individuals report sensitivity symptoms (headaches, sweating)\n• No reliable scientific evidence links it to serious health issues\n\nWould you like to know about products that contain MSG?";
    }
    
    if (lowerMessage.includes('sodium benzoate') || lowerMessage.includes('e211')) {
        return "Sodium Benzoate (E211) is a preservative used to prevent microbial growth and extend shelf life.\n\nRegulatory Status:\n• FSSAI: Approved with usage limits\n• FDA: Generally Recognized as Safe\n• EFSA: Acceptable Daily Intake (ADI) of 5 mg/kg body weight\n\nConcerns:\n• Some studies suggest links to hyperactivity in children when combined with artificial colors\n• Generally safe at approved levels\n• May cause reactions in sensitive individuals\n\nFound commonly in: soft drinks, pickles, salad dressings, sauces.";
    }
    
    if (lowerMessage.includes('e number') || lowerMessage.includes('e-number')) {
        return "E numbers are codes for food additives used in the European Union, also recognized in India.\n\nThey're organized by category:\n• E100-E199: Colors\n• E200-E299: Preservatives\n• E300-E399: Antioxidants & acidity regulators\n• E400-E499: Thickeners, stabilizers, emulsifiers\n• E500-E599: Acidity regulators, anti-caking agents\n• E600-E699: Flavor enhancers\n• E900-E999: Miscellaneous\n\nNot all E numbers are harmful—many are natural substances like E300 (Vitamin C). Would you like to know about a specific E number?";
    }
    
    if (lowerMessage.includes('safe') || lowerMessage.includes('harmful') || lowerMessage.includes('dangerous')) {
        return "I understand you're concerned about food safety. Here's what I can tell you:\n\n⚠️ Important: I don't declare products 'safe' or 'unsafe.' Instead, I provide decision intelligence:\n\n1. Regulatory compliance status\n2. Scientific context on ingredients\n3. Known risks or concerns\n4. Personalized warnings based on your profile\n\nFood safety depends on:\n• Individual sensitivities and allergies\n• Consumption frequency and quantity\n• Overall dietary patterns\n• Age and health conditions\n\nFor specific concerns, consult with a healthcare professional or nutritionist.";
    }
    
    if (lowerMessage.includes('allergy') || lowerMessage.includes('allergic')) {
        return "Allergies are serious and individual-specific. Let me help:\n\nCommon food allergens in India:\n• Nuts (tree nuts, peanuts)\n• Dairy (milk, lactose)\n• Gluten (wheat, barley, rye)\n• Soy products\n• Eggs\n• Shellfish\n• Fish\n\nOur system checks products against your health profile. If you've indicated allergies, we'll flag products containing those ingredients.\n\nRecommendation: Always read ingredient labels carefully and consult an allergist for severe allergies.";
    }
    
    if (lowerMessage.includes('diabetes') || lowerMessage.includes('diabetic') || lowerMessage.includes('sugar')) {
        return "For diabetic-friendly choices, consider:\n\n✓ What to look for:\n• Low glycemic index ingredients\n• Minimal added sugars\n• High fiber content\n• Complex carbohydrates\n\n✗ What to limit:\n• High fructose corn syrup\n• Refined sugars\n• Simple carbohydrates\n• High sodium (affects blood pressure)\n\nNote: 'Sugar-free' doesn't always mean diabetic-friendly—check for artificial sweeteners and total carbohydrate content.\n\nWould you like me to explain any specific sweetener or ingredient?";
    }
    
    if (lowerMessage.includes('children') || lowerMessage.includes('kids') || lowerMessage.includes('child')) {
        return "Children have different nutritional needs and sensitivities:\n\nIngredients to be cautious about:\n• Artificial colors (linked to hyperactivity in some studies)\n• High caffeine content\n• Excessive sodium\n• High sugar content\n• Certain preservatives\n\nFSSAI Guidelines for Children:\n• Limit processed foods\n• Avoid choking hazards\n• Check age-appropriate serving sizes\n• Monitor additive intake\n\nOur system flags products that may not be suitable for children based on ingredient profiles. What specific age group are you concerned about?";
    }
    
    if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
        return "You're welcome! I'm here to help you make informed food choices. Feel free to ask about any ingredient, additive, or product concern. 😊";
    }
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
        return "Hello! I'm your AI nutrition assistant. I can help you understand food labels, ingredients, and additives. What would you like to know?";
    }
    
    // Default response
    return "That's an interesting question! While I have information about many food ingredients and additives, I'd need more specific details to provide accurate guidance.\n\nYou can ask me about:\n• Specific ingredients or E numbers\n• Food additives and their purposes\n• Regulatory compliance\n• Dietary concerns (allergies, diabetes, etc.)\n• Age-appropriate food choices\n\nWhat specific aspect would you like to know more about?";
}

// Database Integration Comments
/*
    AI CHAT DATABASE INTEGRATION:
    
    In production, this chat would connect to:
    
    1. VECTOR DATABASE for RAG (Retrieval Augmented Generation):
       - Store embeddings of product information, ingredient data
       - Use for context-aware responses
       - Example: Pinecone, Weaviate, or PostgreSQL with pgvector
    
    2. PRODUCT CONTEXT:
       - If user asks about current product, fetch from session/URL params
       - Query product details, ingredients, compliance status
       - Provide specific answers based on actual product data
    
    3. USER PROFILE CONTEXT:
       - Include user allergies, preferences in AI prompts
       - Personalize warnings and recommendations
       - Query: SELECT * FROM user_health_profiles WHERE user_id = {id}
    
    4. KNOWLEDGE BASE:
       - Store in 'knowledge_articles' table
       - Categories: ingredients, additives, regulations, health concerns
       - Use for consistent, verified information
    
    5. CHAT HISTORY:
       - Store in 'chat_messages' table for context and user support
       - Schema: id, user_id, message, response, timestamp
    
    6. API INTEGRATION:
       - In production: Call Claude API or other LLM
       - Include system prompts with regulatory disclaimers
       - Example endpoint: /api/chat with streaming response
*/