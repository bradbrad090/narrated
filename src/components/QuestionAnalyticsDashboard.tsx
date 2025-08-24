import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { QuestionTrackingService } from '@/services/QuestionTrackingService';
import { ConversationQuestion } from '@/types/questionTracking';
import { ConversationType } from '@/types/conversation';
import { 
  MessageSquare, 
  TrendingUp, 
  Filter, 
  Search, 
  Calendar,
  BarChart3,
  PieChart,
  Hash,
  Star,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from 'lucide-react';

interface QuestionAnalyticsDashboardProps {
  userId: string;
  bookId: string;
  onQuestionSelect?: (question: ConversationQuestion) => void;
}

interface QuestionStats {
  totalQuestions: number;
  uniqueQuestions: number;
  questionsByType: Record<ConversationType, number>;
  averageQuality: number;
}

const QuestionAnalyticsDashboard: React.FC<QuestionAnalyticsDashboardProps> = ({
  userId,
  bookId,
  onQuestionSelect
}) => {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<ConversationQuestion[]>([]);
  const [stats, setStats] = useState<QuestionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<ConversationType | 'all'>('all');
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [ratingQuestion, setRatingQuestion] = useState<string | null>(null);

  const questionTrackingService = new QuestionTrackingService();

  useEffect(() => {
    loadQuestionData();
  }, [userId, bookId]);

  const loadQuestionData = async () => {
    try {
      setLoading(true);
      
      // Load questions and stats in parallel
      const [questionsData, statsData] = await Promise.all([
        questionTrackingService.getQuestionHistory(userId, bookId),
        questionTrackingService.getQuestionStats(userId, bookId)
      ]);

      setQuestions(questionsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading question data:', error);
      toast({
        title: "Error loading questions",
        description: "Failed to load question analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRateQuestion = async (questionId: string, rating: number) => {
    try {
      const success = await questionTrackingService.rateQuestionResponse(questionId, rating);
      
      if (success) {
        // Update local state
        setQuestions(prev => 
          prev.map(q => 
            q.id === questionId 
              ? { ...q, response_quality: rating }
              : q
          )
        );
        
        // Refresh stats
        const newStats = await questionTrackingService.getQuestionStats(userId, bookId);
        setStats(newStats);
        
        toast({
          title: "Rating saved",
          description: "Question response quality has been updated",
        });
      }
    } catch (error) {
      console.error('Error rating question:', error);
      toast({
        title: "Error saving rating",
        description: "Failed to save question rating",
        variant: "destructive",
      });
    } finally {
      setRatingQuestion(null);
    }
  };

  const filteredQuestions = questions.filter(question => {
    const matchesSearch = question.question_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (question.semantic_keywords || []).some(keyword => 
                           keyword.toLowerCase().includes(searchTerm.toLowerCase())
                         );
    const matchesType = selectedType === 'all' || question.conversation_type === selectedType;
    
    return matchesSearch && matchesType;
  });

  const getTypeColor = (type: ConversationType) => {
    switch (type) {
      case 'interview':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'reflection':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'brainstorming':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderStarRating = (questionId: string, currentRating?: number) => {
    const stars = [1, 2, 3, 4, 5];
    
    return (
      <div className="flex items-center gap-1">
        {stars.map(star => (
          <button
            key={star}
            onClick={() => handleRateQuestion(questionId, star)}
            className={`w-4 h-4 ${
              currentRating && star <= currentRating
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300 hover:text-yellow-400'
            } transition-colors`}
          >
            <Star className="w-full h-full" />
          </button>
        ))}
        {currentRating && (
          <span className="text-sm text-muted-foreground ml-2">
            {currentRating}/5
          </span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading question analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            Question Analytics
          </h2>
          <p className="text-muted-foreground">
            Track and analyze questions from your conversations
          </p>
        </div>
        <Button onClick={loadQuestionData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
              <Hash className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalQuestions}</div>
              <p className="text-xs text-muted-foreground">
                Across all conversations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Questions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.uniqueQuestions}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalQuestions > 0 ? 
                  `${Math.round((stats.uniqueQuestions / stats.totalQuestions) * 100)}% unique` :
                  'No duplicates detected'
                }
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Quality</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.averageQuality > 0 ? stats.averageQuality.toFixed(1) : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                Based on rated responses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Most Active Type</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.entries(stats.questionsByType).reduce(
                  (max, [type, count]) => count > max.count ? { type, count } : max,
                  { type: 'None', count: 0 }
                ).type}
              </div>
              <p className="text-xs text-muted-foreground">
                Conversation type with most questions
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search questions or keywords..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedType} onValueChange={(value) => setSelectedType(value as ConversationType | 'all')}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="interview">Interview</SelectItem>
                <SelectItem value="reflection">Reflection</SelectItem>
                <SelectItem value="brainstorming">Brainstorming</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Questions List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Questions ({filteredQuestions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredQuestions.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || selectedType !== 'all' 
                  ? 'No questions match your filters'
                  : 'No questions tracked yet'
                }
              </p>
              {!searchTerm && selectedType === 'all' && (
                <p className="text-sm text-muted-foreground mt-2">
                  Start a conversation to see questions appear here
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQuestions.map((question) => (
                <div
                  key={question.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge 
                          variant="secondary"
                          className={getTypeColor(question.conversation_type)}
                        >
                          {question.conversation_type}
                        </Badge>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDate(question.asked_at)}
                        </div>
                      </div>
                      
                      <p className="text-sm font-medium mb-2 leading-relaxed">
                        {question.question_text}
                      </p>
                      
                      {question.semantic_keywords && question.semantic_keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {question.semantic_keywords.slice(0, expandedQuestion === question.id ? undefined : 3).map((keyword, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                          {question.semantic_keywords.length > 3 && expandedQuestion !== question.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-2 text-xs"
                              onClick={() => setExpandedQuestion(question.id)}
                            >
                              +{question.semantic_keywords.length - 3} more
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Rating Section */}
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Rate response quality:</span>
                          {ratingQuestion === question.id ? (
                            <div className="flex items-center gap-2">
                              {renderStarRating(question.id, question.response_quality)}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setRatingQuestion(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {question.response_quality ? (
                                <div className="flex items-center gap-1">
                                  {renderStarRating(question.id, question.response_quality)}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setRatingQuestion(question.id)}
                                  >
                                    Change
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setRatingQuestion(question.id)}
                                >
                                  Rate
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {onQuestionSelect && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onQuestionSelect(question)}
                        >
                          Use Question
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedQuestion(
                          expandedQuestion === question.id ? null : question.id
                        )}
                      >
                        {expandedQuestion === question.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedQuestion === question.id && (
                    <div className="mt-4 pt-4 border-t space-y-2 text-sm text-muted-foreground">
                      <div>
                        <strong>Session ID:</strong> {question.conversation_session_id || 'N/A'}
                      </div>
                      <div>
                        <strong>Question Hash:</strong> <code className="text-xs">{question.question_hash}</code>
                      </div>
                      {question.chapter_id && (
                        <div>
                          <strong>Chapter ID:</strong> {question.chapter_id}
                        </div>
                      )}
                      <div>
                        <strong>Created:</strong> {formatDate(question.created_at)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QuestionAnalyticsDashboard;