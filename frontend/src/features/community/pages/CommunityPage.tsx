import React, { useState, useEffect } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { motion, AnimatePresence } from 'framer-motion';
import { Rss, Calendar, Users, MessageSquare, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useSearchParams } from 'react-router-dom';
import { CommunityService } from '@/services/communityService';
import { appVisuals } from '@/lib/appVisuals';

// Decoupled tabs
import { FeedTab } from '../components/FeedTab';
import { EventsTab } from '../components/EventsTab';
import { SkillCirclesTab } from '../components/SkillCirclesTab';
import { DiscussionsTab } from '../components/DiscussionsTab';

const tabs = [
  { id: 'feed', label: 'Feed', icon: Rss },
  { id: 'events', label: 'Events', icon: Calendar },
  { id: 'circles', label: 'Skill Circles', icon: Users },
  { id: 'discussions', label: 'Discussions', icon: MessageSquare },
];

export default function CommunityPage() {
  useDocumentTitle('Community');
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(defaultTab && tabs.some((tab) => tab.id === defaultTab) ? defaultTab : tabs[0].id);
  const [onlineCount, setOnlineCount] = useState(0);
  const intentFilter = searchParams.get('intent') ?? undefined;

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tabs.some((item) => item.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    CommunityService.getOnlineCount()
      .then(r => setOnlineCount(r.count ?? 0))
      .catch(() => {});
    
    // Refresh online count every 2 minutes
    const timer = setInterval(() => {
      CommunityService.getOnlineCount()
        .then(r => setOnlineCount(r.count ?? 0))
        .catch(() => {});
    }, 120000);
    return () => clearInterval(timer);
  }, []);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', tabId);
      return next;
    });
  };

  return (
    <DashboardLayout>
      <div className="product-page space-y-5">
        <div className="product-header relative overflow-hidden">
          <div className="absolute inset-y-0 right-0 hidden w-[42%] md:block">
            <img src={appVisuals.communityCollaboration} alt="Members collaborating on skill exchange sessions" className="h-full w-full object-cover" loading="eager" />
            <div className="absolute inset-0 bg-gradient-to-r from-card via-card/65 to-transparent" />
          </div>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 relative z-10">
            <div className="max-w-xl">
              <h1 className="product-title">Community Hub</h1>
              <p className="product-subtitle">Join discussions, attend sessions, and connect with people trading skills across design, tech, language, business, and creative work.</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-background/50 border border-border">
              <Circle className="h-2 w-2 fill-green-500 text-green-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">{onlineCount} members online</span>
            </div>
          </div>
        </div>

        <div>
          <div className="product-toolbar">
            <div className="flex gap-4 overflow-x-auto custom-scrollbar">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    "product-tab flex flex-shrink-0 items-center gap-2 whitespace-nowrap outline-none relative",
                    activeTab === tab.id ? 'product-tab-active' : ''
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="community-tab-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ y: 20, opacity: 0, filter: 'blur(5px)' }}
              animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
              exit={{ y: -20, opacity: 0, filter: 'blur(5px)' }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="mt-5"
            >
              {activeTab === 'feed' && <FeedTab intentFilter={intentFilter} onlineCount={onlineCount} />}
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
