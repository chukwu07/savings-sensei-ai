import { useState, useEffect, useCallback } from 'react';
import { AchievementType } from '@/components/enhanced/AchievementBadge';

interface Achievement {
  type: AchievementType;
  earned: boolean;
  progress: number;
  dateEarned?: string;
}

interface AchievementCriteria {
  goalsCreated: number;
  goalsCompleted: number;
  savingStreak: number;
  budgetStreak: number;
  transactionStreak: number;
  milestonesReached: number;
  smartDecisions: number;
}

export function useAchievements() {
  const [achievements, setAchievements] = useState<Achievement[]>([
    { type: 'first-goal', earned: false, progress: 0 },
    { type: 'consistent-saver', earned: false, progress: 0 },
    { type: 'budget-master', earned: false, progress: 0 },
    { type: 'goal-crusher', earned: false, progress: 0 },
    { type: 'streak-hero', earned: false, progress: 0 },
    { type: 'spending-sage', earned: false, progress: 0 },
    { type: 'milestone-achiever', earned: false, progress: 0 },
    { type: 'financial-ninja', earned: false, progress: 0 },
  ]);

  const checkAchievements = useCallback((criteria: AchievementCriteria) => {
    setAchievements(prev => prev.map(achievement => {
      const newAchievement = { ...achievement };

      switch (achievement.type) {
        case 'first-goal':
          newAchievement.progress = Math.min(100, (criteria.goalsCreated / 1) * 100);
          if (criteria.goalsCreated >= 1 && !achievement.earned) {
            newAchievement.earned = true;
            newAchievement.dateEarned = new Date().toISOString();
          }
          break;

        case 'consistent-saver':
          newAchievement.progress = Math.min(100, (criteria.savingStreak / 7) * 100);
          if (criteria.savingStreak >= 7 && !achievement.earned) {
            newAchievement.earned = true;
            newAchievement.dateEarned = new Date().toISOString();
          }
          break;

        case 'budget-master':
          newAchievement.progress = Math.min(100, (criteria.budgetStreak / 30) * 100);
          if (criteria.budgetStreak >= 30 && !achievement.earned) {
            newAchievement.earned = true;
            newAchievement.dateEarned = new Date().toISOString();
          }
          break;

        case 'goal-crusher':
          newAchievement.progress = Math.min(100, (criteria.goalsCompleted / 3) * 100);
          if (criteria.goalsCompleted >= 3 && !achievement.earned) {
            newAchievement.earned = true;
            newAchievement.dateEarned = new Date().toISOString();
          }
          break;

        case 'streak-hero':
          newAchievement.progress = Math.min(100, (criteria.transactionStreak / 30) * 100);
          if (criteria.transactionStreak >= 30 && !achievement.earned) {
            newAchievement.earned = true;
            newAchievement.dateEarned = new Date().toISOString();
          }
          break;

        case 'spending-sage':
          newAchievement.progress = Math.min(100, (criteria.smartDecisions / 10) * 100);
          if (criteria.smartDecisions >= 10 && !achievement.earned) {
            newAchievement.earned = true;
            newAchievement.dateEarned = new Date().toISOString();
          }
          break;

        case 'milestone-achiever':
          newAchievement.progress = Math.min(100, (criteria.milestonesReached / 5) * 100);
          if (criteria.milestonesReached >= 5 && !achievement.earned) {
            newAchievement.earned = true;
            newAchievement.dateEarned = new Date().toISOString();
          }
          break;

        case 'financial-ninja':
          // Master achievement - requires multiple other achievements
          const earnedCount = prev.filter(a => a.earned && a.type !== 'financial-ninja').length;
          newAchievement.progress = Math.min(100, (earnedCount / 6) * 100);
          if (earnedCount >= 6 && !achievement.earned) {
            newAchievement.earned = true;
            newAchievement.dateEarned = new Date().toISOString();
          }
          break;
      }

      return newAchievement;
    }));
  }, []);

  const getEarnedAchievements = () => {
    return achievements.filter(a => a.earned);
  };

  const getProgressAchievements = () => {
    return achievements.filter(a => !a.earned && a.progress > 0);
  };

  const getRecentlyEarned = (days: number = 7) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    return achievements.filter(a => 
      a.earned && 
      a.dateEarned && 
      new Date(a.dateEarned) > cutoff
    );
  };

  const getTotalScore = () => {
    return achievements.reduce((total, achievement) => {
      if (achievement.earned) return total + 100;
      return total + achievement.progress;
    }, 0);
  };

  return {
    achievements,
    checkAchievements,
    getEarnedAchievements,
    getProgressAchievements,
    getRecentlyEarned,
    getTotalScore
  };
}