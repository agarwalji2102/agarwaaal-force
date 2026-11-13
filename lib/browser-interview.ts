export type InterviewFields = {
  peopleCount?: number;
  canLeave?: "yes" | "no" | "unsure";
  mobility?: "walks" | "walker" | "manual_wheelchair" | "power_wheelchair" | "bedbound";
  assistanceRequired?: "none" | "one_person_assist" | "two_person_lift";
  hasCar?: boolean;
  medical?: ("oxygen" | "dialysis" | "other")[];
  pets?: boolean;
};
export type Question = {
  id: keyof InterviewFields;
  title: string;
  prompt: string;
  stage: "household" | "can_leave" | "needs";
  options: { value: string; label: string }[];
};
const option = (value: string, label = value) => ({ value, label });
const yesNo = [option("yes", "Yes"), option("no", "No")];
export const QUESTIONS: Question[] = [
  { id: "peopleCount", title: "Who is at home?", prompt: "How many people are at the house right now, including you?", stage: "household", options: [1, 2, 3, 4, 5, 6].map(n => option(String(n), `${n} ${n === 1 ? "person" : "people"}`)) },
  { id: "canLeave", title: "Can everyone leave?", prompt: "Can everyone at the house leave without someone helping them? Say yes, no, or unsure.", stage: "can_leave", options: [...yesNo, option("unsure", "Not sure")] },
  { id: "mobility", title: "What mobility support is needed?", prompt: "Tell me the greatest mobility need in the household: walking independently, a walker, a manual wheelchair, a power wheelchair, or unable to leave bed.", stage: "needs", options: [option("walks", "Walks independently"), option("walker", "Uses a walker"), option("manual_wheelchair", "Manual wheelchair"), option("power_wheelchair", "Power wheelchair"), option("bedbound", "Unable to leave bed")] },
  { id: "assistanceRequired", title: "How much help is needed?", prompt: "Does someone need help moving? Choose no physical assistance, one person to assist, or a two person lift.", stage: "needs", options: [option("none", "No physical assistance"), option("one_person_assist", "One person to assist"), option("two_person_lift", "Two-person lift")] },
  { id: "hasCar", title: "Is transport available?", prompt: "Do you have a vehicle available to leave in? Say yes or no.", stage: "needs", options: yesNo },
  { id: "medical", title: "Any medical transport needs?", prompt: "Does anyone need oxygen, dialysis transport, or other medical support? You can also say none. For more than one, type oxygen and dialysis, for example.", stage: "needs", options: [option("none", "None"), option("oxygen", "Oxygen"), option("dialysis", "Dialysis transport"), option("other", "Other medical support")] },
  { id: "pets", title: "Are pets coming with you?", prompt: "Are there pets that would need to come with the household? Say yes or no.", stage: "needs", options: yesNo },
];
const normalize = (s: string) => s.toLowerCase().trim().replace(/[’']/g, "").replace(/[.,!?]/g, " ").replace(/\s+/g, " ").trim();
const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20 };
function countOf(text: string) {
  const words = text.split(" ");
  const counts = words.flatMap(word => NUMBER_WORDS[word] ? [NUMBER_WORDS[word]] : /^\d+$/.test(word) ? [Number(word)] : []);
  return counts.length === 1 && counts[0] >= 1 && counts[0] <= 20 ? counts[0] : null;
}
function booleanOf(text: string) {
  const negative = /\b(no|not|cannot|cant|dont|do not|unable)\b/.test(text);
  const positive = /^(yes|yeah|yep|i do|we do|i have|we have|i can|we can)\b/.test(text);
  if (negative && positive) return null;
  if (negative) return false;
  if (positive) return true;
  return null;
}
function mobilityOf(text: string) {
  if (/\b(no|not|dont|without)\b/.test(text)) return null;
  if (/bedbound|bedridden|leave bed|cannot get out of bed/.test(text)) return "bedbound";
  if (/power.*wheelchair|electric.*wheelchair/.test(text)) return "power_wheelchair";
  if (/manual.*wheelchair/.test(text)) return "manual_wheelchair";
  if (/\bwalker\b|walking frame/.test(text)) return "walker";
  if (/walks independently|walking independently|walk independently|walk unaided/.test(text)) return "walks";
  return null;
}
function assistanceOf(text: string) {
  if (/^none$|^no( physical)? assistance$|^no physical assistance needed$/.test(text)) return "none";
  if (/\b(no|not|dont)\b/.test(text)) return null;
  if (/(two|2)[ -]person|two people|two to lift/.test(text)) return "two_person_lift";
  if (/(one|1)[ -]person|one to assist/.test(text)) return "one_person_assist";
  return null;
}
function medicalOf(text: string): InterviewFields["medical"] | null {
  if (/^(none|no|no medical needs|no medical support)$/.test(text)) return [];
  if (/\b(no|not|dont|without)\b/.test(text)) return null;
  const values = (["oxygen", "dialysis", "other"] as const).filter(value => text.includes(value));
  return values.length ? values : null;
}
type Answer = { patch: InterviewFields; label: string } | null;
function countAnswer(value: string): Answer {
  const count = countOf(value);
  return count ? { patch: { peopleCount: count }, label: `${count} ${count === 1 ? "person" : "people"}` } : null;
}
function leaveAnswer(value: string): Answer {
  if (/unsure|not sure|dont know|do not know/.test(value)) return { patch: { canLeave: "unsure" }, label: "Not sure" };
  const yes = booleanOf(value);
  return yes === null ? null : { patch: { canLeave: yes ? "yes" : "no" }, label: yes ? "Can leave without help" : "Needs help leaving" };
}
function booleanAnswer(id: "hasCar" | "pets", value: string): Answer {
  const yes = booleanOf(value);
  return yes === null ? null : { patch: { [id]: yes }, label: yes ? "Yes" : "No" };
}
function choiceAnswer(question: Question, value: string, exact: string | undefined): Answer {
  const code = exact ?? (question.id === "mobility" ? mobilityOf(value) : assistanceOf(value));
  const choice = question.options.find(item => item.value === code);
  if (!choice) return null;
  if (question.id === "mobility") return { patch: { mobility: choice.value as InterviewFields["mobility"] }, label: choice.label };
  return { patch: { assistanceRequired: choice.value as InterviewFields["assistanceRequired"] }, label: choice.label };
}
function medicalAnswer(value: string): Answer {
  const needs = medicalOf(value);
  return needs ? { patch: { medical: needs }, label: needs.length ? needs.join(", ") : "None" } : null;
}
export function resolveAnswer(question: Question, raw: string): Answer {
  const text = normalize(raw);
  const exact = question.options.find(item => normalize(item.value) === text || normalize(item.label) === text);
  const value = exact?.value ?? text;
  switch (question.id) {
    case "peopleCount": return countAnswer(value);
    case "canLeave": return leaveAnswer(value);
    case "hasCar": case "pets": return booleanAnswer(question.id, value);
    case "mobility": case "assistanceRequired": return choiceAnswer(question, value, exact?.value);
    case "medical": return medicalAnswer(value);
  }
}
export function describeField(question: Question, fields: InterviewFields) {
  const value = fields[question.id];
  if (value === undefined) return "Not answered";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "None";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return question.options.find(item => item.value === String(value))?.label ?? String(value);
}
export function readback(fields: InterviewFields) {
  return QUESTIONS.map(q => `${q.title} ${describeField(q, fields)}.`).join(" ");
}
