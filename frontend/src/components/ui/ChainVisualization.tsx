
'use client';

import React from 'react';
import type { SkillChain, User } from '@/types';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

interface ChainVisualizationProps {
  chain: SkillChain;
  highlightUserId?: string;
  size?: 'sm' | 'lg';
  animated?: boolean;
  className?: string;
}

const containerSizes = {
  sm: 200,
  lg: 400,
};

const nodePositions = {
  2: [
    { top: '50%', left: '0%', transform: 'translateY(-50%)' },
    { top: '50%', left: '100%', transform: 'translate(-100%, -50%)' },
  ],
  3: [
    { top: '0%', left: '50%', transform: 'translateX(-50%)' },
    { top: '100%', left: '0%', transform: 'translateY(-100%)' },
    { top: '100%', left: '100%', transform: 'translate(-100%, -100%)' },
  ],
  4: [
    { top: '0%', left: '50%', transform: 'translateX(-50%)' },
    { top: '50%', left: '0%', transform: 'translateY(-50%)' },
    { top: '100%', left: '50%', transform: 'translateX(-50%)' },
    { top: '50%', left: '100%', transform: 'translate(-100%, -50%)' },
  ],
};

export function ChainVisualization({
  chain,
  highlightUserId,
  size = 'lg',
  animated = true,
  className,
}: ChainVisualizationProps) {
  const { members, skills } = chain;
  const numMembers = members.length;
  const positions = nodePositions[numMembers as keyof typeof nodePositions] || [];
  const containerSize = containerSizes[size];

  if (numMembers < 2 || numMembers > 4) {
    // Fallback for unsupported member counts
    return (
      <div className={cn('flex flex-wrap gap-4', className)}>
        {members.map((member) => (
          <UserAvatar key={member.id} user={member} />
        ))}
      </div>
    );
  }

  const svgArrowPath = (from: {x: number, y: number}, to: {x: number, y: number}) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const gap = 35;
    const len = Math.sqrt(dx*dx + dy*dy);
    const p1 = {x: from.x + dx*gap/len, y: from.y + dy*gap/len};
    const p2 = {x: to.x - dx*gap/len, y: to.y - dy*gap/len};
    return `M${p1.x},${p1.y} L${p2.x},${p2.y}`;
  }

  const getCoords = (style: React.CSSProperties) => {
    return {
        x: parseFloat((style.left as string).replace('%', '')) / 100 * containerSize,
        y: parseFloat((style.top as string).replace('%', '')) / 100 * containerSize,
    }
  }
  
  return (
    <div
      className={cn('relative', className)}
      style={{ width: containerSize, height: containerSize }}
    >
      {/* SVG Arrows */}
      <svg className="absolute top-0 left-0 w-full h-full overflow-visible">
         <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" className="fill-primary" />
            </marker>
        </defs>
        {positions.map((_, i) => {
          const fromNode = positions[i];
          const toNode = positions[(i + 1) % numMembers];
          const path = svgArrowPath(getCoords(fromNode as React.CSSProperties), getCoords(toNode as React.CSSProperties));
          
          return (
             <motion.path
                key={i}
                d={path}
                className="stroke-primary"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
                initial={{ pathLength: animated ? 0 : 1 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, delay: i * 0.3, ease: 'easeInOut' }}
            />
          )
        })}
      </svg>
      
      {/* User Nodes */}
      {members.map((member, index) => {
        const skillTaught = skills[index];
        const isHighlighted = member.id === highlightUserId;

        return (
          <div key={member.id} className="absolute" style={positions[index]}>
            <div className="flex flex-col items-center gap-1">
              <UserAvatar
                user={member}
                size={size === 'sm' ? 'md' : 'lg'}
                className={cn(isHighlighted && 'ring-4 ring-offset-2 ring-offset-background ring-primary')}
              />
              <p className="text-xs font-bold truncate max-w-[60px]">{member.name.split(' ')[0]}</p>
              {skillTaught && <p className="text-xs text-muted-foreground">{skillTaught.name}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
