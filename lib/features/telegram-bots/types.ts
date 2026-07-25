export interface TelegramBot {
  id: string;
  user_id: string;
  name: string;
  bot_token: string;
  chat_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTelegramBotInput {
  name: string;
  bot_token: string;
  chat_id: string;
}
