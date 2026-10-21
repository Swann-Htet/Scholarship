/* Single source of truth for everything that may still change.
   Items marked CONFIRM are unresolved in the proposal (see implementation-plan.md section 0).
   Items marked DRAFT are placeholder copy: replace with the proposal's wording. */
window.EVENT = {
  title: "Global Dialogues: Co-existing",
  dateISO: "2026-11-15",            // CONFIRM: proposal says 15 Nov in section 1 but 14 Nov in the timeline
  dateLabel: "15 November 2026",
  rehearsalLabel: "13 November 2026",
  startTime: "08:30",
  endTime: "16:00",
  venue: "M4U Networking Space",    // CONFIRM: subject to confirmation
  campus: "Mae Fah Luang University",
  capacity: 80,                     // CONFIRM: 70-80 is tentative
  lowSpotsThreshold: 15,
  registrationCloses: "9 November 2026",
  contactEmail: "",                 // shown in the footer when filled
  projectManager: "",               // CONFIRM: Thinn Myat Noe or Megen
  endpoint: "",                     // Apps Script web app URL. Empty = demo mode (stores in this browser only)

  greetings: [ // [text, language label, font stack]
    ["Hello", "English", "'Fraunces', serif"],
    ["สวัสดี", "Thai", "'Prompt', sans-serif"],
    ["မင်္ဂလာပါ", "Burmese", "'Pyidaungsu', 'Padauk', 'Noto Sans Myanmar', sans-serif"],
    ["你好", "Chinese", "'Ma Shan Zheng', 'Noto Serif SC', serif"],
    ["안녕하세요", "Korean", "'Gowun Dodum', sans-serif"],
    ["नमस्ते", "Hindi", "'Tiro Devanagari Hindi', serif"],
    ["السلام عليكم", "Arabic", "'Amiri', serif"],
    ["Bonjour", "French", "'Fraunces', serif"]
  ],


  objectives: [ // DRAFT
    ["Understand differences", "See how language, culture and background shape the way each of us thinks and speaks."],
    ["Listen before judging", "Practise hearing a perspective fully before forming a view of it."],
    ["Mix beyond familiar circles", "Work with people you would not normally sit with, Thai and international students together."],
    ["Play with languages", "Learn greetings and phrases from many languages through a shared game."],
    ["Solve problems together", "Turn respect into action by tackling a practical campus challenge as one team."]
  ],

  panel: [ // DRAFT
    { k: "Language", icon: "i-lang", t: "Language", d: "How do we understand each other when we do not share a first language, and what do we gain when we try?" },
    { k: "Culture", icon: "i-culture", t: "Culture", d: "Traditions, food, festivals and habits: what to share, what to ask, and what to avoid assuming." },
    { k: "Inclusion", icon: "i-incl", t: "Inclusion", d: "What makes someone feel welcome in a group, and how small choices can open or close a circle." },
    { k: "Practical Co-existence", icon: "i-prac", t: "Practical Co-existence", d: "Living, studying and working side by side on campus: concrete habits that make it easier." }
  ],

  stages: [ // DRAFT
    { n: "01", t: "Group Formation", d: "Everyone joins a first group. It feels familiar and comfortable, and that is the starting point." },
    { n: "02", t: "Group Mixing", d: "Groups are shuffled so each table gains new voices. Differences become visible, and curiosity takes over." },
    { n: "03", t: "Language Exchange", d: "A multilingual game, not limited to Burmese. Teach a phrase, learn a phrase, laugh at the pronunciation." },
    { n: "04", t: "Problem-solving", d: "Mixed teams take on a practical challenge and apply the five rules to reach a shared solution." }
  ],

  rules: [ // wording of titles is from the proposal; descriptions are DRAFT
    ["Respect Differences", "Different does not mean wrong. Treat every background, language and opinion with respect."],
    ["Listen Before Judging", "Hear the whole story first. Ask a question before forming a conclusion."],
    ["Communicate with Openness", "Say what you mean kindly, share what you can, and be honest when you do not understand."],
    ["Include Others", "Notice who is standing at the edge, and make room at the table."],
    ["Find Solutions Together", "Disagreement is a starting point. Look for the answer that works for everyone in the group."]
  ],

  schedule: [ // DRAFT except the 8:30 start and 4:00 PM end
    ["08:30", "Registration", "Check in with your ticket QR code."],
    ["09:00", "Opening", "Welcome and the five rules."],
    ["09:30", "Panel discussion", "Language, culture, inclusion and practical co-existence."],
    ["11:00", "Workshop: groups form and mix", "Stages one and two."],
    ["12:00", "Lunch", "Lunch box provided. Dietary needs from your registration are honoured."],
    ["13:00", "Multilingual language exchange", "Stage three."],
    ["14:00", "Problem-solving challenge", "Stage four."],
    ["15:15", "Reflection and sharing", "What changed in how we see each other."],
    ["16:00", "Closing", "Thank you and photos."]
  ],

  team: [ // CONFIRM names
    ["Project Manager", "Overall coordination and partners"],
    ["Programme Lead", "Panel and workshop flow"],
    ["Game Leaders", "Activity 3, the language exchange game"],
    ["Registration Team", "Check-in at 08:30"],
    ["Logistics", "Venue, lunch boxes and materials"],
    ["Media", "Promotion and photography"]
  ],

  faq: [
    ["Who can join?", "Thai and international students. The goal is a mix, so please come even if you do not know anyone."],
    ["What should I wear?", "Black and white, with jeans. A comfortable outfit you can move around in."],
    ["Is lunch provided?", "Yes, a lunch box. Tell us your dietary needs in step 3 of the form."],
    ["Do I get MFU 333 recognition?", "Points or working hours are subject to GRD and university approval. Tick the interest box in the form and we will confirm later."],
    ["What if the event is full?", "The form switches to a waitlist. You will be contacted if a place opens."],
    ["What happens to my data?", "It is used only to organise this event and is deleted after the post-event report. Write to the contact address to have it removed sooner."]
  ],

  languages: ["English", "Thai", "Burmese", "Chinese", "Korean", "Japanese", "Hindi", "Arabic", "French", "Lao", "Vietnamese", "Indonesian", "Shan", "Karen"],
  faculties: ["School of Science", "School of Management", "School of Liberal Arts", "School of Law", "School of Social Innovation", "School of Information Technology", "School of Health Science", "School of Nursing", "School of Medicine", "School of Dentistry", "School of Cosmetic Science", "School of Agro-Industry", "School of Sinology", "School of Integrative Medicine", "School of Anti-Aging and Regenerative Medicine", "Other"],
  countries: ["Thailand", "Myanmar", "China", "Laos", "Cambodia", "Vietnam", "India", "Bangladesh", "Nepal", "Indonesia", "Malaysia", "Philippines", "Japan", "South Korea", "Pakistan", "Sri Lanka", "United States", "United Kingdom", "France", "Germany", "Other"]
};
