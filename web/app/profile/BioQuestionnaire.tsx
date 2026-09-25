"use client";

import { useState } from "react";
import {
  firstUnansweredIndex,
  questionAnswered,
  type BioAnswer,
  type BioAnswers,
  type BioQuestion,
} from "@/lib/bio";

export default function BioQuestionnaire({
  questions,
  answers,
  locked,
  onChange,
}: {
  questions: BioQuestion[];
  answers: BioAnswers;
  locked?: boolean;
  onChange: (answers: BioAnswers) => void;
}) {
  const [step, setStep] = useState(() =>
    questions.length ? (locked ? 0 : firstUnansweredIndex(questions, answers)) : 0,
  );

  if (!questions.length) return null;

  const index = Math.min(step, questions.length - 1);
  const question = questions[index];
  const current = answers[question.id] ?? {};
  const isCustom = current.option === "custom";
  const currentDone = questionAnswered(question, current);
  const canAdvance = locked || currentDone || !question.required;
  const answeredCount = questions.filter((item) => questionAnswered(item, answers[item.id])).length;
  const progress = ((index + 1) / questions.length) * 100;

  function patch(value: BioAnswer) {
    onChange({ ...answers, [question.id]: value });
  }

  function goNext() {
    if (!canAdvance || index >= questions.length - 1) return;
    setStep(index + 1);
  }

  function goPrev() {
    if (index <= 0) return;
    setStep(index - 1);
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-wider text-gray-500">
            Pregunta {index + 1} de {questions.length}
          </p>
          <p className="text-xs text-gray-600">
            {locked ? "Enviado" : `${answeredCount} respondida${answeredCount === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-purple-500 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <fieldset className="space-y-3 min-h-[12rem]">
        <legend className="text-sm text-gray-200">
          {question.prompt}
          {!question.required && (
            <span className="text-gray-600 text-xs ml-2">Opcional</span>
          )}
        </legend>
        {question.hint && <p className="text-xs text-gray-500">{question.hint}</p>}

        {question.kind === "text" ? (
          <textarea
            value={current.text ?? ""}
            disabled={locked}
            onChange={(e) => patch({ text: e.target.value })}
            rows={4}
            placeholder="Escribe aquí..."
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-gray-500 disabled:opacity-60"
          />
        ) : (
          <div className="space-y-2">
            {question.options.map((option) => (
              <label
                key={option.id}
                className={`flex items-start gap-2 text-sm text-gray-300 ${locked ? "opacity-70" : "cursor-pointer"}`}
              >
                <input
                  type="radio"
                  name={question.id}
                  disabled={locked}
                  checked={current.option === option.id}
                  onChange={() => patch({ option: option.id })}
                  className="mt-0.5 border-gray-600 bg-gray-800"
                />
                <span>{option.label}</span>
              </label>
            ))}
            {question.allow_custom && (
              <div className="space-y-2">
                <label className={`flex items-start gap-2 text-sm text-gray-300 ${locked ? "opacity-70" : "cursor-pointer"}`}>
                  <input
                    type="radio"
                    name={question.id}
                    disabled={locked}
                    checked={isCustom}
                    onChange={() => patch({ option: "custom", text: current.text ?? "" })}
                    className="mt-0.5 border-gray-600 bg-gray-800"
                  />
                  <span>Otra respuesta</span>
                </label>
                {isCustom && (
                  <textarea
                    value={current.text ?? ""}
                    disabled={locked}
                    onChange={(e) => patch({ option: "custom", text: e.target.value })}
                    rows={2}
                    placeholder="Escribe tu respuesta..."
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-gray-500 disabled:opacity-60"
                  />
                )}
              </div>
            )}
          </div>
        )}
      </fieldset>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goPrev}
          disabled={index === 0}
          className="text-sm text-gray-400 hover:text-gray-200 disabled:opacity-30 disabled:hover:text-gray-400"
        >
          Anterior
        </button>
        {index < questions.length - 1 ? (
          <button
            type="button"
            onClick={goNext}
            disabled={!canAdvance}
            className="px-3 py-1.5 rounded-lg text-sm bg-gray-800 hover:bg-gray-700 text-gray-100 disabled:opacity-30"
          >
            {!question.required && !currentDone && !locked ? "Saltar" : "Siguiente"}
          </button>
        ) : (
          <p className="text-xs text-gray-500">
            {currentDone || !question.required || locked
              ? "Ya puedes enviar el cuestionario al Eremita."
              : "Responde para terminar."}
          </p>
        )}
      </div>
    </div>
  );
}
