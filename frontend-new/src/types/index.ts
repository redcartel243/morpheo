// Define shared types here

export interface GenerationInfo {
    id: string;
    name: string;
    prompt_preview: string;
    createdAt: Date; // Use Date object on the frontend
}

export interface GenerationDetail extends GenerationInfo {
    prompt: string;
    htmlContent: string;
} 