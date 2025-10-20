"use client";

import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { useSubjects, useGradeLevels } from "@/hooks/use-tutors";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FilterPanelProps {
  onFilterChange: (filters: FilterValues) => void;
  onSearch: (searchText: string) => void;
}

export interface FilterValues {
  subjectId?: number;
  category?: string;
  gradeLevelIds?: number[];
  minRate?: number;
  maxRate?: number;
  experience?: number;
  shiftType?: 'morning' | 'afternoon' | 'evening';
}

export function FilterPanel({ onFilterChange, onSearch }: FilterPanelProps) {
  const { data: subjects = [] } = useSubjects();
  const { data: gradeLevels = [] } = useGradeLevels();

  const [searchText, setSearchText] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedGradeLevelIds, setSelectedGradeLevelIds] = useState<number[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([50000, 500000]);
  const [selectedExperience, setSelectedExperience] = useState<number | undefined>();
  const [selectedShift, setSelectedShift] = useState<'morning' | 'afternoon' | 'evening' | undefined>();

  // Group grade levels by category
  const gradeLevelsByCategory = gradeLevels.reduce((acc, gl) => {
    if (!acc[gl.category]) {
      acc[gl.category] = [];
    }
    acc[gl.category].push(gl);
    return acc;
  }, {} as Record<string, typeof gradeLevels>);

  const categories = Object.keys(gradeLevelsByCategory).sort((a, b) => {
    const order = ['Tiểu học', 'THCS', 'THPT', 'Luyện thi', 'Khác'];
    return order.indexOf(a) - order.indexOf(b);
  });

  // Auto-apply filters with debounce when any filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      onFilterChange({
        subjectId: selectedSubjectId,
        category: selectedCategory,
        gradeLevelIds: selectedGradeLevelIds.length > 0 ? selectedGradeLevelIds : undefined,
        minRate: priceRange[0],
        maxRate: priceRange[1],
        experience: selectedExperience,
        shiftType: selectedShift,
      });
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [selectedSubjectId, selectedCategory, selectedGradeLevelIds, priceRange, selectedExperience, selectedShift, onFilterChange]);

  const handleReset = () => {
    setSelectedSubjectId(undefined);
    setSelectedCategory(undefined);
    setSelectedGradeLevelIds([]);
    setPriceRange([50000, 500000]);
    setSelectedExperience(undefined);
    setSelectedShift(undefined);
    setSearchText("");
    onSearch("");
    onFilterChange({});
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchText);
  };

  const toggleGradeLevel = (gradeLevelId: number) => {
    setSelectedGradeLevelIds(prev =>
      prev.includes(gradeLevelId)
        ? prev.filter(id => id !== gradeLevelId)
        : [...prev, gradeLevelId]
    );
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Tìm kiếm & Lọc</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search by name */}
        <div>
          <form onSubmit={handleSearchSubmit} className="relative">
            <Input
              placeholder="Tìm theo tên gia sư..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pr-10"
              data-testid="input-search"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              data-testid="button-search"
            >
              <Search className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Subject filter */}
        <div>
          <h3 className="font-medium mb-3">Môn học</h3>
          <Select
            value={selectedSubjectId?.toString()}
            onValueChange={(value) => setSelectedSubjectId(value ? parseInt(value) : undefined)}
          >
            <SelectTrigger data-testid="select-subject">
              <SelectValue placeholder="Chọn môn học" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Tất cả môn học</SelectItem>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id.toString()}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category filter */}
        <div>
          <h3 className="font-medium mb-3">Cấp học</h3>
          <Select
            value={selectedCategory || ""}
            onValueChange={(value) => {
              setSelectedCategory(value || undefined);
              setSelectedGradeLevelIds([]); // Clear specific grade levels when category changes
            }}
          >
            <SelectTrigger data-testid="select-category">
              <SelectValue placeholder="Chọn cấp học" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Tất cả cấp học</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Grade level filter (only show if category is selected) */}
        {selectedCategory && gradeLevelsByCategory[selectedCategory] && (
          <div>
            <h3 className="font-medium mb-3">Lớp cụ thể</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {gradeLevelsByCategory[selectedCategory].map((gradeLevel) => (
                <div key={gradeLevel.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`grade-${gradeLevel.id}`}
                    checked={selectedGradeLevelIds.includes(gradeLevel.id)}
                    onCheckedChange={() => toggleGradeLevel(gradeLevel.id)}
                    data-testid={`checkbox-grade-${gradeLevel.id}`}
                  />
                  <Label htmlFor={`grade-${gradeLevel.id}`} className="font-normal cursor-pointer">
                    {gradeLevel.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Price range filter */}
        <div>
          <h3 className="font-medium mb-3">Học phí (đ/giờ)</h3>
          <div className="pt-2">
            <Slider
              value={priceRange}
              onValueChange={(value) => setPriceRange(value as [number, number])}
              min={50000}
              max={1000000}
              step={50000}
              className="mb-2"
              data-testid="slider-price"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{priceRange[0].toLocaleString('vi-VN')}đ</span>
              <span>{priceRange[1].toLocaleString('vi-VN')}đ</span>
            </div>
          </div>
        </div>

        {/* Experience filter */}
        <div>
          <h3 className="font-medium mb-3">Kinh nghiệm</h3>
          <Select
            value={selectedExperience?.toString() || ""}
            onValueChange={(value) => setSelectedExperience(value ? parseInt(value) : undefined)}
          >
            <SelectTrigger data-testid="select-experience">
              <SelectValue placeholder="Chọn kinh nghiệm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Tất cả</SelectItem>
              <SelectItem value="1">Từ 1 năm</SelectItem>
              <SelectItem value="3">Từ 3 năm</SelectItem>
              <SelectItem value="5">Từ 5 năm</SelectItem>
              <SelectItem value="7">Từ 7 năm</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Shift time filter */}
        <div>
          <h3 className="font-medium mb-3">Ca dạy</h3>
          <div className="space-y-2">
            {[
              { value: 'morning' as const, label: 'Sáng (6h-12h)' },
              { value: 'afternoon' as const, label: 'Chiều (12h-18h)' },
              { value: 'evening' as const, label: 'Tối (18h-22h)' },
            ].map((shift) => (
              <div key={shift.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`shift-${shift.value}`}
                  checked={selectedShift === shift.value}
                  onCheckedChange={(checked) => setSelectedShift(checked ? shift.value : undefined)}
                  data-testid={`checkbox-shift-${shift.value}`}
                />
                <Label htmlFor={`shift-${shift.value}`} className="font-normal cursor-pointer">
                  {shift.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleReset}
            data-testid="button-reset-filters"
          >
            <X className="h-4 w-4 mr-2" />
            Xóa bộ lọc
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
