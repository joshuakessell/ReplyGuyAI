import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, MessageCircle, Check } from "lucide-react";
import type { RedditPost } from "@shared/schema";

interface RedditContentDisplayProps {
  post: RedditPost;
}

export function RedditContentDisplay({ post }: RedditContentDisplayProps) {
  return (
    <Card className="mb-8 slide-up">
      <CardContent className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <svg className="w-5 h-5 text-orange-500 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
            </svg>
            Reddit Content
          </h3>
          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
            <Check className="w-3 h-3 mr-1" />
            Loaded
          </Badge>
        </div>
        
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-gray-50 dark:bg-gray-900 max-h-80 overflow-y-auto">
          <div className="mb-4">
            <div className="flex items-center space-x-2 mb-3 text-sm">
              <span className="font-medium text-gray-600 dark:text-gray-400">
                r/{post.subreddit}
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500">Posted by u/{post.author}</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500">
                {post.createdAt ? new Date(post.createdAt).toLocaleString() : 'Recently'}
              </span>
            </div>
            
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              {post.title}
            </h4>
            
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {post.content || "No content available"}
            </p>
            
            <div className="flex items-center space-x-4 mt-4 text-sm text-gray-500">
              <span className="flex items-center">
                <ArrowUp className="w-4 h-4 mr-1" />
                {post.upvotes} upvotes
              </span>
              <span className="flex items-center">
                <MessageCircle className="w-4 h-4 mr-1" />
                {post.comments} comments
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
