// Enterprise Codes
export type EntCode = 'ENT1' | 'ENT2' | 'ENT3' | 'ENT-1' | 'ENT-2' | 'ENT-3'

// Flow Types
export type FlowCode = 
  | 'WELCOME_FLOW' 
  | 'ONBOARDING_FLOW' 
  | 'FEEDBACK_FLOW' 
  | 'GAME_START_FLOW' 
  | 'GAME_END_FLOW'

// ManyChat Flow IDs mapping
export const MANYCHAT_FLOWS: Record<FlowCode, string> = {
  WELCOME_FLOW: 'content20240925025701_931364',
  ONBOARDING_FLOW: 'content20240925025701_123456',
  FEEDBACK_FLOW: 'content20240925025701_789012',
  GAME_START_FLOW: 'content20240925025701_456789',
  GAME_END_FLOW: 'content20240925025701_234567'
} as const

// API Endpoints
export const MANYCHAT_ENDPOINTS = {
  SET_CUSTOM_FIELDS: 'https://api.manychat.com/fb/subscriber/setCustomFields',
  SEND_FLOW: 'https://api.manychat.com/fb/sending/sendFlow'
} as const

// API Keys for different enterprises
export const MANYCHAT_API_KEYS: Record<string, string> = {
  'ENT1': '568686842996533:c06b17396c81aeb16cf42b17446313af',
  'ENT2': '589281880929856:f35f2220b71a660a7f9cf822423675b3',
  'ENT3': '510130002192941:559a7ee52c00432f91c4a617874cfbb1'
} as const 