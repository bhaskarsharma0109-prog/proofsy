const fs = require("fs");
const path = require("path");
const https = require("https");

// --- Load environment variables from frontend/.env.local ---
let BEDROCK_API_KEY = "";
let BEDROCK_REGION = "us-east-1";
let BEDROCK_MODEL = "anthropic.claude-3-5-sonnet-20241022-v2:0";

try {
  const envPath = path.join(__dirname, "frontend/.env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    content.split("\n").forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || "";
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        
        if (key === "NEXT_PUBLIC_AWS_BEDROCK_API_KEY") BEDROCK_API_KEY = value.trim();
        if (key === "NEXT_PUBLIC_AWS_REGION") BEDROCK_REGION = value.trim();
        if (key === "NEXT_PUBLIC_BEDROCK_MODEL") BEDROCK_MODEL = value.trim();
      }
    });
    console.error("[Bedrock MCP] Loaded configuration from .env.local");
  } else {
    console.error("[Bedrock MCP] .env.local not found, using process.env");
  }
} catch (e) {
  console.error("[Bedrock MCP] Error reading .env.local:", e.message);
}

// Fallback to environment variables
BEDROCK_API_KEY = BEDROCK_API_KEY || process.env.NEXT_PUBLIC_AWS_BEDROCK_API_KEY || "";
BEDROCK_REGION = BEDROCK_REGION || process.env.NEXT_PUBLIC_AWS_REGION || "us-east-1";
BEDROCK_MODEL = BEDROCK_MODEL || process.env.NEXT_PUBLIC_BEDROCK_MODEL || "anthropic.claude-3-5-sonnet-20241022-v2:0";

console.error(`[Bedrock MCP] Configured Model: ${BEDROCK_MODEL}`);
console.error(`[Bedrock MCP] Configured Region: ${BEDROCK_REGION}`);
console.error(`[Bedrock MCP] API Key configured: ${BEDROCK_API_KEY ? "YES (starts with " + BEDROCK_API_KEY.slice(0, 8) + ")" : "NO"}`);

// --- stdio buffer handling ---
let buffer = "";

process.stdin.on("data", (chunk) => {
  buffer += chunk.toString();
  let lineEnd;
  while ((lineEnd = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, lineEnd).trim();
    buffer = buffer.slice(lineEnd + 1);
    if (line) {
      handleRequest(line);
    }
  }
});

function sendResponse(response) {
  process.stdout.write(JSON.stringify(response) + "\n");
}

function handleRequest(line) {
  try {
    const request = JSON.parse(line);
    console.error(`[Bedrock MCP] Received request: ${request.method} (ID: ${request.id})`);
    
    switch (request.method) {
      case "initialize":
        sendResponse({
          jsonrpc: "2.0",
          id: request.id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: "bedrock-mcp-server",
              version: "1.0.0"
            }
          }
        });
        break;
        
      case "notifications/initialized":
        // Notification, no response required
        console.error("[Bedrock MCP] Client initialized successfully");
        break;
        
      case "tools/list":
        sendResponse({
          jsonrpc: "2.0",
          id: request.id,
          result: {
            tools: [
              {
                name: "ask_bedrock",
                description: "Queries the AWS Bedrock LLM using the configured Bedrock API Key and returns the response.",
                inputSchema: {
                  type: "object",
                  properties: {
                    prompt: {
                      type: "string",
                      description: "The prompt to send to the Bedrock model"
                    },
                    systemPrompt: {
                      type: "string",
                      description: "Optional system prompt instructions for the model"
                    }
                  },
                  required: ["prompt"]
                }
              }
            ]
          }
        });
        break;
        
      case "tools/call":
        if (request.params.name === "ask_bedrock") {
          const prompt = request.params.arguments.prompt;
          const systemPrompt = request.params.arguments.systemPrompt || "You are a helpful assistant.";
          executeBedrockQuery(request.id, prompt, systemPrompt);
        } else {
          sendResponse({
            jsonrpc: "2.0",
            id: request.id,
            error: {
              code: -32601,
              message: `Tool not found: ${request.params.name}`
            }
          });
        }
        break;
        
      default:
        sendResponse({
          jsonrpc: "2.0",
          id: request.id,
          error: {
            code: -32601,
            message: `Method not found: ${request.method}`
          }
        });
    }
  } catch (err) {
    console.error("[Bedrock MCP] Error parsing request:", err.message);
  }
}

function executeBedrockQuery(id, prompt, systemPrompt) {
  if (!BEDROCK_API_KEY) {
    sendResponse({
      jsonrpc: "2.0",
      id: id,
      result: {
        content: [
          {
            type: "text",
            text: "Error: Bedrock API Key is not configured. Please set NEXT_PUBLIC_AWS_BEDROCK_API_KEY in your frontend/.env.local file."
          }
        ],
        isError: true
      }
    });
    return;
  }

  console.error(`[Bedrock MCP] Querying model ${BEDROCK_MODEL} in ${BEDROCK_REGION}...`);

  const requestBody = JSON.stringify({
    anthropic_version: "bedrock-2023-06-01",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  });

  const options = {
    hostname: `bedrock-runtime.${BEDROCK_REGION}.amazonaws.com`,
    path: `/model/${BEDROCK_MODEL}/invoke`,
    method: "POST",
    headers: {
      "x-amz-bedrock-accept": "application/json",
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(requestBody),
      "Authorization": `Bearer ${BEDROCK_API_KEY}`
    }
  };

  const req = https.request(options, (res) => {
    let data = "";
    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      console.error(`[Bedrock MCP] Bedrock response status: ${res.statusCode}`);
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const parsed = JSON.parse(data);
          const textContent = parsed.content.find((c) => c.type === "text");
          const reply = textContent ? textContent.text : "No text content returned.";
          sendResponse({
            jsonrpc: "2.0",
            id: id,
            result: {
              content: [
                {
                  type: "text",
                  text: reply
                }
              ],
              isError: false
            }
          });
        } catch (e) {
          console.error("[Bedrock MCP] Error parsing response data:", e.message);
          sendResponse({
            jsonrpc: "2.0",
            id: id,
            result: {
              content: [
                {
                  type: "text",
                  text: `Error parsing Bedrock response: ${e.message}\nRaw response: ${data}`
                }
              ],
              isError: true
            }
          });
        }
      } else {
        console.error(`[Bedrock MCP] Bedrock error response: ${data}`);
        sendResponse({
          jsonrpc: "2.0",
          id: id,
          result: {
            content: [
              {
                type: "text",
                text: `Bedrock API returned status ${res.statusCode}: ${data}`
              }
            ],
            isError: true
          }
        });
      }
    });
  });

  req.on("error", (e) => {
    console.error("[Bedrock MCP] HTTP request error:", e.message);
    sendResponse({
      jsonrpc: "2.0",
      id: id,
      result: {
        content: [
          {
            type: "text",
            text: `HTTP Request error: ${e.message}`
          }
        ],
        isError: true
      }
    });
  });

  req.write(requestBody);
  req.end();
}
