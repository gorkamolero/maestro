import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { spacesActions } from "@/stores/spaces.store";
import type { Segment, SegmentType, SegmentStatus } from '@/types';
import { Terminal, Globe, Bot, FileText, ExternalLink, Clock, Trash2 } from 'lucide-react';

interface SegmentEditorProps {
  segment: Segment | null;
  onClose: () => void;
}


const SEGMENT_TYPES: { value: SegmentType; label: string; icon: any }[] = [
  { value: 'terminal', label: 'Terminal', icon: Terminal },
  { value: 'browser', label: 'Browser', icon: Globe },
  { value: 'agent', label: 'Agent', icon: Bot },
  { value: 'note', label: 'Note', icon: FileText },
  { value: 'external', label: 'External', icon: ExternalLink },
  { value: 'planted', label: 'Planted', icon: Clock },
];

const SEGMENT_STATUSES: { value: SegmentStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'agent-working', label: 'Agent Working' },
  { value: 'scheduled', label: 'Scheduled' },
];

export function SegmentEditor({ segment, onClose }: SegmentEditorProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<SegmentType>('note');
  const [status, setStatus] = useState<SegmentStatus>('active');

  useEffect(() => {
    if (segment) {
      setTitle(segment.title);
      setType(segment.type);
      setStatus(segment.status);
    }
  }, [segment]);

  const handleSave = () => {
    if (!segment) return;

    spacesActions.updateSegment(segment.spaceId, segment.id, {
      title,
      type,
      status,
    });

    onClose();
  };

  const handleDelete = () => {
    if (!segment) return;

    spacesActions.removeSegment(segment.spaceId, segment.id);
    onClose();
  };

  return (
    <Dialog open={!!segment} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Segment</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Segment title"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="type">Type</Label>
            <Select value={type} onValueChange={(value) => setType(value as SegmentType)}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEGMENT_TYPES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {t.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as SegmentStatus)}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SEGMENT_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 pt-2">
            <div className="text-xs text-muted-foreground">
              Started: {segment?.startTime.toLocaleString()}
              {segment?.endTime && (
                <>
                  <br />
                  Ended: {segment.endTime.toLocaleString()}
                </>
              )}
            </div>
          </div>
        </div>
        <DialogFooter className="flex justify-between">
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
