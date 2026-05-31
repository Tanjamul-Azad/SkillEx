import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, HelpCircle, Tag, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { CommunityService } from '@/services/communityService';
import { SkillService } from '@/services/skillService';
import type { Post, Skill } from '@/types';

const POST_TYPES = [
  { id: 'regular', label: 'Post', icon: MessageSquare },
  { id: 'question', label: 'Question', icon: HelpCircle },
  { id: 'showcase', label: 'Showcase', icon: Tag },
] as const;
const MAX_MEDIA_SIZE_BYTES = 20 * 1024 * 1024;

type PostType = typeof POST_TYPES[number]['id'];

interface PostComposerProps {
  onPost: (post: Post) => void;
}

export const PostComposer = React.memo(({ onPost }: PostComposerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<PostType>('regular');
  const [focused, setFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedPreview, setAttachedPreview] = useState<string | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [showSkillSelector, setShowSkillSelector] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    SkillService.getAll().then(setSkills).catch(() => {});
  }, []);

  const handleAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast({ title: 'Unsupported file', description: 'Attach an image or video file.', variant: 'destructive' });
        e.target.value = '';
        return;
      }
      if (file.size > MAX_MEDIA_SIZE_BYTES) {
        toast({ title: 'File too large', description: 'Please attach media under 20 MB.', variant: 'destructive' });
        e.target.value = '';
        return;
      }
      if (attachedPreview) {
        URL.revokeObjectURL(attachedPreview);
      }
      setAttachedFile(file);
      const url = URL.createObjectURL(file);
      setAttachedPreview(url);
      setFocused(true);
    }
  };

  useEffect(() => () => {
    if (attachedPreview) URL.revokeObjectURL(attachedPreview);
  }, [attachedPreview]);

  const handleSubmit = async () => {
    if (!content.trim() && !attachedFile) return;
    setSubmitting(true);
    try {
      let mediaUrl = undefined;
      if (attachedFile) {
        mediaUrl = await CommunityService.uploadMedia(attachedFile);
      }

      const typeMap: Record<PostType, string> = { regular: 'SHOWCASE', question: 'QUESTION', showcase: 'SHOWCASE' };
      const newPost = await CommunityService.createPost({
        type: typeMap[postType],
        content: content.trim(),
        mediaUrl: mediaUrl,
        skillId: selectedSkillId || undefined,
      });
      onPost(newPost);
      setContent('');
      setPostType('regular');
      setFocused(false);
      if (attachedPreview) {
        URL.revokeObjectURL(attachedPreview);
      }
      setAttachedPreview(null);
      setAttachedFile(null);
      setSelectedSkillId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Please try again.';
      toast({ title: 'Failed to post', description: message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedSkill = skills.find(s => s.id === selectedSkillId);

  return (
    <div className="overflow-hidden rounded-2xl border border-primary/15 bg-card shadow-sm">
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-4">
          <Avatar className="mt-0.5 shrink-0 ring-2 ring-primary/20 shadow-[0_0_15px_hsl(var(--primary)/0.2)]">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback className="font-bold bg-primary/20 text-primary">{user?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-4">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onFocus={() => setFocused(true)}
              placeholder="Share a skill tip, a win, or ask a question..."
              className="w-full resize-none appearance-none rounded-xl bg-background border border-primary/15 px-4 py-3 text-sm placeholder:text-muted-foreground/60 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all custom-scrollbar"
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
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
                    <div className="flex flex-wrap gap-2">
                      {POST_TYPES.map(({ id, label, icon: Icon }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setPostType(id)}
                          className={cn(
                            'flex items-center gap-2 rounded-xl px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold transition-all border outline-none',
                            postType === id
                              ? 'bg-primary/20 text-primary border-primary/30 shadow-[0_0_15px_hsl(var(--primary)/0.2)] scale-[1.02]'
                              : 'border-primary/15 bg-background text-muted-foreground hover:border-primary/35 hover:text-primary hover:bg-primary/5'
                          )}
                        >
                          <Icon className="h-3 w-3" />
                          {label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <DropdownMenu open={showSkillSelector} onOpenChange={setShowSkillSelector}>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className={cn(
                              "rounded-xl text-[10px] uppercase font-bold tracking-widest transition-all",
                              selectedSkillId ? "text-primary bg-primary/10 border border-primary/20" : "text-muted-foreground hover:bg-primary/5 hover:text-primary"
                            )}
                          >
                            <Tag className="mr-2 h-3 w-3" />
                            {selectedSkill ? selectedSkill.name : 'Tag Skill'}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-2xl border border-primary/20 bg-popover shadow-2xl p-2 max-h-64 overflow-y-auto custom-scrollbar">
                          <div className="px-2 py-1.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground border-b border-primary/10 mb-1">Select Skill</div>
                          <DropdownMenuItem onClick={() => setSelectedSkillId(null)} className="rounded-lg text-[10px] font-bold uppercase tracking-widest focus:bg-primary/10 focus:text-primary cursor-pointer">
                             No Skill
                          </DropdownMenuItem>
                          {skills.map(skill => (
                            <DropdownMenuItem 
                              key={skill.id} 
                              onClick={() => setSelectedSkillId(skill.id)}
                              className="rounded-lg text-[10px] font-bold uppercase tracking-widest focus:bg-primary/10 focus:text-primary cursor-pointer"
                            >
                              {skill.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <div className="flex items-center gap-3 ml-2 border-l border-primary/15 pl-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-xl text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:bg-primary/5 hover:text-primary transition-colors"
                          onClick={() => { 
                            setContent(''); 
                            setFocused(false); 
                            if (attachedPreview) URL.revokeObjectURL(attachedPreview);
                            setAttachedPreview(null); 
                            setAttachedFile(null);
                            setSelectedSkillId(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          disabled={(!content.trim() && !attachedFile) || submitting}
                          className="rounded-xl text-[10px] uppercase font-bold tracking-widest px-6 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_hsl(var(--primary)/0.2)] hover:shadow-[0_0_25px_hsl(var(--primary)/0.4)] transition-all"
                          onClick={handleSubmit}
                        >
                          {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Post'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Attached image/video preview */}
                  {attachedPreview && (
                    <div className="relative mt-4 rounded-xl overflow-hidden border border-primary/15 group/img shadow-sm">
                      {attachedFile?.type.startsWith('video/') ? (
                        <video src={attachedPreview} className="w-full max-h-52 object-cover opacity-80 group-hover/img:opacity-100 transition-opacity" muted loop playsInline autoPlay />
                      ) : (
                        <img src={attachedPreview} alt="attachment preview" className="w-full max-h-52 object-cover opacity-80 group-hover/img:opacity-100 transition-opacity" />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (attachedPreview) URL.revokeObjectURL(attachedPreview);
                          setAttachedPreview(null);
                          setAttachedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 hover:bg-destructive/80 text-foreground flex items-center justify-center transition-all backdrop-blur-md border border-primary/25 hover:border-destructive"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleAttach} />
        {!focused && (
          <div className="mt-4 flex justify-between border-t border-primary/10 pt-4">
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all" onClick={() => fileInputRef.current?.click()}>
                <ImageIcon className="mr-2 h-4 w-4" /> Photo / Video
              </Button>
              <Button variant="ghost" size="sm" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all" onClick={() => { setPostType('question'); setFocused(true); }}>
                <HelpCircle className="mr-2 h-4 w-4" /> Ask Question
              </Button>
              <Button variant="ghost" size="sm" className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all hidden sm:flex" onClick={() => { setPostType('showcase'); setFocused(true); }}>
                <Tag className="mr-2 h-4 w-4" /> Showcase
              </Button>
            </div>
            
            {selectedSkill && (
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 px-3 rounded-lg shadow-[0_0_10px_hsl(var(--primary)/0.1)]">
                <Tag className="h-3 w-3" /> {selectedSkill.name}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

PostComposer.displayName = 'PostComposer';
