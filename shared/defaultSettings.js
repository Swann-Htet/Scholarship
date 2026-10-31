// Single source of truth for site content + design. The API merges whatever the admin saved on top of this.
// Imported by both the Express server and the React client.

export const FONT_OPTIONS = {
  display: [
    { name: 'Fraunces', generic: 'serif', spec: '' },
    { name: 'Playfair Display', generic: 'serif', spec: ':wght@400..800' },
    { name: 'DM Serif Display', generic: 'serif', spec: '' },
    { name: 'Sora', generic: 'sans-serif', spec: ':wght@400..800' },
    { name: 'Bricolage Grotesque', generic: 'sans-serif', spec: ':wght@400..800' },
    { name: 'Space Grotesk', generic: 'sans-serif', spec: ':wght@400..700' },
    { name: 'Outfit', generic: 'sans-serif', spec: ':wght@400..800' },
    { name: 'Syne', generic: 'sans-serif', spec: ':wght@400..800' },
    { name: 'Unbounded', generic: 'sans-serif', spec: ':wght@400..800' }
  ],
  body: [
    { name: 'DM Sans', generic: 'sans-serif', spec: '' },
    { name: 'Inter', generic: 'sans-serif', spec: ':wght@400..700' },
    { name: 'Plus Jakarta Sans', generic: 'sans-serif', spec: ':wght@400..700' },
    { name: 'Manrope', generic: 'sans-serif', spec: ':wght@400..700' },
    { name: 'Nunito', generic: 'sans-serif', spec: ':wght@400..700' },
    { name: 'Outfit', generic: 'sans-serif', spec: ':wght@400..700' }
  ]
};

export const SECTION_KEYS = ['why', 'objectives', 'panel', 'workshop', 'rules', 'schedule', 'team', 'info'];

export const defaultSettings = {
  event: {
    title: 'Global Dialogues: Co-existing',
    dateISO: '2026-11-15', // CONFIRM: the proposal says 15 Nov in one place and 14 Nov in another
    dateLabel: '15 November 2026',
    startTime: '08:30',
    endTime: '16:00',
    venue: 'M4U Networking Space',
    campus: 'Mae Fah Luang University',
    capacity: 80,
    lowSpotsThreshold: 15,
    registrationCloses: '9 November 2026',
    contactEmail: ''
  },
  hero: {
    eyebrow: 'A day of conversation, games and shared problem-solving',
    line1: 'Global Dialogues',
    line2: 'Co-existing',
    registerLabel: 'Register your place'
  },
  theme: {
    mode: 'light', // light | dark | auto
    accent1: '#FFB020',
    accent2: '#2DD4BF',
    lightBg: '#FBF6EE',
    darkBg: '#0B0B0F',
    displayFont: 'Fraunces',
    bodyFont: 'DM Sans',
    radius: 26
  },
  animation: {
    background: true,
    blobOpacity: 50, // 0-100, 50 = default strength
    doodles: true,
    people: true,
    marquee: true,
    reveal: true,
    pinnedWorkshop: true,
    sound: true,
    speed: 1 // 0.25 - 3
  },
  sections: { why: true, objectives: true, panel: true, workshop: true, rules: true, schedule: true, team: true, info: true },
  content: {
    greetings: [ // [text, language label, font stack]
      ['Hello', 'English', "'Fraunces', serif"],
      ['สวัสดี', 'Thai', "'Prompt', sans-serif"],
      ['မင်္ဂလာပါ', 'Burmese', "'Pyidaungsu', 'Padauk', 'Noto Sans Myanmar', sans-serif"],
      ['你好', 'Chinese', "'Ma Shan Zheng', 'Noto Serif SC', serif"],
      ['안녕하세요', 'Korean', "'Gowun Dodum', sans-serif"],
      ['नमस्ते', 'Hindi', "'Tiro Devanagari Hindi', serif"],
      ['السلام عليكم', 'Arabic', "'Amiri', serif"],
      ['Bonjour', 'French', "'Fraunces', serif"]
    ],
    whyTitle: 'Co-existing does not require sameness.',
    why: [
      ['Recognise differences', 'Languages, customs and habits are real. Seeing them clearly is the first step.'],
      ['Listen', 'Understanding comes from listening before judging and asking before assuming.'],
      ['Live and work together', 'With mutual respect, differing people can share a campus, a table and a task.']
    ],
    objectives: [
      ['Understand differences', 'See how language, culture and background shape the way each of us thinks and speaks.'],
      ['Listen before judging', 'Practise hearing a perspective fully before forming a view of it.'],
      ['Mix beyond familiar circles', 'Work with people you would not normally sit with, Thai and international students together.'],
      ['Play with languages', 'Learn greetings and phrases from many languages through a shared game.'],
      ['Solve problems together', 'Turn respect into action by tackling a practical campus challenge as one team.']
    ],
    panel: [
      { k: 'Language', icon: 'i-lang', t: 'Language', d: 'How do we understand each other when we do not share a first language, and what do we gain when we try?' },
      { k: 'Culture', icon: 'i-culture', t: 'Culture', d: 'Traditions, food, festivals and habits: what to share, what to ask, and what to avoid assuming.' },
      { k: 'Inclusion', icon: 'i-incl', t: 'Inclusion', d: 'What makes someone feel welcome in a group, and how small choices can open or close a circle.' },
      { k: 'Practical Co-existence', icon: 'i-prac', t: 'Practical Co-existence', d: 'Living, studying and working side by side on campus: concrete habits that make it easier.' }
    ],
    stages: [
      { n: '01', t: 'Group Formation', d: 'Everyone joins a first group. It feels familiar and comfortable, and that is the starting point.' },
      { n: '02', t: 'Group Mixing', d: 'Groups are shuffled so each table gains new voices. Differences become visible, and curiosity takes over.' },
      { n: '03', t: 'Language Exchange', d: 'A multilingual game, not limited to Burmese. Teach a phrase, learn a phrase, laugh at the pronunciation.' },
      { n: '04', t: 'Problem-solving', d: 'Mixed teams take on a practical challenge and apply the five rules to reach a shared solution.' }
    ],
    rules: [
      ['Respect Differences', 'Different does not mean wrong. Treat every background, language and opinion with respect.'],
      ['Listen Before Judging', 'Hear the whole story first. Ask a question before forming a conclusion.'],
      ['Communicate with Openness', 'Say what you mean kindly, share what you can, and be honest when you do not understand.'],
      ['Include Others', 'Notice who is standing at the edge, and make room at the table.'],
      ['Find Solutions Together', 'Disagreement is a starting point. Look for the answer that works for everyone in the group.']
    ],
    schedule: [
      ['08:30', 'Registration', 'Check in with your ticket QR code.'],
      ['09:00', 'Opening', 'Welcome and the five rules.'],
      ['09:30', 'Panel discussion', 'Language, culture, inclusion and practical co-existence.'],
      ['11:00', 'Workshop: groups form and mix', 'Stages one and two.'],
      ['12:00', 'Lunch', 'Lunch box provided.'],
      ['13:00', 'Multilingual language exchange', 'Stage three.'],
      ['14:00', 'Problem-solving challenge', 'Stage four.'],
      ['15:15', 'Reflection and sharing', 'What changed in how we see each other.'],
      ['16:00', 'Closing', 'Thank you and photos.']
    ],
    team: [
      ['Project Manager', 'Overall coordination and partners'],
      ['Programme Lead', 'Panel and workshop flow'],
      ['Game Leaders', 'Activity 3, the language exchange game'],
      ['Registration Team', 'Check-in at 08:30'],
      ['Logistics', 'Venue, lunch boxes and materials'],
      ['Media', 'Promotion and photography']
    ],
    faq: [
      ['Who can join?', 'Thai and international students. The goal is a mix, so please come even if you do not know anyone.'],
      ['What should I wear?', 'Black and white, with jeans. A comfortable outfit you can move around in.'],
      ['Is lunch provided?', 'Yes, a lunch box is provided.'],
      ['Do I get MFU 333 recognition?', 'Points or working hours are subject to GRD and university approval.'],
      ['What if the event is full?', 'The form switches to a waitlist. You will be contacted on LINE if a place opens.'],
      ['What happens to my data?', 'Your name, email and LINE ID are used only to organise this event and are deleted after the post-event report.']
    ]
  }
};
