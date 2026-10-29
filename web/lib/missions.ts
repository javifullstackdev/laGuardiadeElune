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
};
