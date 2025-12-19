import {GoogleGenAI} from "@google/genai";
import fs from "fs-extra";
import path from "path";

export async function generateCode(params){
    const apiKey = process.env.GOOGLE_API_KEY;

    if(!apiKey){
        throw new Error("GEMINI KEY not found");
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Generate a complete, production-ready project based on the following requirements:

Description: ${params.description}
Language: ${params.language}
${params.framework ? `Framework: ${params.framework}` : ''}

Please provide:
1. Complete file structure (directory tree)
2. All necessary files with complete code
3. Package configuration files (package.json, requirements.txt, etc.)
4. README.md with:
   - Project description
   - Installation instructions
   - Setup commands
   - How to run the project
   - How to run tests (if applicable)
   - Environment variables needed
5. Any additional configuration files needed

IMPORTANT: The fileStructure should represent the direct contents of the project directory, NOT wrapped in a root node.

Format your response as JSON with the following structure:
{
  "projectName": "project-name",
  "fileStructure": [
    {
      "type": "file",
      "name": "README.md"
    },
    {
      "type": "directory",
      "name": "src",
      "children": [
        {
          "type": "file",
          "name": "index.js"
        }
      ]
    }
  ],
  "files": [
    {
      "path": "relative/path/to/file",
      "content": "file content here",
      "description": "brief description of this file"
    }
  ],
  "setupInstructions": {
    "prerequisites": ["prerequisite 1", "prerequisite 2"],
    "installCommands": ["command 1", "command 2"],
    "runCommands": ["command to run the project"],
    "testCommands": ["command to run tests"],
    "environmentVariables": [
      {
        "name": "VAR_NAME",
        "description": "what this variable is for",
        "example": "example value"
      }
    ]
  },
  "additionalNotes": "any additional information or tips"
}`;

try{
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt, 
        config:{
            systemInstruction: "You are an expert software developer who creates complete, production-ready projects with clear documentation and setup instructions.",
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
        }
    });

    const generatedText = response.text;

    let cleanedText = generatedText.trim();

    if(cleanedText.startsWith("```json")){
        cleanedText = cleanedText.slice(7);
    } else if(cleanedText.startsWith("```")){
        cleanedText = cleanedText.slice(3);
    }

    if(cleanedText.endsWith("```")){
        cleanedText = cleanedText.slice(0, -3);
    }

    cleanedText = cleanedText.trim();

    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if(!jsonMatch){
        throw new Error("No JSON object found in the respose");
    }

    const jsonString = jsonMatch[0];
    const projectData = JSON.parse(jsonString);
    const data = {
        success: true,
        projectName: projectData.projectName,
        fileStructure: projectData.fileStructure,
        files: projectData.files,
        setupInstructions: projectData.setupInstructions,
        additionalNotes: projectData.additionalNotes,
        summary: {
            totalFiles: projectData.files.length,
            language: params.language,
            framework: params.framework,
            hasTests: params.includeTests
        }
    };

    await generateProject(data, params.rootPath);

    return data;
} catch(error){
    console.error("Error generating code:", error);
    throw error;
}
}

async function createStructure(basePath, node){
    if(node.type === "directory"){
        const dirPath = path.join(basePath, node.name);
        await fs.ensureDir(dirPath);

        if(node.children) {
            for(const child of node.children){
                await createStructure(dirPath, child);
            }
        }
    }

    if(node.type === "file"){
        const filePath = path.join(basePath, node.name);
        await fs.ensureFile(filePath);
    }
}

async function writeFiles(projectPath, files){
    for(const file of files){
        const fullPath = path.join(projectPath, file.path);
        await fs.outputFile(fullPath, file.content || "");
    }
}

async function generateProject(data, root){
    const CODEGEN_ROOT = root;

    const projectPath = path.join(CODEGEN_ROOT, data.projectName);
    console.log("Generating project at:", projectPath);
    await fs.ensureDir(projectPath);

    await createStructure(projectPath, data.fileStructure);

    await writeFiles(projectPath, data.files);

    console.log("Project generation completed.");
}