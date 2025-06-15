import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Check, Copy, RotateCcw, X, CheckCheck } from "lucide-react";
import type { AiReply } from "@shared/schema";

interface AiResponseDisplayProps {
  reply: AiReply;
  onRegenerate: () => void;
  onClear: () => void;
  isRegenerating: boolean;
}

export function AiResponseDisplay({ reply, onRegenerate, onClear, isRegenerating }: AiResponseDisplayProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(reply.content);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  return (
    <Card className="slide-up">
      <CardContent className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <Bot className="w-5 h-5 mr-2" />
            AI Generated Reply
          </h3>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
              <Check className="w-3 h-3 mr-1" />
              Generated
            </Badge>
            <Badge variant="outline" className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              {reply.wordCount} words
            </Badge>
          </div>
        </div>

        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-gray-50 dark:bg-gray-900 mb-6">
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap m-0">
              {reply.content}
            </p>
          </div>
        </div>

        {/* Post-Generation Actions */}
        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200 flex items-center"
          >
            <RotateCcw className={`w-4 h-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
            {isRegenerating ? 'Regenerating...' : 'Regenerate Reply'}
          </Button>
          
          <Button
            onClick={handleCopyToClipboard}
            variant="secondary"
            className={`px-4 py-2 font-medium rounded-lg transition-all duration-200 flex items-center ${
              copySuccess 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-gray-600 hover:bg-gray-700 text-white'
            }`}
          >
            {copySuccess ? (
              <>
                <CheckCheck className="w-4 h-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy to Clipboard
              </>
            )}
          </Button>
          
          <Button
            onClick={onClear}
            variant="outline"
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium rounded-lg transition-all duration-200 flex items-center"
          >
            <X className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
