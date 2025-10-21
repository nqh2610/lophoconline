"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Filter } from "lucide-react";
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

export function FilterPanel({ onFilterChange }: FilterPanelProps) {
  const { data: subjects = [] } = useSubjects();
  const { data: gradeLevels = [] } = useGradeLevels();

  const [selectedSubjectId, setSelectedSubjectId] = useState<number | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedGradeLevelIds, setSelectedGradeLevelIds] = useState<number[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([50000, 500000]);
  const [selectedExperience, setSelectedExperience] = useState<number | undefined>();
  const [selectedShift, setSelectedShift] = useState<'morning' | 'afternoon' | 'evening' | undefined>();

  // Group grade levels by category - Memoized for performance
  const gradeLevelsByCategory = useMemo(() => {
    return gradeLevels.reduce((acc, gl) => {
      if (!acc[gl.category]) {
        acc[gl.category] = [];
      }
      acc[gl.category].push(gl);
      return acc;
    }, {} as Record<string, typeof gradeLevels>);
  }, [gradeLevels]);

  const categories = useMemo(() => {
    const order = ['Tiểu học', 'THCS', 'THPT', 'Luyện thi', 'Khác'];
    return Object.keys(gradeLevelsByCategory).sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }, [gradeLevelsByCategory]);

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

  const handleReset = useCallback(() => {
    setSelectedSubjectId(undefined);
    setSelectedCategory(undefined);
    setSelectedGradeLevelIds([]);
    setPriceRange([50000, 500000]);
    setSelectedExperience(undefined);
    setSelectedShift(undefined);
    onFilterChange({});
  }, [onFilterChange]);

  const toggleGradeLevel = useCallback((gradeLevelId: number) => {
    setSelectedGradeLevelIds(prev =>
      prev.includes(gradeLevelId)
        ? prev.filter(id => id !== gradeLevelId)
        : [...prev, gradeLevelId]
    );
  }, []);

  // Calculate active filter count - Memoized
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedSubjectId) count++;
    if (selectedCategory) count++;
    if (selectedGradeLevelIds.length > 0) count++;
    if (priceRange[0] !== 50000 || priceRange[1] !== 500000) count++;
    if (selectedExperience) count++;
    if (selectedShift) count++;
    return count;
  }, [selectedSubjectId, selectedCategory, selectedGradeLevelIds, priceRange, selectedExperience, selectedShift]);

  // Get active filter chips - Memoized
  const activeFilters = useMemo(() => {
    const filters: { key: string; label: string; onRemove: () => void }[] = [];

    if (selectedSubjectId) {
      const subject = subjects.find(s => s.id === selectedSubjectId);
      filters.push({
        key: 'subject',
        label: subject?.name || 'Môn học',
        onRemove: () => setSelectedSubjectId(undefined)
      });
    }

    if (selectedCategory) {
      filters.push({
        key: 'category',
        label: selectedCategory,
        onRemove: () => {
          setSelectedCategory(undefined);
          setSelectedGradeLevelIds([]);
        }
      });
    }

    if (selectedGradeLevelIds.length > 0) {
      selectedGradeLevelIds.forEach(id => {
        const gradeLevel = gradeLevels.find(gl => gl.id === id);
        if (gradeLevel) {
          filters.push({
            key: `grade-${id}`,
            label: gradeLevel.name,
            onRemove: () => toggleGradeLevel(id)
          });
        }
      });
    }

    if (priceRange[0] !== 50000 || priceRange[1] !== 500000) {
      filters.push({
        key: 'price',
        label: `${priceRange[0].toLocaleString('vi-VN')}đ - ${priceRange[1].toLocaleString('vi-VN')}đ`,
        onRemove: () => setPriceRange([50000, 500000])
      });
    }

    if (selectedExperience) {
      filters.push({
        key: 'experience',
        label: `${selectedExperience}+ năm`,
        onRemove: () => setSelectedExperience(undefined)
      });
    }

    if (selectedShift) {
      const shiftLabels = {
        morning: 'Buổi sáng',
        afternoon: 'Buổi chiều',
        evening: 'Buổi tối'
      };
      filters.push({
        key: 'shift',
        label: shiftLabels[selectedShift],
        onRemove: () => setSelectedShift(undefined)
      });
    }

    return filters;
  }, [selectedSubjectId, selectedCategory, selectedGradeLevelIds, priceRange, selectedExperience, selectedShift, subjects, gradeLevels, toggleGradeLevel]);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Bộ lọc</CardTitle>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Filter className="h-3 w-3" />
                {activeFilterCount}
              </Badge>
            )}
          </div>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-xs h-8"
            >
              <X className="h-3 w-3 mr-1" />
              Xóa tất cả
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Active Filter Chips */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-4 border-b">
            {activeFilters.map((filter) => (
              <Badge
                key={filter.key}
                variant="secondary"
                className="gap-1 pr-1"
              >
                {filter.label}
                <button
                  onClick={filter.onRemove}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

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
