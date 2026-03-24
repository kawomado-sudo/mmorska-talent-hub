export type QuestionRow = {
  id: string;
  template_id: string;
  skill_id: string | null;
  question: string;
  type: string;
  options: unknown;
  scale_min: number | null;
  scale_max: number | null;
  order_index: number;
};
