import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function FilterPanel() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Bộ lọc tìm kiếm</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-medium mb-3">Môn học</h3>
          <div className="space-y-2">
            {['Toán', 'Tiếng Anh', 'Lý', 'Hóa', 'Sinh', 'Văn'].map((subject) => (
              <div key={subject} className="flex items-center space-x-2">
                <Checkbox id={`subject-${subject}`} data-testid={`checkbox-subject-${subject}`} />
                <Label htmlFor={`subject-${subject}`} className="font-normal cursor-pointer">
                  {subject}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-3">Cấp lớp</h3>
          <div className="space-y-2">
            {['Tiểu học', 'THCS', 'THPT', 'Đại học'].map((level) => (
              <div key={level} className="flex items-center space-x-2">
                <Checkbox id={`level-${level}`} data-testid={`checkbox-level-${level}`} />
                <Label htmlFor={`level-${level}`} className="font-normal cursor-pointer">
                  {level}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-3">Học phí (đ/giờ)</h3>
          <div className="pt-2">
            <Slider
              defaultValue={[100000, 500000]}
              max={1000000}
              step={50000}
              className="mb-2"
              data-testid="slider-price"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>100.000đ</span>
              <span>500.000đ</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-3">Kinh nghiệm</h3>
          <div className="space-y-2">
            {['Dưới 1 năm', '1-3 năm', '3-5 năm', 'Trên 5 năm'].map((exp) => (
              <div key={exp} className="flex items-center space-x-2">
                <Checkbox id={`exp-${exp}`} data-testid={`checkbox-exp-${exp}`} />
                <Label htmlFor={`exp-${exp}`} className="font-normal cursor-pointer">
                  {exp}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Button className="w-full" data-testid="button-apply-filters">
          Áp dụng bộ lọc
        </Button>
      </CardContent>
    </Card>
  );
}
