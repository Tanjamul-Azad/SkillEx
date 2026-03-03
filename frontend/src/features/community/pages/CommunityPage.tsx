
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rss,
  Calendar,
  Users,
  MessageSquare,
  Plus,
  Image as ImageIcon,
  Tag,
  HelpCircle,
  Heart,
  Share2,
  Bookmark,
  ArrowUp,
  MapPin,
  MoreHorizontal,
  Circle,
  Pin,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { stories, posts, events, skillCircles, discussions, users as allUsers, skills as allSkills } from '@data/mock/mockData';
import type { Story, Post, Event, SkillCircle, Discussion, User } from '@/types';
import DashboardLayout from '@/components/layout/DashboardLayout';

const tabs = [
  { id: 'feed', label: 'Feed', icon: Rss },
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'circles', label: 'Skill Circles', icon: Users },
  { id: 'discussions', label: 'Discussions', icon: MessageSquare },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100 } },
};

// --- FEED TAB COMPONENTS ---

const StoryCircle = React.memo(({ story, isSelf, selfUser }: { story?: Story; isSelf?: boolean, selfUser?: User | null }) => {
  if (isSelf && selfUser) {
    return (
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        <div className="relative h-16 w-16 rounded-full flex items-center justify-center border-2 border-dashed border-primary cursor-pointer transition-transform hover:scale-105">
          <Avatar className="h-14 w-14">
            <AvatarImage src={selfUser.avatar} />
            <AvatarFallback>{selfUser.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="absolute bottom-0 right-0 h-5 w-5 bg-primary rounded-full flex items-center justify-center border-2 border-background">
            <Plus className="h-3 w-3 text-primary-foreground" />
          </div>
        </div>
        <span className="text-xs font-medium">Add Story</span>
      </div>
    );
  }

  if (!story) return null;

  const userName = story.user.name.split(' ')[0] || story.user.name;

  return (
    <div className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group">
      <div className={cn("h-16 w-16 rounded-full p-0.5 flex items-center justify-center transition-all duration-300 group-hover:scale-105", story.isSeen ? 'bg-white/10' : 'bg-gradient-to-tr from-primary to-secondary shadow-glow-sm')}>
        <Avatar className="h-[58px] w-[58px] border-2 border-background">
          <AvatarImage src={story.user.avatar} />
          <AvatarFallback>{story.user.name.charAt(0)}</AvatarFallback>
        </Avatar>
      </div>
      <span className="text-xs truncate w-16 text-center">{userName}</span>
    </div>
  );
});
StoryCircle.displayName = 'StoryCircle';


const POST_TYPES = [
  { id: 'regular', label: 'Post', icon: MessageSquare },
  { id: 'question', label: 'Question', icon: HelpCircle },
  { id: 'showcase', label: 'Showcase', icon: Tag },
] as const;
type PostType = typeof POST_TYPES[number]['id'];

const PostComposer = React.memo(({ onPost }: { onPost: (post: Post) => void }) => {
  const { user } = useAuth();
  const [focused, setFocused] = useState(false);
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<PostType>('regular');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || !user) return;
    setSubmitting(true);
    // TODO: POST /api/community/posts
    await new Promise((r) => setTimeout(r, 600));
    const newPost: Post = {
      id: `local-${Date.now()}`,
      author: user,
      content: content.trim(),
      type: postType === 'question' ? 'question' : postType === 'showcase' ? 'showcase' : 'exchange',
      likes: 0,
      comments: 0,
      shares: 0,
      createdAt: 'Just now',
    };
    onPost(newPost);
    setContent('');
    setPostType('regular');
    setFocused(false);
    setSubmitting(false);
  };

  return (
    <Card className="glass border-border/60">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="mt-0.5 shrink-0">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setFocused(true)}
              placeholder="Share a skill tip, a win, or ask a question..."
              className="w-full resize-none rounded-2xl glass-subtle px-5 py-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:bg-white/30 dark:focus:bg-black/30 transition-all shadow-inner"
              rows={focused ? 3 : 1}
            />
            <AnimatePresence>
              {focused && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex gap-1">
                      {POST_TYPES.map(({ id, label, icon: Icon }) => (
                        <button
                          key={id}
                          onClick={() => setPostType(id)}
                          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors border ${postType === id
                              ? 'bg-primary/10 text-primary border-primary/30'
                              : 'border-border/40 text-muted-foreground hover:border-primary/30 hover:text-foreground'
                            }`}
                        >
                          <Icon className="h-3 w-3" />
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-xl text-xs"
                        onClick={() => { setContent(''); setFocused(false); }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        disabled={!content.trim() || submitting}
                        className="rounded-xl font-bold gradient-bg text-primary-foreground text-xs px-4"
                        onClick={handleSubmit}
                      >
                        {submitting ? 'Posting...' : 'Post'}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        {!focused && (
          <div className="mt-3 flex justify-around border-t border-border/40 pt-2">
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setFocused(true)}>
              <ImageIcon className="mr-1.5 h-3.5 w-3.5" /> Photo/Video
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setPostType('question'); setFocused(true); }}>
              <HelpCircle className="mr-1.5 h-3.5 w-3.5" /> Ask Question
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setPostType('showcase'); setFocused(true); }}>
              <Tag className="mr-1.5 h-3.5 w-3.5" /> Showcase Skill
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
PostComposer.displayName = 'PostComposer';

const PostCard = React.memo(({ post }: { post: Post }) => {
  const authorName = post.author.name.split(' ')[0] || post.author.name;
  return (
    <Card className="group overflow-hidden glass transition-all hover:shadow-glow-sm duration-400 ease-snappy hover:-translate-y-1">
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <Avatar className="ring-2 ring-border group-hover:ring-primary/30 transition-all">
            <AvatarImage src={post.author.avatar} />
            <AvatarFallback>{post.author.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm">{post.author.name}</p>
            <p className="text-xs text-muted-foreground">{post.createdAt}</p>
          </div>
          <Button variant="ghost" size="icon" className="ml-auto h-8 w-8 hover:bg-primary/5" aria-label="More options">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-3 text-sm leading-relaxed">
          {post.type === 'achievement' && `🏆 ${authorName} ${post.content}`}
          {post.type === 'exchange' && post.exchangePartners && `✅ ${post.exchangePartners[0].name} and ${post.exchangePartners[1].name} ${post.content}`}
          {post.type === 'question' && `❓ ${post.author.name} ${post.content}`}
          {post.type === 'showcase' && post.content}
        </div>

        {post.type === 'showcase' && (
          <div className="mt-4 relative aspect-video rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white overflow-hidden group/video">
            <div className="absolute inset-0 bg-black/20" />
            <Button size="icon" variant="ghost" className="relative z-10 bg-black/40 backdrop-blur-sm rounded-full h-14 w-14 transition-all group-hover/video:bg-black/60 group-hover/video:scale-110 border border-white/30">
              <Play className="h-7 w-7 fill-white text-white" />
            </Button>
            <Badge className="absolute bottom-3 left-3 bg-background/80 backdrop-blur-sm text-foreground border-border/60">{post.skill?.name}</Badge>
          </div>
        )}
        {post.type === 'achievement' && post.badge && (
          <div className="mt-4 flex flex-col items-center justify-center rounded-xl p-6 bg-gradient-to-br from-accent/10 to-secondary/10 border border-accent/20">
            <p className="text-5xl">{post.badge.icon}</p>
            <p className="mt-2 text-lg font-bold">{post.badge.name}</p>
          </div>
        )}

        <div className="mt-4 flex justify-between items-center text-xs text-muted-foreground border-b border-border/50 pb-3">
          <div className="flex items-center gap-1">
            <Heart className="h-3.5 w-3.5 text-red-500/80" />
            <span>{post.likes} likes</span>
          </div>
          <div className="flex items-center gap-2">
            <span>{post.comments} comments</span>
            <span className="text-border">·</span>
            <span>{post.shares} shares</span>
          </div>
        </div>

        <div className="pt-1 flex justify-around -mx-1">
          <Button variant="ghost" size="sm" className="flex-1 rounded-xl text-xs hover:bg-red-500/5 hover:text-red-500 transition-colors">
            <Heart className="mr-1.5 h-3.5 w-3.5" /> Like
          </Button>
          <Button variant="ghost" size="sm" className="flex-1 rounded-xl text-xs hover:bg-primary/5 transition-colors">
            <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Comment
          </Button>
          <Button variant="ghost" size="sm" className="flex-1 rounded-xl text-xs hover:bg-secondary/5 transition-colors">
            <Share2 className="mr-1.5 h-3.5 w-3.5" /> Share
          </Button>
          <Button variant="ghost" size="sm" className="flex-1 rounded-xl text-xs hover:bg-accent/5 transition-colors">
            <Bookmark className="mr-1.5 h-3.5 w-3.5" /> Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});
PostCard.displayName = 'PostCard';


const FeedTab = () => {
  const { user } = useAuth();
  const [localPosts, setLocalPosts] = useState<Post[]>([...posts]);

  const handleNewPost = (post: Post) => {
    setLocalPosts((prev) => [post, ...prev]);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
      <div className="col-span-1 xl:col-span-3 space-y-6">
        {/* Stories */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4 overflow-x-auto pb-2">
              <StoryCircle isSelf selfUser={user} />
              {stories.map(story => <StoryCircle key={story.id} story={story} />)}
            </div>
          </CardContent>
        </Card>

        <PostComposer onPost={handleNewPost} />

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
          {localPosts.map(post => <motion.div variants={itemVariants} key={post.id}><PostCard post={post} /></motion.div>)}
        </motion.div>
      </div>

      {/* Right Sidebar */}
      <aside className="hidden xl:block space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Trending Skills</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {allSkills.slice(0, 5).map((skill, i) => (
                <li key={skill.id} className="flex items-center justify-between text-sm">
                  <span className="font-semibold">{i + 1}. {skill.name}</span>
                  <span className="flex items-center text-green-500"><ArrowUp className="h-4 w-4" /> {Math.floor(Math.random() * 20)}%</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Suggested Connections</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {allUsers.slice(5, 8).map(user => (
              <div key={user.id} className="flex items-center gap-3">
                <Avatar><AvatarImage src={user.avatar} /><AvatarFallback>{user.name.charAt(0)}</AvatarFallback></Avatar>
                <div>
                  <p className="font-semibold text-sm">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.university}</p>
                </div>
                <Button size="sm" variant="outline" className="ml-auto">Follow</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
};

// --- EVENTS TAB COMPONENTS ---
const EventCard = React.memo(({ event }: { event: Event }) => {
  return (
    <Card className="overflow-hidden h-full flex flex-col transition-all duration-400 ease-snappy hover:shadow-glow-sm hover:-translate-y-2 group">
      <div className={cn("h-40 w-full flex flex-col justify-end p-4 text-white", event.coverGradient)}>
        <Badge className="w-fit bg-black/20 text-white backdrop-blur-sm">UPCOMING</Badge>
        <h3 className="mt-2 text-xl font-bold text-shadow-lg">{event.title}</h3>
      </div>
      <CardContent className="p-4 flex-grow flex flex-col">
        <div className="text-sm space-y-2">
          <p className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
          <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {event.isOnline ? `Online via Zoom` : event.location}</p>
        </div>
        <div className="mt-3">
          <p className="text-xs font-semibold text-muted-foreground">HOST</p>
          <div className="flex items-center gap-2 mt-1">
            <Avatar className="h-6 w-6"><AvatarImage src={event.host.avatar} /><AvatarFallback>{event.host.name.charAt(0)}</AvatarFallback></Avatar>
            <span className="text-sm font-medium">{event.host.name}</span>
          </div>
        </div>
        <div className="mt-3">
          <p className="text-xs font-semibold text-muted-foreground">SKILLS</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {event.skills.map(skill => <Badge key={skill.id} variant="secondary">{skill.name}</Badge>)}
          </div>
        </div>
        <div className="flex-grow" />
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center -space-x-2">
            {event.attendees.slice(0, 5).map(att => (
              <Avatar key={att.id} className="h-8 w-8 border-2 border-background">
                <AvatarImage src={att.avatar} />
                <AvatarFallback>{att.name.charAt(0)}</AvatarFallback>
              </Avatar>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">+{event.attendees.length - 5} going</p>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" className="w-full hover:bg-red-500/10 hover:text-red-500"><Heart className="mr-2" /> Interested</Button>
          <Button className="w-full font-bold gradient-bg text-primary-foreground">Register</Button>
        </div>
      </CardContent>
    </Card>
  )
});
EventCard.displayName = 'EventCard';

const EventsTab = () => {
  const featuredEvent = events[0];
  const filterChips = ['All', 'Online', 'In-Person', 'Workshop', 'Meetup'];
  const [activeFilter, setActiveFilter] = useState('All');

  return (
    <div className="space-y-6">
      <div className={cn("relative h-48 rounded-lg overflow-hidden p-8 flex flex-col justify-end text-white", featuredEvent.coverGradient)}>
        <h2 className="text-3xl font-bold font-headline">{featuredEvent.title}</h2>
        <p>{new Date(featuredEvent.date).toDateString()}</p>
        {/* Countdown timer could go here */}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {filterChips.map(chip => (
          <Button key={chip} variant={activeFilter === chip ? 'default' : 'outline'} onClick={() => setActiveFilter(chip)}>{chip}</Button>
        ))}
      </div>
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map(event => <motion.div variants={itemVariants} key={event.id}><EventCard event={event} /></motion.div>)}
      </motion.div>
    </div>
  )
}

// --- SKILL CIRCLES TAB ---
const CircleCard = React.memo(({ circle }: { circle: SkillCircle }) => {
  return (
    <Card className="h-full flex flex-col transition-all duration-400 ease-snappy hover:shadow-glow-sm hover:-translate-y-2 group">
      <CardContent className="p-6 flex-grow flex flex-col">
        <div className="flex justify-between items-start">
          <div className="p-3 glass-strong rounded-xl text-4xl shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)] group-hover:scale-110 transition-transform">{circle.icon}</div>
          <Badge variant={circle.activity.includes('Very Active') ? 'secondary' : circle.activity.includes('Quiet') ? 'destructive' : 'default'}>{circle.activity}</Badge>
        </div>
        <h3 className="mt-4 text-xl font-bold font-headline">{circle.name}</h3>
        <div className="flex flex-wrap gap-2 mt-2">
          {circle.skills.map(skill => <Badge key={skill.id} variant="outline">{skill.name}</Badge>)}
        </div>
        <div className="flex-grow" />
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center -space-x-2">
            {circle.members.slice(0, 5).map(m => <Avatar key={m.id} className="h-8 w-8"><AvatarImage src={m.avatar} /><AvatarFallback>{m.name.charAt(0)}</AvatarFallback></Avatar>)}
          </div>
          <p className="text-sm font-medium">{circle.memberCount} members</p>
        </div>
        <div className="mt-4 text-xs text-muted-foreground">Last session: {circle.lastSession}</div>
        <div className="mt-4 flex gap-2">
          <Button variant="ghost" className="w-full">Preview</Button>
          <Button className="w-full font-bold gradient-bg text-primary-foreground">Join Circle</Button>
        </div>
      </CardContent>
    </Card>
  );
});
CircleCard.displayName = 'CircleCard';

const SkillCirclesTab = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Join Skill Circles</h2>
        <p className="text-muted-foreground">Exchange skills and grow together in topic-focused groups.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="border-0 bg-transparent flex flex-col items-center justify-center text-center p-6 min-h-[300px] cursor-pointer hover:shadow-glow-sm hover:-translate-y-2 transition-all duration-400 ease-snappy group relative overflow-hidden">
          <div className="absolute inset-0 border-2 border-dashed border-white/20 dark:border-white/10 rounded-2xl" />
          <div className="p-4 glass-strong rounded-full group-hover:bg-primary/20 group-hover:text-primary transition-colors z-10"><Plus className="h-8 w-8" /></div>
          <h3 className="mt-4 font-bold">Create New Circle</h3>
          <p className="text-sm text-muted-foreground">Start a new community</p>
        </Card>
        {skillCircles.map(circle => <CircleCard key={circle.id} circle={circle} />)}
      </div>
    </div>
  )
}

// --- DISCUSSIONS TAB ---
const DiscussionsTab = () => {
  const categories = ['All', 'General', 'Skill Tips', 'Success Stories', 'Help & Support', 'Announcements'];
  const [activeCategory, setActiveCategory] = useState('All');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <aside className="col-span-1">
        <Card>
          <CardContent className="p-4 space-y-1">
            {categories.map(cat => (
              <Button
                key={cat}
                variant={activeCategory === cat ? 'secondary' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </CardContent>
        </Card>
      </aside>
      <main className="col-span-1 lg:col-span-3 space-y-4">
        {discussions.map(d => (
          <Card key={d.id} className={cn("glass transition-all duration-400 hover:shadow-glow-sm hover:-translate-y-1 cursor-pointer", d.isPinned && "border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10")}>
            <CardContent className="p-4 flex items-start gap-4">
              <div className="flex flex-col items-center gap-1 p-2 rounded-md bg-muted/50">
                <ArrowUp className="h-4 w-4 cursor-pointer hover:text-primary" />
                <span className="font-bold text-sm">{d.upvotes}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {d.isPinned && <Badge variant="outline" className="border-amber-500 text-amber-600 gap-1"><Pin className="h-3 w-3" /> Pinned</Badge>}
                  <Badge variant="secondary">{d.category}</Badge>
                </div>
                <h3 className="font-bold font-headline mt-1 hover:underline cursor-pointer">{d.title}</h3>
                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1"><Avatar className="h-5 w-5"><AvatarImage src={d.author.avatar} /><AvatarFallback>{d.author.name.charAt(0)}</AvatarFallback></Avatar> {d.author.name}</div>
                  <span>{d.replies} replies</span>
                  <span>{d.views} views</span>
                  <span>{d.createdAt}</span>
                </div>
              </div>
              <Avatar className="ml-auto hidden sm:block"><AvatarImage src={allUsers.find(u => u.id === d.author.id)?.avatar} /></Avatar>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  )
}

// --- MAIN PAGE COMPONENT ---

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState(tabs[0].id);

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <h1 className="font-headline text-3xl font-bold tracking-tight text-gradient-animated bg-gradient-to-r from-primary via-secondary to-accent">Community Hub</h1>
          <Badge variant="outline" className="mt-2 md:mt-0 w-fit"><Circle className="mr-2 h-2 w-2 fill-green-500 text-green-500" />847 members online</Badge>
        </div>
        <p className="text-muted-foreground">Join discussions, attend events, and connect with other learners.</p>

        <div className="mt-6">
          <div className="relative border-b">
            <div className="flex space-x-2 overflow-x-auto pb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative flex-shrink-0 whitespace-nowrap py-2 px-3 font-medium transition-colors",
                    activeTab === tab.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <tab.icon className="mr-2 inline h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>
            <motion.div
              className="absolute bottom-0 h-0.5 bg-primary"
              layoutId="community-tab-underline"
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{
                width: `${100 / tabs.length}%`,
                left: `${(tabs.findIndex(t => t.id === activeTab) * (100 / tabs.length))}%`
              }}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-6"
            >
              {activeTab === 'feed' && <FeedTab />}
              {activeTab === 'events' && <EventsTab />}
              {activeTab === 'circles' && <SkillCirclesTab />}
              {activeTab === 'discussions' && <DiscussionsTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </DashboardLayout>
  );
}
