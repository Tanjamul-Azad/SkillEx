import React from 'react';
import { Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Story, User } from '@/types';

interface StoryCircleProps {
  story?: Story;
  isSelf?: boolean;
  selfUser?: User | null;
}

export const StoryCircle = React.memo(({ story, isSelf, selfUser }: StoryCircleProps) => {
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
      <div className={cn("h-16 w-16 rounded-full p-0.5 flex items-center justify-center transition-all duration-300 group-hover:scale-105", story.isSeen ? 'bg-primary/10' : 'bg-gradient-to-tr from-primary to-secondary shadow-glow-sm')}>
        <Avatar className="h-[58px] w-[58px] border-2 border-background">
          <AvatarImage src={story.user.avatar} />
          <AvatarFallback>{story.user.name.charAt(0)}</AvatarFallback>
        </Avatar>
      </div>
      <span className="text-xs font-medium">{userName}</span>
    </div>
  );
});

StoryCircle.displayName = 'StoryCircle';
