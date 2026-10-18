"use client";

import { CRAFTING_GRADES, type MaterialGrade } from "@/lib/bank";
import QualityGem from "./QualityGem";

export default function GradeSelect({
  value,
  onChange,
}: {
  value: MaterialGrade;
  onChange: (grade: MaterialGrade) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm text-gray-400 mb-1.5">Calidad del material</legend>
      <div className="flex items-center gap-2">
        {CRAFTING_GRADES.map((grade) => {
          const selected = value === grade.id;
          return (
            <button
              key={grade.id}
              type="button"
              title={grade.label}
              aria-label={grade.label}
              aria-pressed={selected}
              onClick={() => onChange(grade.id)}
              className={`rounded-lg p-1.5 border transition-colors ${
                selected
                  ? "border-yellow-400 bg-yellow-400/10"
                  : "border-gray-700 bg-gray-800 hover:border-gray-500"
              }`}
            >
              <QualityGem grade={grade.id} size={30} />
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={value === "none"}
          onClick={() => onChange("none")}
          className={`ml-1 text-xs px-2 py-1 rounded-md border ${
            value === "none"
              ? "border-yellow-400/70 text-yellow-300"
              : "border-gray-700 text-gray-500 hover:text-gray-300"
          }`}
        >
          Sin rango
        </button>
      </div>
    </fieldset>
  );
}
