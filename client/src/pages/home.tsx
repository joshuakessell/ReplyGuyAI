import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search, Moon, Sun, HelpCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isValidRedditUrl, normalizeRedditUrl } from "@/lib/reddit-utils";
import { useTheme } from "@/components/theme-provider";
import { RedditContentDisplay } from "@/components/reddit-content-display";
import { CustomizationPanel } from "@/components/customization-panel";
import { AiResponseDisplay } from "@/components/ai-response-display";
import { useToast } from "@/hooks/use-toast";
import type { RedditPost, AiReply, CustomizationData } from "@shared/schema";

export default function Home() {
  const [redditUrl, setRedditUrl] = useState("");
  const [currentStep, setCurrentStep] = useState<"input" | "content" | "response">("input");
  const [fetchedPost, setFetchedPost] = useState<RedditPost | null>(null);
  const [generatedReply, setGeneratedReply] = useState<AiReply | null>(null);
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  // Fetch Reddit content mutation
  const fetchRedditMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", "/api/reddit/fetch", { url });
      return response.json();
    },
    onSuccess: (data: RedditPost) => {
      setFetchedPost(data);
      setCurrentStep("content");
      toast({
        title: "Reddit content loaded",
        description: "Content fetched successfully. You can now customize your reply.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to fetch Reddit content",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate AI reply mutation
  const generateReplyMutation = useMutation({
    mutationFn: async (data: { redditUrl: string; customization: CustomizationData }) => {
      const response = await apiRequest("POST", "/api/reply/generate", data);
      return response.json();
    },
    onSuccess: (data: AiReply) => {
      setGeneratedReply(data);
      setCurrentStep("response");
      toast({
        title: "Reply generated",
        description: `AI generated a ${data.wordCount}-word reply for you.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate reply",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!redditUrl.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a Reddit URL",
        variant: "destructive",
      });
      return;
    }
    
    if (!isValidRedditUrl(redditUrl)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid Reddit URL",
        variant: "destructive",
      });
      return;
    }
    
    const normalizedUrl = normalizeRedditUrl(redditUrl);
    fetchRedditMutation.mutate(normalizedUrl);
  };

  const handleGenerateReply = (customization: CustomizationData) => {
    if (!fetchedPost) return;
    
    generateReplyMutation.mutate({
      redditUrl: fetchedPost.url,
      customization,
    });
  };

  const handleRegenerate = () => {
    if (!fetchedPost || !generatedReply) return;
    
    // Use the same customization data to regenerate
    const customization: CustomizationData = {
      direction: generatedReply.direction || "",
      length: (generatedReply.length as "small" | "medium" | "long" | "custom") || "medium",
      mood: (generatedReply.mood as "witty" | "comforting" | "sad" | "custom") || "comforting",
    };
    
    generateReplyMutation.mutate({
      redditUrl: fetchedPost.url,
      customization,
    });
  };

  const handleClear = () => {
    if (confirm("Are you sure you want to clear everything and start over?")) {
      setRedditUrl("");
      setCurrentStep("input");
      setFetchedPost(null);
      setGeneratedReply(null);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
                </svg>
              </div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Reddit Reply AI</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="rounded-lg"
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5 text-yellow-500" />
                ) : (
                  <Moon className="h-5 w-5 text-gray-600" />
                )}
              </Button>
              <Button variant="ghost" className="text-sm font-medium text-blue-600 hover:text-blue-800">
                <HelpCircle className="w-4 h-4 mr-2" />
                Help
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <section className="text-center mb-12">
          <div className="mb-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Craft Perfect Reddit Replies
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Generate AI-powered responses to Reddit posts and comments. Customize tone, length, and direction for the perfect reply every time.
            </p>
          </div>

          <Card className="p-8 mb-8">
            <CardContent className="p-0">
              <form onSubmit={handleUrlSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="redditUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-left flex items-center">
                    <svg className="w-4 h-4 text-orange-500 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
                    </svg>
                    Paste a Reddit post or comment URL
                  </Label>
                  <div className="relative">
                    <Input
                      type="url"
                      id="redditUrl"
                      value={redditUrl}
                      onChange={(e) => setRedditUrl(e.target.value)}
                      placeholder="https://www.reddit.com/r/example/comments/..."
                      className="w-full px-4 py-4 text-lg pr-12"
                      required
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  disabled={fetchRedditMutation.isPending}
                  className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
                >
                  {fetchRedditMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Fetching content...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5 mr-2" />
                      Analyze Reddit Content
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        {/* Reddit Content Display */}
        {fetchedPost && (currentStep === "content" || currentStep === "response") && (
          <RedditContentDisplay post={fetchedPost} />
        )}

        {/* Customization Panel */}
        {fetchedPost && currentStep === "content" && (
          <CustomizationPanel 
            onGenerate={handleGenerateReply}
            isGenerating={generateReplyMutation.isPending}
          />
        )}

        {/* AI Response Display */}
        {generatedReply && currentStep === "response" && (
          <AiResponseDisplay
            reply={generatedReply}
            onRegenerate={handleRegenerate}
            onClear={handleClear}
            isRegenerating={generateReplyMutation.isPending}
          />
        )}

        {/* Processing Overlay */}
        {(fetchRedditMutation.isPending || generateReplyMutation.isPending) && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <Card className="max-w-sm mx-4">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4">
                  <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Processing...</h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {fetchRedditMutation.isPending 
                    ? "Fetching Reddit content..."
                    : "Analyzing content and generating your reply"
                  }
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
