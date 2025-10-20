"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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

export function SearchBar() {
  const router = useRouter();
  const [searchText, setSearchText] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch suggestions with debounce
  useEffect(() => {
    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Don't search if query is too short
    if (searchText.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);

    // Debounce the API call
    debounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/tutors/search?q=${encodeURIComponent(searchText.trim())}`);
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data);
          setIsOpen(data.length > 0);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsLoading(false);
      }
    }, 300); // 300ms debounce

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
      setIsOpen(false);
      inputRef.current?.blur();
    } else {
      router.push('/tutors');
    }
  };

  const handleSelectSuggestion = (tutorId: number) => {
    router.push(`/tutor/${tutorId}`);
    setIsOpen(false);
    setSearchText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === "Enter") {
        handleSearch();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelectSuggestion(suggestions[selectedIndex].id);
        } else {
          handleSearch();
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const getOccupationLabel = (occupation: string) => {
    const labels: Record<string, string> = {
      'Sinh viên': 'Sinh viên',
      'Giáo viên': 'Giáo viên',
      'Chuyên gia': 'Chuyên gia',
    };
    return labels[occupation] || 'Gia sư';
  };

  return (
    <div ref={searchRef} className="relative flex-1 max-w-2xl">
      <form onSubmit={handleSearch}>
        <div className="relative">
          {isLoading ? (
            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
          ) : (
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          )}
          <Input
            ref={inputRef}
            type="search"
            placeholder="Tìm gia sư theo tên, môn học..."
            className="pl-9 pr-4"
            data-testid="input-search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) setIsOpen(true);
            }}
            autoComplete="off"
          />
        </div>
      </form>

      {/* Autocomplete Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-popover border rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs text-muted-foreground px-2 py-1 mb-1">
              Gợi ý gia sư
            </div>
            {suggestions.map((tutor, index) => (
              <button
                key={tutor.id}
                type="button"
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-md hover:bg-accent transition-colors text-left",
                  selectedIndex === index && "bg-accent"
                )}
                onClick={() => handleSelectSuggestion(tutor.id)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <Avatar className="h-10 w-10 flex-shrink-0">
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
          </div>

          {/* View all results */}
          <div className="border-t p-2">
            <button
              type="button"
              className="w-full p-2 text-sm text-center text-primary hover:bg-accent rounded-md transition-colors"
              onClick={handleSearch}
            >
              Xem tất cả kết quả cho "{searchText}"
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
