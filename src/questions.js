// "Who Knows Sara?" — Birthday Quiz question bank
// Question wording is verbatim from Sara's own Google Form (typos and all —
// don't "fix" the phrasing). Correct answers are exactly what Sara wrote.
// Each question also has 3 extra options so it plays like a real multiple-choice
// quiz; for the "who" questions those distractors are drawn from the whole
// friend group so everyone's name shows up somewhere. Manish is intentionally
// never used as an option (he's only ever mentioned inside a question's text).

export const QUESTIONS = [
  {
    question: "Which household chore Sara hates the most?",
    options: ["Put on the bedsheet", "Wash the dishes", "Do the laundry", "Sweep the floor"],
    correctAnswer: "Put on the bedsheet",
  },
  {
    question:
      "Does Sara really like hosting or she thinks iss group mai sab bhukkad hai toh khilana padega.",
    options: [
      "She likes hosting",
      "Sab bhukkad hai, isliye khilana padta hai",
      "Both, equally",
      "She secretly hates hosting",
    ],
    correctAnswer: "She likes hosting",
  },
  {
    question: "Sara wants to secretly create funny tik toks with Piyush bhai, True or False.",
    options: ["True", "False"],
    correctAnswer: "True",
  },
  {
    question: "At what time of the day Sara was born?",
    options: ["10:44 am", "6:15 am", "11:52 pm", "3:30 pm"],
    correctAnswer: "10:44 am",
  },
  {
    question: "How many times a day Sara complains about her work to Manish?",
    options: ["1", "3", "5", "10"],
    correctAnswer: "3",
  },
  {
    question: "Sara intentionally hides her meerut ka accent. True or False.",
    options: ["True", "False"],
    correctAnswer: "False",
  },
  {
    question: "Who's dressing style in this group Sara likes the most?",
    options: ["Akansha", "Anisha", "Bhumi", "Zalak", "Ritika"],
    correctAnswer: "Akansha",
  },
  {
    question: "Who is the most darkest person in this group according to Sara?",
    options: ["Piyush bhai", "Nitpreet", "Karan", "Manjit"],
    correctAnswer: "Piyush bhai",
  },
  {
    question: "Who is the most funniest person in this group according to Sara?",
    options: ["Nitpreet", "Karan", "Piyush", "Sarvesh"],
    correctAnswer: "Nitpreet",
  },
  {
    question: "Which person in this group Sara can spend whole day talking and gossiping to?",
    options: ["Akansha", "Arpit", "Manjit", "Zalak"],
    correctAnswer: "Akansha",
  },
  {
    question: "With which person would Sara like to post insta stories because they are photogenic?",
    options: ["Zalak", "Anisha", "Pulkit", "Ritika"],
    correctAnswer: "Zalak",
  },
  {
    question:
      "Which one person in this group would Sara want Aashvi to not spend time with, because they would spoil her.",
    options: ["Nitpreet", "Karan", "Manjit", "Bhumi"],
    correctAnswer: "Nitpreet",
  },
  {
    question: "Which one person in this group inspires Sara the most?",
    options: ["Pulkit", "Sarvesh", "Bhumi", "Akansha"],
    correctAnswer: "Pulkit",
  },
];

export const QUESTION_SECONDS = 15;

// Each correct answer is worth a flat 10 pts (see supabase/schema.sql's
// award_points trigger) — QUESTIONS.length * 10 = 130 max possible score.
export const POINTS_PER_QUESTION = 10;

// How long the "and the winner is..." suspense screen holds before the
// leaderboard reveals, once the last question ends.
export const REVEAL_SECONDS = 5;
