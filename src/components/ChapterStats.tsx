import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, FileText, Target, TrendingUp } from 'lucide-react';

interface Chapter {
  id: string;
  content: string;
  updated_at: string;
}

interface ChapterStatsProps {
  chapters: Chapter[];
}

export const ChapterStats: React.FC<ChapterStatsProps> = ({ chapters }) => {
  const getStats = () => {
    const totalWords = chapters.reduce((sum, chapter) => {
      return sum + (chapter.content?.trim() ? chapter.content.trim().split(/\s+/).length : 0);
    }, 0);

    const completedChapters = chapters.filter(chapter => {
      const words = chapter.content?.trim() ? chapter.content.trim().split(/\s+/).length : 0;
      return words >= 500;
    }).length;

    const draftChapters = chapters.filter(chapter => {
      const words = chapter.content?.trim() ? chapter.content.trim().split(/\s+/).length : 0;
      return words > 0 && words < 500;
    }).length;

    const emptyChapters = chapters.filter(chapter => {
      return !chapter.content?.trim();
    }).length;

    const totalPages = Math.ceil(totalWords / 300);
    const completionRate = Math.round((completedChapters / chapters.length) * 100);

    return {
      totalWords,
      totalPages,
      completedChapters,
      draftChapters,
      emptyChapters,
      completionRate
    };
  };

  const stats = getStats();

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Book Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-primary">{stats.totalWords.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Total Words</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-primary">{stats.totalPages}</div>
            <div className="text-xs text-muted-foreground">Pages</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          <Badge variant="default" className="text-xs bg-green-100 text-green-700 hover:bg-green-100">
            {stats.completedChapters} Complete
          </Badge>
          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-100">
            {stats.draftChapters} Draft
          </Badge>
          <Badge variant="outline" className="text-xs">
            {stats.emptyChapters} Empty
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Completion</span>
            <span>{stats.completionRate}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-500"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};