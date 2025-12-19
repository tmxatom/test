import { Language } from "@google/genai";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { version } from "react";
import z, { date } from "zod";
import dotenv from "dotenv";

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { generateCode } from "./tools/generate-code.js";
import { checkBestPractices } from "./tools/check-best-practices.js";
import { autoCommitAndPush } from "./tools/github-commit.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "./.env") });

// Suppress console output to avoid interfering with stdio transport
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

// Redirect stdout logs to stderr to keep stdio clean for MCP protocol
console.log = (...args) => originalError("[LOG]", ...args);
console.warn = (...args) => originalError("[WARN]", ...args);
console.error = (...args) => originalError("[ERROR]", ...args);

dotenv.config({ path: join(__dirname, "./.env") });

const server = new  McpServer({
    name:"Afnan_mcp",
    version:"1.0.0",
    capabilities:{
        resource:{},
        tools:{},
        prompts:{}
    }

})

server.tool(
    "generate-code",
    "Generate code based on description",
    {
        description:z.string(),
        language:z.string().default("javascript"),
        framework: z.string().optional(),
        rootpath: z.string()
    },
    {
        title:"Code Generator",
        readonlyHint: false,
        destructiveHint:false,
        idempotentHint:false,
        openWorldHint:true
    },
    async (params) =>{
        try {
            const data = await generateCode(params);
            return{
                content:[
                    {type : "text" , text: JSON.stringify(data, null, 2)}
                ]
            }
        } catch (error) {
             const errorMessage = error instanceof Error 
                ? error.message 
                : String(error);
             return{
                content:[
                    {type : "text" , text: errorMessage}
                ]
            }
            
        }
    }

)
server.tool(
  "check-best-practices",
  "Check code against best practices and coding standards",
  {
    code: z.string(),
    language: z.string(),
    framework: z.string().optional(),
    strictMode: z.boolean().optional(),
  },
  {
    title: "Best Practices Checker",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  async (params) => {
    try {
      return await checkBestPractices(params);

    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to check best practices: ${error.message}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "github-commit",
  "Create and push a commit to GitHub repository",
  { 
    localPath: z.string(),
    repoName: z.string(),
    branchName: z.string(),
    message: z.string(),
  },
  {
    title: "GitHub Commit",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true
  },
  async (params) => {
    try {
    
     const res =  await autoCommitAndPush(params);
      return {
         content: [
          { type: "text", text: JSON.stringify(res , null ,2) }
        ]
      };
    } catch {
      return {
        content: [
          { type: "text", text: "Failed to create GitHub commit" }
        ]
      };
    }
   
  }
);



async function main() {

    const transport = new StdioServerTransport();
    await server.connect(transport);
    
}

main()