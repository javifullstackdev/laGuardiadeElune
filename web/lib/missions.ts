export type MissionStatus = "open" | "review" | "done";

export type Mission = {
  key: string;
  title: string;
  description: string;
  points: number;
  status: MissionStatus;
};
