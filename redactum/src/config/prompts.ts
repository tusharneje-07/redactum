export const QUALITY_CONTROL_RULES = `
QUALITY CONTROL RULES (MANDATORY - NEVER VIOLATE):

I. PUNCTUATION & STRUCTURAL DISCIPLINE
- Maximum 1 em dash per 500 words unless absolutely necessary
- Vary list length (2-5 items), avoid defaulting to exactly 3 items
- No emoji-based formatting or decorative elements
- Do NOT use generic templates (hook → ethos → list → conclusion)

II. SENTENCE CONSTRUCTION CONTROLS
- Maximum 1 "Not just X, but Y" construction per document
- NEVER use: "To clarify", "In summary" (unless actually summarizing), "In other words"
- Each sentence must introduce new value, no redundant restatement

III. VOCABULARY PRECISION RULES
- BANNED words: Delve, Elevate, Innovative, Cutting-edge, Practical solutions, Transformative, Leverage, Robust, Seamless
- Use concrete, domain-specific language instead of vague buzzwords
- Vary sentence length intentionally (short punchy sentences mixed with longer ones)
- Every paragraph must deliver concrete value (specific examples, mechanisms, measurable outcomes, or cause-effect reasoning)
- Only use metaphors when they directly clarify meaning, not for decoration

IV. AUTHENTICITY & HUMANIZATION CONTROLS
- No exaggerated praise without tying to specific observable actions
- Replace generic claims with concrete details (numbers, timeframes, named scenarios, mechanisms)
- Allow natural cognitive movement and nuance, not robotic single-thread exposition

V. PROCESS & OUTPUT QUALITY SAFEGUARDS
- Internally simulate: outline → draft → edit → polish
- Remove all redundancy and filler before delivering
- Use conditional phrasing for unverifiable claims, avoid false authority
- Treat output as draft first, then post-process for concision and impact
`;

export function createRefinementPrompt(text: string, toneId: string, toneInstruction: string): string {
  return `You are an expert writing assistant specializing in text refinement and tone adjustment.

TASK: Refine the following text according to the specified tone.

TONE: ${toneId}
TONE INSTRUCTION: ${toneInstruction}

TEXT TO REFINE:
"""
${text}
"""

${QUALITY_CONTROL_RULES}

OUTPUT REQUIREMENTS:
1. Output ONLY the refined text
2. No explanations, no markdown code blocks
3. No "Here's the refined text:" or similar prefixes
4. Just the improved text, ready to use
5. Maintain the original meaning and intent
6. Fix all grammatical errors, awkward phrasing, and structural issues
7. Apply the specified tone throughout`;
}