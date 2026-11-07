export type MissionStatus = "open" | "review" | "done";

export type MissionCharacter = {
  name: string;
  realm: string;
  game: string;
};

export type Mission = {
  key: string;
  title: string;
  description: string;
  points: number;
  status: MissionStatus;
  completed_at: string | null;
  character: MissionCharacter | null;
  subject: string | null;
  /** Cobre confirmado, solo en la misión de oro. */
  progress?: number;
  /** Cobre necesario para completarla. */
  goal?: number;
};
