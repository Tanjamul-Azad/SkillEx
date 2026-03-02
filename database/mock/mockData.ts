
import type { User, Skill, SkillMatch, SkillChain, Session, Event, Discussion, Review, Notification, Story, SkillCircle, Post } from '@/types';
import { subDays, addDays, addHours, subHours } from 'date-fns';

// --- SKILLS ---
const skillsList: Omit<Skill, 'id' | 'level' | 'description'>[] = [
  { name: 'Video Editing', icon: 'Film', category: 'Creative' },
  { name: 'Guitar', icon: 'Music', category: 'Creative' },
  { name: 'Python', icon: 'Code', category: 'Tech' },
  { name: 'Figma', icon: 'Figma', category: 'Design' },
  { name: 'Photography', icon: 'Camera', category: 'Creative' },
  { name: 'Public Speaking', icon: 'Mic', category: 'Communication' },
  { name: 'Data Science', icon: 'Database', category: 'Tech' },
  { name: 'Graphic Design', icon: 'Paintbrush', category: 'Design' },
  { name: 'English Writing', icon: 'PenTool', category: 'Language' },
  { name: 'Web Dev', icon: 'Laptop', category: 'Tech' },
  { name: 'Music Production', icon: 'Disc', category: 'Creative' },
  { name: '3D Modeling', icon: 'Box', category: 'Design' },
  { name: 'Digital Marketing', icon: 'Megaphone', category: 'Business' },
  { name: 'French Language', icon: 'Languages', category: 'Language' },
  { name: 'Calligraphy', icon: 'Pen', category: 'Creative' },
  { name: 'Cooking', icon: 'ChefHat', category: 'Lifestyle' },
  { name: 'Drawing', icon: 'Palette', category: 'Creative' },
  { name: 'Chess', icon: 'Puzzle', category: 'Strategy' },
  { name: 'Excel', icon: 'Table', category: 'Business' },
  { name: 'UI/UX Design', icon: 'AppWindow', category: 'Design' },
];

export const skills: Skill[] = skillsList.map((skill, index) => ({
  ...skill,
  id: `skill-${index + 1}`,
  level: ['beginner', 'moderate', 'expert'][(index % 3)] as Skill['level'],
  description: `An engaging course on ${skill.name} for all levels.`,
}));

// --- USERS ---
const userNames = ['Rahim', 'Nadia', 'Karim', 'Fatema', 'Arif', 'Sumaiya', 'Tanvir', 'Priya', 'Rafiq', 'Mitu'];
const universities = ['BUET', 'DU', 'NSU', 'BRAC', 'IUT', 'CUET', 'SUST', 'DIU', 'AUST', 'EWU'];

export const users: User[] = userNames.map((name, index) => {
  const skillsOfferedCount = (index % 3) + 2;
  const skillsWantedCount = (index % 2) + 2;
  const skillsOffered = [...skills].sort(() => 0.5 - Math.random()).slice(0, skillsOfferedCount);
  const skillsWanted = [...skills].sort(() => 0.5 - Math.random()).slice(skillsOfferedCount, skillsOfferedCount + skillsWantedCount);

  return {
    id: `user-${index + 1}`,
    name: `${name} Ahmed`,
    email: `${name.toLowerCase()}@${universities[index % universities.length].toLowerCase()}.ac.bd`,
    avatar: `https://picsum.photos/seed/${index + 1}/200/200`,
    university: universities[index % universities.length],
    bio: `A passionate learner from ${universities[index % universities.length]} exploring new skills and connecting with people.`,
    skillsOffered: skillsOffered.map(s => ({ ...s, level: ['moderate', 'expert'][index % 2] as Skill['level'] })),
    skillsWanted: skillsWanted.map(s => ({ ...s, level: 'beginner' as Skill['level'] })),
    skillexScore: 500 + (index * 50),
    level: ['Beginner', 'Intermediate', 'Advanced'][index % 3],
    sessionsCompleted: index * 3 + 5,
    rating: parseFloat((4.5 + (index % 5) / 10).toFixed(1)),
    isOnline: index % 2 === 0,
    joinedAt: subDays(new Date(), index * 10).toISOString(),
  };
});

// --- SKILL MATCHES ---
export const skillMatches: SkillMatch[] = [
  {
    id: 'match-1',
    userA: users[0],
    userB: users[1],
    skillATeaches: users[0].skillsOffered[0],
    skillBTeaches: users[1].skillsOffered[0],
    compatibilityScore: 92,
    status: 'active',
    sessionsCompleted: 3,
    totalSessions: 5,
    nextSession: addHours(new Date(), 48).toISOString(),
  },
  {
    id: 'match-2',
    userA: users[2],
    userB: users[3],
    skillATeaches: users[2].skillsOffered[0],
    skillBTeaches: users[3].skillsOffered[0],
    compatibilityScore: 88,
    status: 'active',
    sessionsCompleted: 1,
    totalSessions: 5,
    nextSession: addHours(new Date(), 72).toISOString(),
  },
  {
    id: 'match-3',
    userA: users[4],
    userB: users[5],
    skillATeaches: users[4].skillsOffered[0],
    skillBTeaches: users[5].skillsOffered[0],
    compatibilityScore: 75,
    status: 'pending',
    sessionsCompleted: 0,
    totalSessions: 4,
  },
    {
    id: 'match-4',
    userA: users[6],
    userB: users[7],
    skillATeaches: users[6].skillsOffered[0],
    skillBTeaches: users[7].skillsOffered[0],
    compatibilityScore: 95,
    status: 'completed',
    sessionsCompleted: 5,
    totalSessions: 5,
  },
  {
    id: 'match-5',
    userA: users[8],
    userB: users[9],
    skillATeaches: users[8].skillsOffered[0],
    skillBTeaches: users[9].skillsOffered[0],
    compatibilityScore: 81,
    status: 'pending',
    sessionsCompleted: 0,
    totalSessions: 6,
  },
];

// --- SKILL CHAINS ---
export const skillChains: SkillChain[] = [
  {
    id: 'chain-1',
    members: [users[0], users[2], users[4]],
    skills: [users[0].skillsOffered[1], users[2].skillsOffered[0], users[4].skillsOffered[1]],
    status: 'active',
  },
  {
    id: 'chain-2',
    members: [users[1], users[3], users[5]],
    skills: [users[1].skillsOffered[0], users[3].skillsOffered[1], users[5].skillsOffered[0]],
    status: 'pending',
  },
];

// --- SESSIONS ---
export const sessions: Session[] = [
  {
    id: 'session-1',
    matchId: 'match-1',
    teacherId: users[0].id,
    learnerId: users[1].id,
    skill: users[0].skillsOffered[0],
    scheduledAt: addDays(new Date(), 1).toISOString(),
    duration: 60,
    status: 'scheduled',
    meetLink: 'https://meet.google.com/xyz-abc-pqr',
  },
  {
    id: 'session-2',
    matchId: 'match-2',
    teacherId: users[2].id,
    learnerId: users[3].id,
    skill: users[2].skillsOffered[0],
    scheduledAt: addDays(new Date(), 3).toISOString(),
    duration: 45,
    status: 'scheduled',
    meetLink: 'https://meet.google.com/xyz-abc-pqr',
  },
    {
    id: 'session-3',
    matchId: 'match-1',
    teacherId: users[1].id,
    learnerId: users[0].id,
    skill: users[1].skillsOffered[0],
    scheduledAt: addDays(new Date(), 4).toISOString(),
    duration: 60,
    status: 'scheduled',
    meetLink: 'https://meet.google.com/xyz-abc-pqr',
  },
  {
    id: 'session-4',
    matchId: 'match-4',
    teacherId: users[6].id,
    learnerId: users[7].id,
    skill: users[6].skillsOffered[0],
    scheduledAt: subDays(new Date(), 1).toISOString(),
    duration: 90,
    status: 'completed',
  },
    {
    id: 'session-5',
    matchId: 'match-4',
    teacherId: users[7].id,
    learnerId: users[6].id,
    skill: users[7].skillsOffered[0],
    scheduledAt: subDays(new Date(), 3).toISOString(),
    duration: 90,
    status: 'completed',
  },
];

// --- EVENTS ---
export const events: Event[] = [
  {
    id: 'event-1',
    title: 'Web Dev Workshop',
    description: 'Join us for a hands-on workshop on modern web development.',
    host: users[9],
    date: addDays(new Date(), 10).toISOString(),
    location: 'BUET ECE Building',
    isOnline: false,
    skills: [skills[9], skills[19]],
    attendees: users.slice(0, 5),
    coverGradient: 'from-blue-500 to-purple-600',
  },
  {
    id: 'event-2',
    title: 'Photography Walk in Old Dhaka',
    description: 'Capture the beauty of Old Dhaka with fellow photography enthusiasts.',
    host: users[4],
    date: addDays(new Date(), 15).toISOString(),
    location: 'Old Dhaka',
    isOnline: false,
    skills: [skills[4]],
    attendees: users.slice(2, 8),
    coverGradient: 'from-amber-500 to-red-600',
  },
  {
    id: 'event-3',
    title: 'Online Figma Design-a-thon',
    description: 'A 24-hour online design challenge using Figma.',
    host: users[3],
    date: addDays(new Date(), 20).toISOString(),
    location: 'Online',
    isOnline: true,
    skills: [skills[3], skills[19]],
    attendees: users.slice(4, 10),
    coverGradient: 'from-pink-500 to-rose-500',
  },
  {
    id: 'event-4',
    title: 'Public Speaking Practice Session',
    description: 'Overcome your fears and practice public speaking in a supportive environment.',
    host: users[5],
    date: addDays(new Date(), 7).toISOString(),
    location: 'NSU Auditorium',
    isOnline: false,
    skills: [skills[5]],
    attendees: users.slice(1, 4),
    coverGradient: 'from-green-500 to-teal-600',
  },
  {
    id: 'event-5',
    title: 'Chess Tournament',
    description: 'Test your strategic skills in our campus-wide chess tournament.',
    host: users[7],
    date: addDays(new Date(), 12).toISOString(),
    location: 'DU Teacher-Student Centre (TSC)',
    isOnline: false,
    skills: [skills[17]],
    attendees: users.slice(3, 9),
    coverGradient: 'from-gray-700 to-gray-900',
  },
];

// --- DISCUSSIONS ---
export const discussions: Discussion[] = Array.from({ length: 10 }, (_, i) => ({
  id: `discussion-${i + 1}`,
  title: `How to start with ${skills[i].name}? Any tips for beginners?`,
  author: users[i % users.length],
  category: skills[i].category,
  content: `I'm new to ${skills[i].name} and would love some advice on where to begin. What are the best resources, and are there any common pitfalls I should avoid? Thanks in advance!`,
  upvotes: 10 + i * 5,
  replies: i + 2,
  views: 100 + i * 20,
  createdAt: subDays(new Date(), i).toISOString(),
  isPinned: i < 2,
}));

// --- REVIEWS ---
export const reviews: Review[] = Array.from({ length: 15 }, (_, i) => {
    const fromUser = users[i % users.length];
    const toUser = users[(i + 1) % users.length];
    const skill = toUser.skillsOffered[0];
    return {
        id: `review-${i + 1}`,
        fromUser: fromUser,
        toUser: toUser,
        skill: skill,
        rating: (i % 5) + 1,
        comment: `A fantastic learning experience! ${toUser.name} is a great teacher for ${skill.name}. Highly recommended.`,
        createdAt: subDays(new Date(), i + 5).toISOString(),
    };
});


// --- NOTIFICATIONS ---
export const notifications: Notification[] = [
    {
        id: `notif-1`,
        type: 'match_request',
        message: `${users[2].name} sent you a match request for ${skills[1].name}.`,
        fromUser: users[2],
        createdAt: subHours(new Date(), 2).toISOString(),
        isRead: false,
    },
    {
        id: `notif-2`,
        type: 'session_scheduled',
        message: `Your session for ${skills[0].name} with ${users[1].name} is confirmed.`,
        fromUser: users[1],
        createdAt: subHours(new Date(), 5).toISOString(),
        isRead: false,
    },
    {
        id: `notif-3`,
        type: 'review_left',
        message: `${users[7].name} left you a review.`,
        fromUser: users[7],
        createdAt: subDays(new Date(), 1).toISOString(),
        isRead: true,
    },
    {
        id: `notif-4`,
        type: 'system_update',
        message: 'Welcome to the new SkillEx! Check out the new community features.',
        createdAt: subDays(new Date(), 2).toISOString(),
        isRead: true,
    },
]

// --- STORIES ---
export const stories: Story[] = users.slice(0, 9).map((user, i) => ({
  id: `story-${i + 1}`,
  user,
  isSeen: i > 2,
}));

// --- SKILL CIRCLES ---
export const skillCircles: SkillCircle[] = [
  {
    id: 'circle-1',
    name: '🎬 Video Creators Club',
    icon: '🎬',
    activity: '🔥 Very Active',
    skills: [skills.find(s => s.name === 'Video Editing')!],
    memberCount: 42,
    members: users.slice(0, 5),
    lastSession: '2 days ago',
  },
  {
    id: 'circle-2',
    name: '🎸 Guitar Jam Sessions',
    icon: '🎸',
    activity: '⚡ Active',
    skills: [skills.find(s => s.name === 'Guitar')!],
    memberCount: 28,
    members: users.slice(2, 7),
    lastSession: '4 days ago',
  },
  {
    id: 'circle-3',
    name: '🐍 Python Coders',
    icon: '🐍',
    activity: '🔥 Very Active',
    skills: [skills.find(s => s.name === 'Python')!],
    memberCount: 78,
    members: users.slice(1, 6),
    lastSession: '1 day ago',
  },
  {
    id: 'circle-4',
    name: '🎨 Figma Designers',
    icon: '🎨',
    activity: '😴 Quiet',
    skills: [skills.find(s => s.name === 'Figma')!, skills.find(s => s.name === 'UI/UX Design')!],
    memberCount: 15,
    members: users.slice(3, 8),
    lastSession: '2 weeks ago',
  },
    {
    id: 'circle-5',
    name: '📸 Photography Hub',
    icon: '📸',
    activity: '⚡ Active',
    skills: [skills.find(s => s.name === 'Photography')!],
    memberCount: 33,
    members: users.slice(4, 9),
    lastSession: '6 days ago',
  },
    {
    id: 'circle-6',
    name: '🎤 Public Speaking Practice',
    icon: '🎤',
    activity: '⚡ Active',
    skills: [skills.find(s => s.name === 'Public Speaking')!],
    memberCount: 18,
    members: users.slice(5, 10),
    lastSession: '3 days ago',
  },
];


// --- POSTS (for Community Feed) ---
export const posts: Post[] = [
  {
    id: 'post-1',
    type: 'showcase',
    author: users[0],
    createdAt: '2 hours ago',
    skill: skills.find(s => s.name === 'Video Editing'),
    content: 'Just finished editing a short film for my class. Check out this quick color grading demo!',
    likes: 125,
    comments: 12,
    shares: 5,
  },
  {
    id: 'post-2',
    type: 'achievement',
    author: users[4],
    createdAt: '8 hours ago',
    content: `just earned the 'Chain Master' badge!`,
    badge: { name: 'Chain Master', icon: '🔗' },
    likes: 230,
    comments: 45,
    shares: 10,
  },
  {
    id: 'post-3',
    type: 'question',
    author: users[2],
    createdAt: '1 day ago',
    skill: skills.find(s => s.name === 'Figma'),
    content: 'is looking for a Figma teacher to help with prototyping.',
    likes: 45,
    comments: 8,
    shares: 2,
  },
    {
    id: 'post-4',
    type: 'exchange',
    author: users[6], // just to show one user initiated the post
    exchangePartners: [users[6], users[7]],
    createdAt: '2 days ago',
    content: 'completed an exchange!',
    skill: skills[5], // just a sample skill
    likes: 98,
    comments: 7,
    shares: 3,
  },
];

    