//routes/fbWebhookRoute.js
const express = require('express');
const router = express.Router();
const { checkSubscription } = require('../helper/subscriptionHelper');
const { sendMessage } = require('../helper/messengerApi');
const { chatCompletion } = require('../helper/openaiApi');
const { checkNumber } = require('./numberValidation');
const axios = require('axios');
async function callChatCompletionService(prompt, fbid) {
  try {
    const complexionServiceUrl = 'https://reponse-5fma1s4l.b4a.run/generate-response'; 
    
    const response = await axios.post(
      complexionServiceUrl,
      { prompt, fbid },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data; // Assuming the service responds with JSON data
  } catch (error) {
    console.error('Error calling chat completion service:', );
    throw error;
  }
}

router.post('/', async (req, res) => {
  try {
    const { entry } = req.body;
    if (entry && entry.length > 0 && entry[0].messaging && entry[0].messaging.length > 0) {
      const { sender: { id: fbid }, message } = entry[0].messaging[0];
      if (message && message.text) {
        let { text: query } = message;
        console.log(`${fbid}`);
        // Check if the message is a number
        if (/^\d+$/.test(query)) {
          const numberValidationResult = await checkNumber(query, fbid);
          await sendMessage(fbid, numberValidationResult);
          console.log('Number message sent:', numberValidationResult);
          return res.sendStatus(200);
        }

        const { Status } = await checkSubscription(fbid);
        if (Status === 'A') {

          try {
            // Call the chatCompletionService function to get the response
            const result = await callChatCompletionService(query, fbid);

              // Send the response to the user
              await sendMessage(fbid, result.response);
            
          } catch (error) { 
            const result = await callChatCompletionService(query, fbid);
            await sendMessage(fbid, result.response);
            console.log('chat')
          }
        }
      }      
    }
  } catch (error) {
    console.error('Error occurred:', error);
  }

  res.sendStatus(200);
});

// Handle GET requests for verification
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token && mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

module.exports = {
  router,
};
