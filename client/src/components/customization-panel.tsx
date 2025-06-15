import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Settings, Wand2 } from "lucide-react";
import type { CustomizationData } from "@shared/schema";

interface CustomizationPanelProps {
  onGenerate: (customization: CustomizationData) => void;
  isGenerating: boolean;
}

export function CustomizationPanel({ onGenerate, isGenerating }: CustomizationPanelProps) {
  const [direction, setDirection] = useState("");
  const [length, setLength] = useState("medium");
  const [customLength, setCustomLength] = useState<number>(50);
  const [mood, setMood] = useState("comforting");
  const [customMood, setCustomMood] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!direction.trim()) {
      alert("Please provide direction for your comment");
      return;
    }
    
    const customization: CustomizationData = {
      direction: direction.trim(),
      length: length as "small" | "medium" | "long" | "custom",
      customLength: length === "custom" ? customLength : undefined,
      mood: mood as "witty" | "comforting" | "sad" | "custom",
      customMood: mood === "custom" ? customMood : undefined,
    };
    
    onGenerate(customization);
  };

  return (
    <Card className="mb-8 slide-up">
      <CardContent className="p-8">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          Customize Your Reply
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Direction Input */}
          <div>
            <Label htmlFor="direction" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              What direction should your comment take?
            </Label>
            <Textarea
              id="direction"
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              placeholder="e.g., Provide a helpful technical explanation, Share a different perspective, Ask clarifying questions..."
              className="min-h-[80px] resize-none"
              required
            />
          </div>

          {/* Reply Length Selector */}
          <div>
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">
              Reply Length
            </Label>
            <RadioGroup value={length} onValueChange={setLength} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { value: "small", label: "Small", desc: "≤20 words" },
                { value: "medium", label: "Medium", desc: "~50 words" },
                { value: "long", label: "Long", desc: "~100 words" },
                { value: "custom", label: "Custom", desc: "Set words" },
              ].map((option) => (
                <Label key={option.value} className="relative cursor-pointer">
                  <RadioGroupItem value={option.value} className="sr-only" />
                  <div className={`px-4 py-3 border rounded-lg text-center transition-all hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    length === option.value 
                      ? 'bg-blue-600 text-white border-blue-600' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm opacity-75">{option.desc}</div>
                  </div>
                </Label>
              ))}
            </RadioGroup>
            
            {length === "custom" && (
              <div className="mt-3">
                <Input
                  type="number"
                  value={customLength}
                  onChange={(e) => setCustomLength(Number(e.target.value))}
                  placeholder="Enter word count"
                  min={5}
                  max={500}
                  className="w-32"
                />
              </div>
            )}
          </div>

          {/* Mood Selector */}
          <div>
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">
              Reply Mood
            </Label>
            <RadioGroup value={mood} onValueChange={setMood} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              {[
                { value: "witty", label: "Witty", icon: "😄" },
                { value: "comforting", label: "Comforting", icon: "❤️" },
                { value: "sad", label: "Sad", icon: "😢" },
                { value: "custom", label: "Custom", icon: "✏️" },
              ].map((option) => (
                <Label key={option.value} className="relative cursor-pointer">
                  <RadioGroupItem value={option.value} className="sr-only" />
                  <div className={`px-4 py-3 border rounded-lg text-center transition-all hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    mood === option.value 
                      ? 'bg-blue-600 text-white border-blue-600' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    <div className="text-lg mb-1">{option.icon}</div>
                    <div className="font-medium">{option.label}</div>
                  </div>
                </Label>
              ))}
            </RadioGroup>
            
            {mood === "custom" && (
              <Input
                value={customMood}
                onChange={(e) => setCustomMood(e.target.value)}
                placeholder="Describe the mood/tone (e.g., professional, sarcastic, encouraging...)"
                className="w-full"
              />
            )}
          </div>

          {/* Generate Button */}
          <div className="pt-4">
            <Button 
              type="submit" 
              disabled={isGenerating}
              className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5 mr-2" />
                  Create Reply
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
