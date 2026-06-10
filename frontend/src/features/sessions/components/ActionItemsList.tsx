import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Trash2, Calendar } from 'lucide-react';
import type { ActionItem } from '@/services/flashcardService';

interface ActionItemsListProps {
  items: ActionItem[];
}

export default function ActionItemsList({ items }: ActionItemsListProps) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  const toggleComplete = (id: string) => {
    const newCompleted = new Set(completedIds);
    if (newCompleted.has(id)) {
      newCompleted.delete(id);
    } else {
      newCompleted.add(id);
    }
    setCompletedIds(newCompleted);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'bg-blue-100 text-blue-700';
      case 'MEDIUM': return 'bg-amber-100 text-amber-700';
      case 'HIGH': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getOwnerColor = (owner: string) => {
    if (owner.toLowerCase().includes('learner')) {
      return 'bg-indigo-100 text-indigo-700';
    } else if (owner.toLowerCase().includes('teacher')) {
      return 'bg-purple-100 text-purple-700';
    }
    return 'bg-slate-100 text-slate-700';
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const daysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diff = due.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  };

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 rounded-lg border border-dashed border-slate-300 bg-slate-50">
        <p className="text-slate-500 text-center">
          No action items extracted from this session.
        </p>
      </div>
    );
  }

  const completedCount = completedIds.size;
  const completionPercentage = (completedCount / items.length) * 100;

  return (
    <div className="space-y-6">
      {/* Header with Progress */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Action Items</h3>
            <p className="text-sm text-slate-500">
              {completedCount} of {items.length} completed
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
            initial={{ width: 0 }}
            animate={{ width: `${completionPercentage}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-3">
        <AnimatePresence>
          {items.map((item, index) => {
            const isCompleted = completedIds.has(item.id);
            const overdue = isOverdue(item.dueDate);
            const daysLeft = daysUntilDue(item.dueDate);

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isCompleted
                    ? 'bg-slate-50 border-slate-200'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox */}
                  <motion.button
                    onClick={() => toggleComplete(item.id)}
                    className="flex-shrink-0 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={24} className="text-emerald-600" />
                    ) : (
                      <Circle size={24} className="text-slate-300 hover:text-slate-400" />
                    )}
                  </motion.button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <p
                        className={`font-medium break-words ${
                          isCompleted
                            ? 'text-slate-500 line-through'
                            : 'text-slate-900'
                        }`}
                      >
                        {item.description}
                      </p>
                    </div>

                    {/* Tags */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getOwnerColor(item.owner)}`}>
                        {item.owner}
                      </span>
                      <div
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          overdue
                            ? 'bg-red-100 text-red-700'
                            : daysLeft <= 1
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        <Calendar size={12} />
                        <span>
                          {overdue
                            ? 'Overdue'
                            : daysLeft === 0
                            ? 'Today'
                            : daysLeft === 1
                            ? 'Tomorrow'
                            : `${daysLeft}d`}
                        </span>
                      </div>
                    </div>

                    {/* Full date on hover/expansion */}
                    <p className="text-xs text-slate-500 mt-2">
                      Due: {formatDate(item.dueDate)}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Completion Encouragement */}
      <AnimatePresence>
        {completedCount === items.length && items.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-center"
          >
            <p className="text-emerald-700 font-semibold">
              All action items completed! Great progress!
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
