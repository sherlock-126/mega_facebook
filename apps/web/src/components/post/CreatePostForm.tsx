'use client';

import { useState } from 'react';
import { Button, Card, CardContent, Textarea, Label, Input } from '@mega/ui';
import { createPost } from '@/lib/post-api';

interface CreatePostFormProps {
  onCreated?: () => void;
}

export function CreatePostForm({ onCreated }: CreatePostFormProps) {
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'FRIENDS_ONLY'>('PUBLIC');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !loading && (content.trim().length > 0 || files.length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      if (content.trim()) {
        formData.append('content', content.trim());
      }
      formData.append('visibility', visibility);
      files.forEach((f) => formData.append('files', f));

      await createPost(formData);
      setContent('');
      setFiles([]);
      setVisibility('PUBLIC');
      onCreated?.();
    } catch (err: any) {
      setError(err.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-4">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            maxLength={5000}
          />
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
              />
            </div>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as 'PUBLIC' | 'FRIENDS_ONLY')}
              className="rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="PUBLIC">Public</option>
              <option value="FRIENDS_ONLY">Friends Only</option>
            </select>
          </div>
          {files.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {files.length} file(s) selected
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={!canSubmit}>
            {loading ? 'Posting...' : 'Post'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
