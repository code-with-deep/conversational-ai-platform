export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  role: string;
  preferences: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  persona_id: string | null;
  title: string;
  memory_type: MemoryType;
  memory_config: Record<string, unknown> | null;
  is_pinned: boolean;
  is_archived: boolean;
  message_count: number;
  total_tokens_used: number;
  created_at: string;
  updated_at: string | null;
}

export interface ConversationDetail extends Conversation {
  messages: Message[];
  summary: string | null;
  entity_count: number;
  triple_count: number;
}

export interface Message {
  id?: string;
  conversation_id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  token_count?: number;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export interface Persona {
  id: string;
  creator_id: string | null;
  name: string;
  avatar_url: string | null;
  system_prompt: string;
  personality: string;
  domain: DomainType;
  default_memory: MemoryType;
  temperature: number;
  is_builtin: boolean;
  usage_count: number;
  created_at: string;
}

export interface Entity {
  id: string;
  conversation_id: string;
  name: string;
  entity_type: EntityType;
  description: string;
  mention_count: number;
  is_global: boolean;
  first_seen: string;
  last_updated: string;
}

export interface EntityVersion {
  id: string;
  entity_id: string;
  description: string;
  version: number;
  source_message_id: string | null;
  created_at: string;
}

export interface KGTriple {
  id: string;
  conversation_id: string;
  subject: string;
  predicate: string;
  object_: string;
  confidence: number;
  source_message_id: string | null;
  created_at: string;
}

export interface Summary {
  id: string;
  conversation_id: string;
  summary_text: string;
  messages_covered: number;
  token_count: number;
  version: number;
  created_at: string;
}

export interface TokenUsage {
  system_tokens: number;
  memory_tokens: number;
  recent_tokens: number;
  response_tokens: number;
  total_tokens: number;
  budget_total: number;
}

export interface MemoryState {
  memory_type: MemoryType;
  entities: Entity[];
  triples: KGTriple[];
  summary: Summary | null;
  token_usage: TokenUsage | null;
}

export interface Stats {
  total_conversations: number;
  active_conversations: number;
  total_messages: number;
  total_entities: number;
  total_triples: number;
  total_summaries: number;
  total_tokens_used: number;
  memory_type_distribution: Record<string, number>;
}

export interface CompareResult {
  conversation_id: string;
  user_message: string;
  result_a: StrategyResult;
  result_b: StrategyResult;
}

export interface StrategyResult {
  strategy: string;
  response: string;
  token_usage: Record<string, number>;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  pages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
}

export interface ApiError {
  success: boolean;
  message: string;
  detail: string | null;
}

export type MemoryType = 'buffer' | 'summary' | 'entity' | 'kg' | 'hybrid';
export type DomainType = 'general' | 'technical' | 'creative' | 'business' | 'education';
export type EntityType = 'person' | 'organization' | 'project' | 'technology' | 'date' | 'concept' | 'other';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}
