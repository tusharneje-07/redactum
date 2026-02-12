export interface Tone {
  id: string;
  name: string;
  description: string;
  instruction: string;
}

export const TONES: Tone[] = [
  {
    id: 'formal',
    name: 'Formal',
    description: 'Structured, precise, impersonal - for academic, legal, and official communication',
    instruction: 'Rewrite this text in a formal tone. Use precise language, maintain objectivity, and follow standard conventions for academic, legal, or official contexts. Avoid contractions and colloquialisms.',
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Polished and business-appropriate - for corporate emails, proposals, reports',
    instruction: 'Rewrite this text in a professional tone suitable for business communication. Be courteous, clear, and maintain appropriate workplace etiquette without being overly stiff.',
  },
  {
    id: 'neutral',
    name: 'Neutral',
    description: 'Objective and factual with minimal emotion - for documentation and informational writing',
    instruction: 'Rewrite this text in a neutral tone. Present facts objectively without emotional language or bias. Focus on clarity and informational value.',
  },
  {
    id: 'straightforward',
    name: 'Straightforward',
    description: 'Concise, direct, and action-focused - clear instructions or decisions',
    instruction: 'Rewrite this text in a straightforward tone. Be direct and concise. Remove unnecessary words and get straight to the point with clear action items.',
  },
  {
    id: 'friendly',
    name: 'Friendly',
    description: 'Warm, approachable, and reader-focused - for customer communication and community writing',
    instruction: 'Rewrite this text in a friendly tone. Be warm and approachable while remaining respectful. Connect with the reader personally without being overly casual.',
  },
  {
    id: 'casual',
    name: 'Casual',
    description: 'Relaxed, conversational, informal - for blogs, internal chats, informal updates',
    instruction: 'Rewrite this text in a casual tone. Use conversational language, contractions, and a relaxed style suitable for informal contexts like blogs or team chats.',
  },
  {
    id: 'persuasive',
    name: 'Persuasive',
    description: 'Designed to influence or convince - for sales, marketing, arguments',
    instruction: 'Rewrite this text in a persuasive tone. Present compelling arguments, highlight benefits, and guide the reader toward a specific conclusion or action.',
  },
  {
    id: 'authoritative',
    name: 'Authoritative',
    description: 'Confident, decisive, expert-level voice - for leadership, policy, expert commentary',
    instruction: 'Rewrite this text in an authoritative tone. Project confidence and expertise. Be decisive and command respect through knowledgeable, well-reasoned statements.',
  },
  {
    id: 'empathetic',
    name: 'Empathetic',
    description: 'Emotionally aware and supportive - for support, HR, sensitive topics',
    instruction: 'Rewrite this text in an empathetic tone. Show understanding and emotional awareness. Be supportive and considerate of the reader\'s feelings and perspective.',
  },
  {
    id: 'inspirational',
    name: 'Inspirational',
    description: 'Motivating and uplifting - for speeches, branding, mission statements',
    instruction: 'Rewrite this text in an inspirational tone. Motivate and uplift the reader. Use encouraging language that inspires action and conveys a sense of purpose.',
  },
];

export type ToneType = typeof TONES[number]['id'];