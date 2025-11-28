"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Star, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface SearchSuggestion {
  id: number;
  name: string;
  avatar: string | null;
  rating: number | null;
  hourlyRate: number;
  occupation: string;
  verified: boolean;
}

interface MobileSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileSearchDialog({ open, onOpenChange }: MobileSearchDialogProps) {
  const router = useRouter();
  const [searchText, setSearchText] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Auto-focus input when dialog opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Fetch suggestions with debounce
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (searchText.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/tutors/search?q=${encodeURIComponent(searchText.trim())}`);
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchText]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (searchText.trim()) {
      router.push(`/tutors?search=${encodeURIComponent(searchText.trim())}`);
      onOpenChange(false);
      setSearchText("");
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = (tutorId: number) => {
    router.push(`/tutor/${tutorId}`);
    onOpenChange(false);
    setSearchText("");
    setSuggestions([]);
  };

  const handleClear = () => {
    setSearchText("");
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const getOccupationLabel = (occupation: string) => {
    const labels: Record<string, string> = {
      'Sinh viên': 'Sinh viên',
      'Giáo viên': 'Giáo viên',
      'Chuyên gia': 'Chuyên gia',
    };
    return labels[occupation] || 'Giáo viên';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0">
        <DialogHeader className="p-4 pb-3 border-b">
          <DialogTitle className="sr-only">Tìm kiếm giáo viên</DialogTitle>
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="search"
              placeholder="Tìm giáo viên theo tên, môn học..."
              className="pl-9 pr-20 h-12"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              autoComplete="off"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {isLoading && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-1" />
              )}
              {searchText && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={handleClear}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
        </DialogHeader>

        {/* Search Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {suggestions.length > 0 ? (
            <div className="p-2">
              <p className="text-xs text-muted-foreground px-2 py-1 mb-1">
                Gợi ý giáo viên
              </p>
              {suggestions.map((tutor) => (
                <button
                  key={tutor.id}
                  type="button"
                  className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-accent transition-colors text-left"
                  onClick={() => handleSelectSuggestion(tutor.id)}
                >
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    <AvatarImage src={tutor.avatar || undefined} alt={tutor.name} />
                    <AvatarFallback>{tutor.name[0]}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{tutor.name}</span>
                      {tutor.verified && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
                          ✓
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {tutor.rating !== null && (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span>{(tutor.rating / 10).toFixed(1)}</span>
                        </div>
                      )}
                      <span>{getOccupationLabel(tutor.occupation)}</span>
                      <span className="font-medium text-primary">
                        {tutor.hourlyRate.toLocaleString('vi-VN')}đ/h
                      </span>
                    </div>
                  </div>
                </button>
              ))}

              {/* View all results */}
              <div className="border-t mt-2 pt-2">
                <button
                  type="button"
                  className="w-full p-2 text-sm text-center text-primary hover:bg-accent rounded-md transition-colors"
                  onClick={handleSearch}
                >
                  Xem tất cả kết quả cho "{searchText}"
                </button>
              </div>
            </div>
          ) : searchText.trim().length >= 2 && !isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Không tìm thấy giáo viên nào</p>
              <p className="text-sm">Thử tìm kiếm với từ khóa khác</p>
            </div>
          ) : searchText.trim().length < 2 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nhập ít nhất 2 ký tự để tìm kiếm</p>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
