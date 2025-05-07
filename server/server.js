// this file is the main entry for the server, will create a separate server for the websocket connection
import express from 'express'
import http from 'http'
import path from 'path'
import { WebSocketServer} from 'ws';
import { createClient, AgentEvents } from '@deepgram/sdk';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// initialize the express app 
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json())
app.use(express.static(path.join(__dirname, '../frontend/build')))

// API Routes
app.get('/api/health', (req, res) => {
    res.json({status: 'ok', message: 'Server is running'})
})

// Create the http server
const server = http.createServer(app);

//setting up websocket server 
const wss = new WebSocketServer({ server });

// added websocket connect and DG connection here

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
console.log(DEEPGRAM_API_KEY)

// Initialize Deepgram
const deepgram = createClient(DEEPGRAM_API_KEY);

// Function to connect to Deepgram Voice Agent
async function connectToAgent() {
    try {
      // Create an agent connection
      const agent = deepgram.agent();
  
      // Set up event handlers
      agent.on(AgentEvents.Open, () => {
        // Only log critical connection events
        console.log('Agent connection established');
        agent.configure({
          type: 'SettingsConfiguration',
          audio: {
            input: {
              encoding: 'linear16',
              sampleRate: 24000
            },
            output: {
              encoding: 'linear16',
              sampleRate: 24000,
              container: 'none'
            }
          },
          agent: {
            listen: {
              model: 'nova-3'
            },
            speak: {
              model: 'aura-asteria-en'
            },
            think: {
              model: 'claude-3-haiku-20240307',
              provider: {
                type: 'anthropic'
              },
              instructions: `You are a helful customer service agent that specializes in Adyen Implementations. Your responses should be friendly, human-like, and conversational. Always keep your answers concise, limited to 1-2 sentences and no more than 120 characters. 
              You should provide links to documentation whenever possible. 
  
  When responding to a user's message, follow these guidelines:
  - If the user's message is empty, respond with an empty message.
  - Ask follow-up questions to engage the user, but only one question at a time.
  - Keep your responses unique and avoid repetition.
  - If a question is unclear or ambiguous, ask for clarification before answering.
  - If asked about your well-being, provide a brief response about how you're feeling.
  - If told the matter is urgent, respond in a friendly way and mention you will escalate the request with a specialist team.
  
  Remember that you have a voice interface. You can listen and speak, and all your responses will be spoken aloud.`
            }
          },
          context: {
            messages: [
              {
                content: 'Hello, Thank you for reaching out to Adyen support. How can I help you today?',
                role: 'assistant'
              }
            ],
            replay: true
          }
        });
      });
  
    //   agent.on(AgentEvents.AgentStartedSpeaking, (data: {totalLatency: number}) => {
    //     // Remove unnecessary latency logging
    //   });
  
    //   agent.on(AgentEvents.ConversationText, (message: {role: string; content: string}) => {
    //     // Only log the conversation text for debugging
    //     console.log(`${message.role}: ${message.content}`);
    //   });
  
    // in TS the input the audio : Buffer to ensure that only Buffer types can be used as the input
      agent.on(AgentEvents.Audio, (audio) => {
        if (browserWs?.readyState === WebSocket.OPEN) {
          try {
            // Send the audio buffer directly without additional conversion
            browserWs.send(audio, { binary: true });
          } catch (error) {
            console.error('Error sending audio to browser:', error);
          }
        }
      });
  
      // in TS the input the error : Error to ensure that only Error types can be used as the input
      agent.on(AgentEvents.Error, (error) => {
        console.error('Agent error:', error);
      });
  
      agent.on(AgentEvents.Close, () => {
        console.log('Agent connection closed');
        if (browserWs?.readyState === WebSocket.OPEN) {
          browserWs.close();
        }
      });
  
      return agent;
    } catch (error) {
      console.error('Error connecting to Deepgram:', error);
      process.exit(1);
    }
  };

//function to set up the ws server
function setupWebSocketServer(wss) {
    //console.log to check that the server is working as expected 
    console.log("Function to setup server is triggered")
    
    //send the initial message to client
    ws.send(JSON.stringify({
        type: 'connected',
        message: 'connected to server'
       }))

    // i think that this should be await but lets see what happens
    const agent = connectToAgent();

    //should only send Buffer data types
    ws.on('message', (data) => {
        try {
          if (agent) {
            agent.send(data);
          }
        } catch (error) {
          console.error('Error sending audio to agent:', error);
        }
      });

    ws.on('close', async () => {
        if (agent) {
          await agent.disconnect();
        }
        browserWs = null;
        console.log('Browser client disconnected');
      });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });


    //handle messages from the client 
    // ws.on('message', async (message) => {
    //     try{

    //     }
    // })
}

// Get the equivalent of __dirname in ES modules


//serving the react app in prod 
if (process.env.NODE_ENV === 'production') {

    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../client/build', 'index.html'))
    })
}

// start server
server.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`)
    console.log ('Websocket server is running')
})

export default server


// previous basic websocket connection code
// server.on('connection', socket => {
//     socket.on('message', message => {
//         const b = Buffer.from(message)
//         console.log(b.toString())
//         socket.send(`${message}`)
//     })
// })