/**
 * ai.service.js
 * Handles LLM API call via OpenAI.
 */
const { OpenAI } = require('openai');

/**
 * Calls OpenAI to get analysis and JSON structured data
 * @param {String} systemPrompt - Instruction for the AI
 * @param {Object} userDataJSON - Data context to pass to AI
 * @returns {Object} { parsedJson, textExplanation }
 */
exports.getAIStrategy = async (systemPrompt, userDataJSON) => {
  try {
    const isGroq = (process.env.OPENAI_API_KEY || '').startsWith('gsk_');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'your-api-key-here',
      ...(isGroq ? { baseURL: 'https://api.groq.com/openai/v1' } : {})
    });

    const response = await openai.chat.completions.create({
      model: isGroq ? 'llama-3.3-70b-versatile' : 'gpt-4', 
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Here is the user's portfolio data: ${JSON.stringify(userDataJSON)}. Please return only valid JSON with the properties "explanation" and "recommendations".`
        }
      ],
    });

    const aiMessage = response.choices[0].message.content;
    
    // The AI should return a JSON with 'explanation' (string) and 'recommendations' (array)
    let parsedResult;
    try {
      parsedResult = JSON.parse(aiMessage);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", aiMessage);
      throw new Error("AI returned malformed JSON");
    }

    return {
      parsedJson: parsedResult.recommendations || [],
      textExplanation: parsedResult.explanation || "No explanation provided."
    };

  } catch (error) {
    console.error("AI Service Error:", error.message);
    // Add fallback in case API key is missing or invalid for local testing
    return {
      parsedJson: [],
      textExplanation: "Could not fetch AI strategy due to an error: " + error.message
    }
  }
};

/**
 * Calls OpenAI to get plain textual explanation
 * @param {String} systemPrompt - Instruction for the AI
 * @param {Object} userDataJSON - Data context to pass to AI
 * @returns {String} Text explanation
 */
exports.getAIText = async (systemPrompt, userDataJSON) => {
  try {
    const isGroq = (process.env.OPENAI_API_KEY || '').startsWith('gsk_');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'your-api-key-here',
      ...(isGroq ? { baseURL: 'https://api.groq.com/openai/v1' } : {})
    });

    const response = await openai.chat.completions.create({
      model: isGroq ? 'llama-3.3-70b-versatile' : 'gpt-4', 
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(userDataJSON) }
      ],
    });

    return response.choices[0].message.content;
  } catch (error) {
    return "Error generating explanation: " + error.message;
  }
};
