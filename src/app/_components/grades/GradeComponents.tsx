import { getGradeClassification } from "../../../../utils/gradeClassification";
import {
  GRADE_CLASSIFICATIONS,
  CONDUCT_LANGUAGE_MAPPING,
  EGradeClassification,
} from "../../../../common/constants/students";
import { EConduct } from "@prisma/client";

interface GradeComponentProps {
  score: number | null;
  className?: string;
}

interface ClassificationBadgeProps {
  classification: EGradeClassification | null;
  className?: string;
}

interface ConductBadgeProps {
  conduct: EConduct | null;
  className?: string;
}

export const GradeDisplay = ({
  score,
  className = "",
}: GradeComponentProps) => {
  if (score === null || score === undefined) {
    return (
      <span
        className={`rounded bg-gray-100 px-2 py-1 text-sm font-medium text-gray-600 ${className}`}
      >
        -
      </span>
    );
  }

  const classification = getGradeClassification(score);

  return (
    <span
      className={`rounded px-2 py-1 text-sm font-medium ${classification.colorClass} ${className}`}
    >
      {score.toFixed(1)}
    </span>
  );
};

export const GradeBadge = ({ score, className = "" }: GradeComponentProps) => {
  if (score === null || score === undefined) {
    return (
      <span
        className={`inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-gray-600 ${className}`}
      >
        Chưa có
      </span>
    );
  }

  const classification = getGradeClassification(score);

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${classification.colorClass} ${className}`}
    >
      {classification.label}
    </span>
  );
};

export const ClassificationBadge = ({
  classification,
  className = "",
}: ClassificationBadgeProps) => {
  const getClassificationColor = (
    classification: EGradeClassification | null,
  ) => {
    if (!classification) return "bg-gray-100 text-gray-600";

    switch (classification) {
      case EGradeClassification.EXCELLENT:
        return "bg-emerald-100 text-emerald-800";
      case EGradeClassification.VERY_GOOD:
        return "bg-green-100 text-green-800";
      case EGradeClassification.GOOD:
        return "bg-blue-100 text-blue-800";
      case EGradeClassification.FAIRLY_GOOD:
        return "bg-cyan-100 text-cyan-800";
      case EGradeClassification.AVERAGE:
        return "bg-yellow-100 text-yellow-800";
      case EGradeClassification.FAILED:
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-sm font-medium ${getClassificationColor(classification)} ${className}`}
    >
      {classification ? GRADE_CLASSIFICATIONS[classification] : "Chưa xếp loại"}
    </span>
  );
};

export const ConductBadge = ({
  conduct,
  className = "",
}: ConductBadgeProps) => {
  const getConductColor = (conduct: EConduct | null) => {
    if (!conduct) return "bg-gray-100 text-gray-600";

    switch (conduct) {
      case EConduct.EXCELLENT:
        return "bg-green-100 text-green-800";
      case EConduct.GOOD:
        return "bg-blue-100 text-blue-800";
      case EConduct.AVERAGE:
        return "bg-yellow-100 text-yellow-800";
      case EConduct.POOR:
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <span
      className={`rounded-full px-4 py-2 text-sm font-medium ${getConductColor(conduct)} ${className}`}
    >
      {conduct ? CONDUCT_LANGUAGE_MAPPING[conduct] : "Chưa xếp loại"}
    </span>
  );
};
