import React, { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import type { EmblaCarouselType } from 'embla-carousel';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import type { Exchange } from '@/services/exchangeService';
import { appVisuals } from '@/lib/appVisuals';

interface SessionCarouselProps {
  exchanges: Exchange[];
  currentUserId: string;
}

const SKILL_IMAGES = [
  appVisuals.learningCodeSession,
  appVisuals.learningDesignReview,
  appVisuals.learningSpeakingSession,
];

const PLACEHOLDER_PROGRESS = [34, 48, 62];

export function SessionCarousel({ exchanges, currentUserId }: SessionCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    skipSnaps: false,
    dragFree: true,
  });

  const [prevBtnDisabled, setPrevBtnDisabled] = useState(true);
  const [nextBtnDisabled, setNextBtnDisabled] = useState(true);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const onSelect = useCallback((emblaApi: EmblaCarouselType) => {
    setPrevBtnDisabled(!emblaApi.canScrollPrev());
    setNextBtnDisabled(!emblaApi.canScrollNext());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect(emblaApi);
    emblaApi.on('reInit', onSelect);
    emblaApi.on('select', onSelect);
  }, [emblaApi, onSelect]);

  // Fallback items if NO active exchanges
  const items = exchanges.length > 0 ? exchanges : Array(3).fill(null).map((_, i) => ({
    id: `placeholder-${i}`,
    title: i === 0 ? 'React Essentials' : i === 1 ? 'Advanced Django' : 'UI/UX Fundamentals',
    partner: 'Skill partner',
    progress: PLACEHOLDER_PROGRESS[i % PLACEHOLDER_PROGRESS.length],
    image: SKILL_IMAGES[i % SKILL_IMAGES.length],
    placeholder: true
  }));

  return (
    <div className="relative w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold tracking-tight text-foreground/80 flex items-center gap-2">
          <Play className="h-4 w-4 text-primary" />
          Continue Learning
        </h3>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 rounded-full border-border/50"
            onClick={scrollPrev}
            disabled={prevBtnDisabled}
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 rounded-full border-border/50"
            onClick={scrollNext}
            disabled={nextBtnDisabled}
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl" ref={emblaRef}>
        <div className="flex backface-hidden touch-pan-y gap-4 pb-2">
          {items.map((item, i) => {
            const isPlaceholder = 'placeholder' in item;
            const title = isPlaceholder ? item.title : (item.requester.id === currentUserId ? item.wantedSkill?.name : item.offeredSkill?.name) || 'Skill Session';
            const progress = isPlaceholder ? item.progress : 45; // static 45 for demo purposes
            const imgSrc = isPlaceholder ? item.image : SKILL_IMAGES[i % SKILL_IMAGES.length];
            const partnerName = isPlaceholder ? item.partner : (item.requester.id === currentUserId ? item.receiver.name : item.requester.name);

            return (
              <motion.div
                key={item.id}
                className="relative min-w-[240px] max-w-[280px] flex-[0_0_80%] sm:flex-[0_0_40%] lg:flex-[0_0_30%]"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
              >
                <Card className="group h-full overflow-hidden border-border/50 bg-card hover:border-primary/30 transition-all duration-300">
                  <div className="relative h-32 w-full overflow-hidden">
                    <img 
                      src={imgSrc} 
                      alt="" 
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    
                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 scale-90 transition-all duration-300 group-hover:opacity-100 group-hover:scale-100">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-lg backdrop-blur-md">
                        <Play className="h-4 w-4 ml-0.5" />
                      </div>
                    </div>
                    
                    <div className="absolute bottom-2 left-3 right-3 text-white">
                      <span className="text-xs font-medium opacity-80">{partnerName}</span>
                      <p className="text-sm font-semibold truncate leading-tight mt-0.5">{title}</p>
                    </div>
                  </div>
                  
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground mb-1.5">
                      <span>Session Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-1.5 rounded-full bg-muted" indicatorClassName="bg-primary" />
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
