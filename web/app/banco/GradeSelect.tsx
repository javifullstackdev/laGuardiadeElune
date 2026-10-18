"use client";

import { GRADE_CLASS, MATERIAL_GRADES, type MaterialGrade } from "@/lib/bank";

export default function GradeSelect({
  value,
  onChange,
}: {
  value: MaterialGrade;
  onChange: (grade: MaterialGrade) => void;
}) {
  return (
    <label className="block text-sm text-gray-400">
      Calidad del material
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as MaterialGrade)}
        className={`mt-1 w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-500 ${GRADE_CLASS[value]}`}
      >
        {MATERIAL_GRADES.map((grade) => (
          <option key={grade.id} value={grade.id}>
            {grade.label}
          </option>
        ))}
      </select>
    </label>
  );
}
