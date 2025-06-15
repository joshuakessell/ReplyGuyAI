import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle, Info } from "lucide-react";

interface ManualInputDialogProps {
  onSubmit: (data: {
    url: string;
    title: string;
    content: string;
    author: string;
    subreddit: string;
    upvotes: number;
    comments: number;
  }) => void;
  isSubmitting: boolean;
}

export function ManualInputDialog({ onSubmit, isSubmitting }: ManualInputDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    url: "",
    title: "",
    content: "",
    author: "",
    subreddit: "",
    upvotes: 0,
    comments: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.url || !formData.title || !formData.content) {
      alert("Please fill in URL, title, and content fields");
      return;
    }
    
    onSubmit(formData);
    setOpen(false);
    setFormData({
      url: "",
      title: "",
      content: "",
      author: "",
      subreddit: "",
      upvotes: 0,
      comments: 0,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto">
          <PlusCircle className="w-4 h-4 mr-2" />
          Enter Reddit Content Manually
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Reddit Content Manually</DialogTitle>
          <DialogDescription>
            If Reddit is blocking automatic fetching, you can copy and paste the content here.
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
          <div className="flex">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">How to get Reddit content:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Go to the Reddit post in your browser</li>
                <li>Copy the URL, title, and main content</li>
                <li>Fill in the form below</li>
                <li>Click "Add Content" to proceed with AI generation</li>
              </ol>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="url">Reddit URL *</Label>
            <Input
              id="url"
              type="url"
              value={formData.url}
              onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
              placeholder="https://www.reddit.com/r/example/comments/..."
              required
            />
          </div>

          <div>
            <Label htmlFor="title">Post Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter the Reddit post title"
              required
            />
          </div>

          <div>
            <Label htmlFor="content">Post Content *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Copy and paste the main content of the Reddit post or comment"
              className="min-h-[120px] resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                value={formData.author}
                onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                placeholder="u/username"
              />
            </div>
            <div>
              <Label htmlFor="subreddit">Subreddit</Label>
              <Input
                id="subreddit"
                value={formData.subreddit}
                onChange={(e) => setFormData(prev => ({ ...prev, subreddit: e.target.value }))}
                placeholder="r/example"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="upvotes">Upvotes</Label>
              <Input
                id="upvotes"
                type="number"
                value={formData.upvotes}
                onChange={(e) => setFormData(prev => ({ ...prev, upvotes: Number(e.target.value) }))}
                placeholder="0"
                min={0}
              />
            </div>
            <div>
              <Label htmlFor="comments">Comments</Label>
              <Input
                id="comments"
                type="number"
                value={formData.comments}
                onChange={(e) => setFormData(prev => ({ ...prev, comments: Number(e.target.value) }))}
                placeholder="0"
                min={0}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Content"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}