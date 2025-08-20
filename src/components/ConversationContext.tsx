import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  ChevronDown, 
  ChevronUp, 
  User, 
  Book, 
  FileText, 
  Target,
  RefreshCw,
  Settings
} from 'lucide-react';
import { ConversationContext as ContextType } from '@/hooks/useConversationFlow';

interface ConversationContextProps {
  context: ContextType | null;
  isLoading?: boolean;
  onRefreshContext?: () => void;
  className?: string;
}

export const ConversationContext: React.FC<ConversationContextProps> = ({
  context,
  isLoading = false,
  onRefreshContext,
  className = ""
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [includeProfile, setIncludeProfile] = useState(true);
  const [includeChapters, setIncludeChapters] = useState(true);
  const [includeThemes, setIncludeThemes] = useState(true);

  if (!context) {
    return (
      <Card className={`${className} w-full`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Settings className="h-4 w-4" />
            Conversation Context
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-4">
            No context available. Start a conversation to load context.
          </div>
        </CardContent>
      </Card>
    );
  }

  const { userProfile, bookProfile, currentChapter, recentChapters, lifeThemes } = context;

  return (
    <Card className={`${className} w-full`}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="flex items-center justify-between p-0 h-auto">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Settings className="h-4 w-4" />
                Conversation Context
              </CardTitle>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            
            {/* Context Controls */}
            <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <Label htmlFor="include-profile" className="text-xs font-medium">
                  Include Profile
                </Label>
                <Switch
                  id="include-profile"
                  checked={includeProfile}
                  onCheckedChange={setIncludeProfile}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="include-chapters" className="text-xs font-medium">
                  Include Chapters
                </Label>
                <Switch
                  id="include-chapters"
                  checked={includeChapters}
                  onCheckedChange={setIncludeChapters}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="include-themes" className="text-xs font-medium">
                  Include Life Themes
                </Label>
                <Switch
                  id="include-themes"
                  checked={includeThemes}
                  onCheckedChange={setIncludeThemes}
                />
              </div>

              {onRefreshContext && (
                <Button
                  onClick={onRefreshContext}
                  disabled={isLoading}
                  size="sm"
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw className={`h-3 w-3 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh Context
                </Button>
              )}
            </div>

            <ScrollArea className="h-[400px]">
              <div className="space-y-4 pr-2">
                
                {/* User Profile Section */}
                {includeProfile && userProfile && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <h4 className="text-sm font-medium">Profile</h4>
                    </div>
                    <div className="pl-6 space-y-2 text-sm">
                      {userProfile.full_name && (
                        <div>
                          <span className="font-medium">Name:</span> {userProfile.full_name}
                        </div>
                      )}
                      {userProfile.age && (
                        <div>
                          <span className="font-medium">Age:</span> {userProfile.age}
                        </div>
                      )}
                      {userProfile.email && (
                        <div className="text-xs text-muted-foreground">
                          {userProfile.email}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Book Profile Section */}
                {includeProfile && bookProfile && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Book className="h-4 w-4 text-muted-foreground" />
                      <h4 className="text-sm font-medium">Book Details</h4>
                    </div>
                    <div className="pl-6 space-y-2 text-sm">
                      {bookProfile.occupation && (
                        <div>
                          <span className="font-medium">Occupation:</span> {bookProfile.occupation}
                        </div>
                      )}
                      {bookProfile.birthplace && (
                        <div>
                          <span className="font-medium">Birthplace:</span> {bookProfile.birthplace}
                        </div>
                      )}
                      {bookProfile.current_location && (
                        <div>
                          <span className="font-medium">Current Location:</span> {bookProfile.current_location}
                        </div>
                      )}
                      {bookProfile.writing_style_preference && (
                        <div>
                          <span className="font-medium">Writing Style:</span> {bookProfile.writing_style_preference}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Current Chapter Section */}
                {includeChapters && currentChapter && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <h4 className="text-sm font-medium">Current Chapter</h4>
                    </div>
                    <div className="pl-6 space-y-2">
                      <div className="text-sm">
                        <span className="font-medium">
                          Chapter {currentChapter.chapter_number}: {currentChapter.title}
                        </span>
                      </div>
                      {currentChapter.content && (
                        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                          {currentChapter.content.substring(0, 200)}
                          {currentChapter.content.length > 200 && '...'}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Recent Chapters Section */}
                {includeChapters && recentChapters && recentChapters.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <h4 className="text-sm font-medium">Recent Chapters</h4>
                    </div>
                    <div className="pl-6 space-y-2">
                      {recentChapters.slice(0, 3).map((chapter, index) => (
                        <div key={chapter.id || index} className="text-sm">
                          <div className="font-medium">
                            Chapter {chapter.chapter_number}: {chapter.title}
                          </div>
                          {chapter.content && (
                            <div className="text-xs text-muted-foreground">
                              {chapter.content.substring(0, 100)}
                              {chapter.content.length > 100 && '...'}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Life Themes Section */}
                {includeThemes && lifeThemes && lifeThemes.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <h4 className="text-sm font-medium">Life Themes</h4>
                    </div>
                    <div className="pl-6">
                      <div className="flex flex-wrap gap-1">
                        {lifeThemes.map((theme, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {theme}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional Book Profile Details */}
                {includeProfile && bookProfile && (
                  <div className="space-y-2">
                    {bookProfile.personality_traits && bookProfile.personality_traits.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium text-muted-foreground mb-1">
                          Personality Traits
                        </h5>
                        <div className="flex flex-wrap gap-1 pl-2">
                          {bookProfile.personality_traits.map((trait: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {trait}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {bookProfile.hobbies_interests && bookProfile.hobbies_interests.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium text-muted-foreground mb-1">
                          Interests
                        </h5>
                        <div className="flex flex-wrap gap-1 pl-2">
                          {bookProfile.hobbies_interests.map((interest: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {interest}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </ScrollArea>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};