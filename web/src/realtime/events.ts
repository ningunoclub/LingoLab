// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
/**
 * Typed Socket.IO event maps.
 *
 * Socket.IO events are NOT in the OpenAPI spec, so these types are derived by hand from
 * `classquiz/socket_server/__init__.py`, `SocketIo.md` and `frontend/src/lib/socket.ts`.
 * Keep this file in sync when the backend's socket server changes.
 *
 * Payloads that the backend forwards verbatim from Redis (the quiz itself, question
 * results) are typed as `unknown` here on purpose: they are validated where they are
 * consumed, in the play/admin features, rather than being trusted at the socket boundary.
 */

export type PlayerIdentity = { username: string; sid: string };

export type SetQuestionNumberPayload = {
  question_index: number;
  question: unknown;
  /** Absent on the last question. */
  time?: string;
};

export type ControlVisibilityPayload = { visible: boolean };

export type RegisteredAsAdminPayload = {
  game_id: string;
  /** Raw JSON string held in Redis. */
  game: string | null;
};

/** Events the server sends to this client. */
export type ServerToClientEvents = {
  // --- connection / session ---
  session_id: (data: { session_id: string }) => void;
  time_sync: (encryptedDatetime: string) => void;
  error: () => void;

  // --- joining ---
  joined_game: (data: unknown) => void;
  rejoined_game: (data: unknown) => void;
  game_not_found: () => void;
  game_already_started: () => void;
  username_already_exists: () => void;
  player_joined: (player: PlayerIdentity) => void;
  kick: () => void;

  // --- admin / host ---
  registered_as_admin: (data: RegisteredAsAdminPayload) => void;
  already_registered_as_admin: () => void;
  control_visibility: (data: ControlVisibilityPayload) => void;

  // --- game flow ---
  start_game: () => void;
  set_question_number: (data: SetQuestionNumberPayload) => void;
  question_results: (results: unknown) => void;
  solutions: (solution: unknown) => void;
  final_results: (results: unknown) => void;
  player_answer: (data: Record<string, never>) => void;
  everyone_answered: (data: Record<string, never>) => void;
  question_not_active: () => void;
  already_replied: () => void;

  // --- export / persistence ---
  export_token: (token: string) => void;
  results_saved_successfully: () => void;
};

/** Events this client sends to the server. */
export type ClientToServerEvents = {
  join_game: (data: {
    game_pin: string;
    username: string;
    captcha?: string;
    custom_field?: string;
  }) => void;
  rejoin_game: (data: { old_sid: string; username?: string }) => void;
  start_game: (data: Record<string, never>) => void;

  register_as_admin: (data: { game_pin: string; game_id: string }) => void;
  register_as_remote: (data: { game_pin: string; game_id: string }) => void;
  set_control_visibility: (data: ControlVisibilityPayload) => void;

  set_question_number: (questionIndex: string) => void;
  get_question_results: (data: { question_number: number }) => void;
  submit_answer: (data: { question_index: number; answer: string }) => void;
  show_solutions: (data: Record<string, never>) => void;
  get_final_results: (data: Record<string, never>) => void;

  kick_player: (data: { username: string }) => void;
  get_export_token: () => void;
  save_quiz: () => void;
  echo_time_sync: (data: string) => void;
};
